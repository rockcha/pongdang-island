-- Per-account KST weather. Kept outside the public API; fishing_state is the read boundary.
alter table public.collectible_species add column weather_type text
 check (weather_type in ('rain','snow','dust','meteor','blossom'));
create index collectible_species_weather_pool_idx on public.collectible_species(weather_type,id)
 where weather_type is not null;

create table app_private.fishing_weather_days (
 user_id uuid primary key references auth.users(id) on delete cascade,
 day date not null,
 periods jsonb not null check (jsonb_typeof(periods)='array' and jsonb_array_length(periods)=4)
);
alter table app_private.fishing_weather_days enable row level security;
revoke all on app_private.fishing_weather_days from public,anon,authenticated;

create or replace function app_private.fishing_weather_schedule(p_at timestamptz default clock_timestamp())
returns jsonb language plpgsql security definer set search_path='' as $$
declare
 v_uid uuid:=auth.uid();v_day date:=(p_at at time zone 'Asia/Seoul')::date;
 v_start timestamptz;v_periods jsonb;v_kinds text[];v_i integer;v_slot timestamptz;
begin
 if v_uid is null then raise exception 'AUTH_REQUIRED';end if;
 if p_at is null then raise exception 'INVALID_WEATHER_TIME';end if;
 select periods into v_periods from app_private.fishing_weather_days where user_id=v_uid and day=v_day;
 if v_periods is null then
  perform pg_advisory_xact_lock(hashtextextended('fishing-weather:'||v_uid::text,0));
  select periods into v_periods from app_private.fishing_weather_days where user_id=v_uid and day=v_day;
  if v_periods is null then
   v_start:=v_day::timestamp at time zone 'Asia/Seoul';
   select array_agg(kind order by random()) into v_kinds from unnest(
    array['rain','snow','dust','meteor','blossom']) kind;
   v_periods:='[]'::jsonb;
   for v_i in 1..4 loop
    v_slot:=v_start+make_interval(mins=>(v_i-1)*360+floor(random()*331)::integer);
    v_periods:=v_periods||jsonb_build_array(jsonb_build_object('kind',v_kinds[v_i],
     'startsAt',v_slot,'endsAt',v_slot+interval '30 minutes'));
   end loop;
   insert into app_private.fishing_weather_days(user_id,day,periods) values(v_uid,v_day,v_periods)
    on conflict(user_id) do update set day=excluded.day,periods=excluded.periods;
  end if;
 end if;
 return jsonb_build_object('day',v_day,'serverNow',p_at,'periods',v_periods);
end $$;
revoke all on function app_private.fishing_weather_schedule(timestamptz) from public,anon,authenticated;

create or replace function app_private.fishing_weather_at(p_at timestamptz)
returns jsonb language sql security definer set search_path='' as $$
 select value from jsonb_array_elements(app_private.fishing_weather_schedule(p_at)->'periods')
 where (value->>'startsAt')::timestamptz<=p_at and p_at<(value->>'endsAt')::timestamptz limit 1
$$;
revoke all on function app_private.fishing_weather_at(timestamptz) from public,anon,authenticated;

-- No region, bait-grade or ownership weighting: uniform within the active weather pool.
-- Missing pools return before the probability draw, preserving ordinary fishing.
create or replace function app_private.pick_weather_collectible(p_kind text,p_at timestamptz,p_roll double precision default null)
returns text language plpgsql set search_path='' as $$
declare v_ids text[];v_roll double precision;
begin
 if p_kind is null or p_at is null then return null;end if;
 select array_agg(s.id order by s.id) into v_ids from public.collectible_species s
 where s.weather_type=p_kind and s.kind in ('fish','trash','decoration') and not exists (
  select 1 from app_private.collectible_event_windows e where starts_with(s.id,e.species_prefix)
   and (p_at<e.starts_at or p_at>=e.ends_at));
 if v_ids is null then return null;end if;
 v_roll:=coalesce(p_roll,random());
 if v_roll<0 or v_roll>=1 then raise exception 'INVALID_WEATHER_ROLL';end if;
 if v_roll>=0.03 then return null;end if;
 return v_ids[1+floor(random()*cardinality(v_ids))::integer];
end $$;
revoke all on function app_private.pick_weather_collectible(text,timestamptz,double precision) from public,anon,authenticated;

CREATE OR REPLACE FUNCTION app_private.collectible_available_at(p_species_id text, p_at timestamp with time zone)
 RETURNS boolean
 LANGUAGE sql
 STABLE
 SET search_path TO ''
AS $function$
 select p_species_id is not null and p_at is not null and not exists (
 select 1 from public.collectible_species s where s.id=p_species_id and s.weather_type is not null
 ) and not exists (
  select 1 from app_private.collectible_event_windows e
  where starts_with(p_species_id,e.species_prefix)
   and (p_at < e.starts_at or p_at >= e.ends_at)
 )
$function$;

CREATE OR REPLACE FUNCTION app_private.fishing_state()
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''
AS $function$
declare v_uid uuid:=auth.uid();v_region text;v_discount integer;
begin
 if v_uid is null then raise exception 'AUTH_REQUIRED';end if;
 select region_id into v_region from public.player_navigation where user_id=v_uid;
 v_region:=coalesce(v_region,'pongdang');
 v_discount:=app_private.relic_bonus('bait_discount_gold')::integer;
 return jsonb_build_object('weather',app_private.fishing_weather_schedule(),'regionId',v_region,'regionName',(select name from public.regions where id=v_region),
 'successChanceBp',10000,'mechanicsVersion',2,
 'prepared',(select app_private.prepared_fishing_payload(p) from app_private.prepared_fishing_casts p where user_id=v_uid and finished_at is null and expires_at>clock_timestamp()),
 'baits',(select jsonb_agg(to_jsonb(b)||app_private.regional_bait_odds(b.id,v_region)||jsonb_build_object('base_price',b.price,'price',case when b.price is null then null else (case when b.price>=40 then greatest(1,b.price-v_discount) else b.price end) end,'priceDiscountGold',case when b.price is null then 0 else b.price-(case when b.price>=40 then greatest(1,b.price-v_discount) else b.price end) end,'baseSuccessChanceBp',10000,'successChanceBp',10000,'mechanicsVersion',2) order by b.sort_order) from public.fishing_baits b));
end $function$;

CREATE OR REPLACE FUNCTION app_private.prepare_discovery_cast(p_region_id text, p_bait_id text, p_operation_id uuid, p_confirm_bite boolean, p_discovery boolean)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''
AS $function$
declare v_uid uuid:=auth.uid();p app_private.prepared_fishing_casts;w public.player_wallets;
 v_current text;v_required boolean;v_count integer;v_profile jsonb;v_started timestamptz;v_wait numeric;
 v_rarity public.game_rarity;v_species text;v_snapshot jsonb;v_reduction integer;
 v_weather jsonb;v_roll double precision;v_category text;v_reward record;v_map text;v_piece integer;v_relic text;
begin
 if v_uid is null then raise exception 'AUTH_REQUIRED';end if;
 if p_operation_id is null or p_confirm_bite is null then raise exception 'INVALID_TRADE';end if;
 perform pg_advisory_xact_lock(hashtextextended('region:'||v_uid::text,0));
 select * into p from app_private.prepared_fishing_casts where user_id=v_uid and operation_id=p_operation_id;
 if found then
  if p.region_id<>p_region_id or p.bait_id<>p_bait_id then raise exception 'OPERATION_CONFLICT';end if;
  return app_private.prepared_fishing_payload(p);
 end if;
 if exists(select 1 from public.fishing_attempts where user_id=v_uid and operation_id=p_operation_id) then raise exception 'OPERATION_CONFLICT';end if;
 select * into p from app_private.prepared_fishing_casts where user_id=v_uid and finished_at is null;
 if found then
  if p.expires_at<=clock_timestamp() then perform app_private.finish_fishing(p.operation_id,false);
  else return app_private.prepared_fishing_payload(p);end if;
 end if;
 perform app_private.get_gold_wallet();
 select * into w from public.player_wallets where user_id=v_uid for update;
 if not exists(select 1 from public.fishing_baits where id=p_bait_id) then raise exception 'INVALID_BAIT';end if;
 select requires_map_fragment into v_required from public.regions where id=p_region_id;
 if not found then raise exception 'REGION_NOT_FOUND';end if;
 select region_id into v_current from public.player_navigation where user_id=v_uid;
 if v_current is distinct from p_region_id then raise exception 'NOT_IN_REGION';end if;
 if v_required and not exists(select 1 from public.player_map_fragments where user_id=v_uid and region_id=p_region_id) then raise exception 'REGION_LOCKED';end if;
 v_count:=coalesce((w.inventory->>p_bait_id)::integer,0);
 if v_count<1 then raise exception 'NO_BAIT';end if;
 -- Keep the exhausted discovery bait refusal before every random draw. Moving
 -- it after the category roll would permit unlimited free map/relic rerolls.
 if p_bait_id='bait_first_greeting' and not exists(select 1 from public.collectible_species s
  where app_private.collectible_available_at(s.id,statement_timestamp()) and s.kind in ('fish','trash','decoration')
  and not exists(select 1 from public.player_discoveries d where d.user_id=v_uid and d.species_id=s.id)) then
  raise exception 'ALL_COLLECTIBLES_DISCOVERED';
 end if;
 v_started:=clock_timestamp();
 v_profile:=app_private.fishing_bait_balance_at(p_bait_id,v_started);
 v_weather:=app_private.fishing_weather_at(v_started);
 v_species:=app_private.pick_weather_collectible(v_weather->>'kind',v_started);
 if v_species is not null then
  select rarity into v_rarity from public.collectible_species where id=v_species;
  v_snapshot:=app_private.species_payload(v_species,null);
 else
 v_rarity:=app_private.profile_fishing_rarity(v_profile);
 -- Grade-specific disjoint category ranges; absent categories return to the ordinary
 -- pool without increasing the other discovery category's chance.
 v_category:='ordinary';
 if p_discovery then
  v_roll:=random();
  v_category:=app_private.fishing_reward_category(v_roll,v_rarity);
 end if;
 if v_category<>'ordinary' then
  select * into v_reward from app_private.fishing_discovery_candidates(v_rarity)
  where category=v_category order by random() limit 1;
  if found then
   if v_category='map' then
    v_map:=v_reward.region_id;v_piece:=v_reward.piece_number;
    v_snapshot:=app_private.fishing_map_piece_payload(v_map,v_piece,v_uid);
   else
    v_relic:=v_reward.reward_id;v_snapshot:=app_private.fishing_relic_payload(v_relic);
   end if;
  end if;
 end if;
 if v_snapshot is null then
  v_species:=app_private.pick_profile_collectible(p_region_id,v_rarity,v_profile,true);
  if v_species is null then raise exception 'NO_COLLECTIBLE_FOR_REGION';end if;
  select rarity into v_rarity from public.collectible_species where id=v_species;
  v_snapshot:=app_private.species_payload(v_species,null);
 end if;
 end if;
 select r.wait_reduction_seconds into v_reduction from public.player_rod_loadouts l
 join public.player_fishing_rods o on o.user_id=l.user_id and o.rod_id=l.equipped_rod_id
 join public.fishing_rods r on r.id=o.rod_id where l.user_id=v_uid;
 v_wait:=greatest(1,13+12*random()-coalesce(v_reduction,0)-app_private.relic_bonus('fishing_wait_seconds'));
 insert into app_private.prepared_fishing_casts(user_id,operation_id,region_id,bait_id,eligible,species_id,map_region_id,
  map_piece_number,relic_id,rarity,snapshot,wait_seconds,failure_at,failure_reason,created_at,expires_at,bait_snapshot,confirm_bite)
 values(v_uid,p_operation_id,p_region_id,p_bait_id,true,v_species,v_map,v_piece,v_relic,v_rarity,v_snapshot,v_wait,4.5,'bait',v_started,
  case when p_confirm_bite then v_started+interval '24 hours'
   else v_started+make_interval(secs=>v_wait::double precision)+interval '3 minutes' end,
  v_profile||jsonb_build_object('weather',v_weather,'discovery_version',1,'relic_bait_refund_percent',least(5,greatest(0,app_private.relic_bonus('bait_refund_percent')))),p_confirm_bite) returning * into p;
 update public.player_wallets set inventory=jsonb_set(inventory,array[p_bait_id],to_jsonb(v_count-1)),updated_at=now() where user_id=v_uid;
 return app_private.prepared_fishing_payload(p);
end $function$;
