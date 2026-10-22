begin;
set local lock_timeout='5s';

-- Freeze the actual pre-patch rules before updating the public catalog. The
-- existing expedition result, cargo, timer and vessel bonuses remain untouched.
update public.fishing_expeditions e set vessel_snapshot=e.vessel_snapshot||jsonb_build_object(
 'bait_rules_version',1,'bait_rules',(select jsonb_object_agg(b.id,to_jsonb(b)) from public.fishing_baits b)
) where e.claimed_at is null and not (e.vessel_snapshot ? 'bait_rules');

alter table app_private.prepared_fishing_casts add column bait_snapshot jsonb;
alter table app_private.prepared_fishing_casts drop constraint prepared_fishing_casts_wait_seconds_check;
alter table app_private.prepared_fishing_casts add constraint prepared_fishing_casts_wait_seconds_check
 check(wait_seconds>=3 and wait_seconds<=90);
alter table app_private.prepared_fishing_casts add constraint prepared_bait_snapshot_object
 check(bait_snapshot is null or jsonb_typeof(bait_snapshot)='object');

create function app_private.profile_fishing_rarity(p_profile jsonb)
returns public.game_rarity language plpgsql set search_path='' as $$
declare roll integer:=floor(random()*10000);
begin
 if p_profile is null then raise exception 'INVALID_BAIT';end if;
 if p_profile->>'effect_kind'='alternating' then return app_private.consume_bait_cycle();end if;
 if roll<(p_profile->>'mythic_bp')::integer then return 'mythic';end if;
 if roll<(p_profile->>'mythic_bp')::integer+(p_profile->>'epic_bp')::integer then return 'epic';end if;
 if roll<(p_profile->>'mythic_bp')::integer+(p_profile->>'epic_bp')::integer+(p_profile->>'rare_bp')::integer then return 'rare';end if;
 return 'common';
end $$;

create function app_private.pick_profile_collectible(p_region text,p_rarity public.game_rarity,p_profile jsonb,
 p_manual boolean default false,p_native boolean default false,p_local_discovery boolean default false)
returns text language plpgsql set search_path='' as $$
declare ids text[];rod_region text;fallback boolean;bid text:=p_profile->>'id';effect text:=p_profile->>'effect_kind';
begin
 if auth.uid() is null then raise exception 'AUTH_REQUIRED';end if;
 if p_profile is null then raise exception 'INVALID_BAIT';end if;
 if not exists(select 1 from public.regions where id=p_region) then raise exception 'REGION_NOT_FOUND';end if;
 if p_manual then
  select r.region_id into rod_region from public.player_rod_loadouts l
  join public.player_fishing_rods o on o.user_id=l.user_id and o.rod_id=l.equipped_rod_id
  join public.fishing_rods r on r.id=o.rod_id where l.user_id=auth.uid() and r.native_bonus_bp>0;
 end if;
 with candidates as materialized (
  select s.id,s.rarity from public.collectible_species s where case
   when effect='undiscovered' then s.kind in ('fish','trash','decoration')
    and not exists(select 1 from public.player_discoveries d where d.user_id=auth.uid() and d.species_id=s.id)
    and (not p_local_discovery or exists(select 1 from public.collectible_habitats h where h.species_id=s.id and h.region_id=p_region))
   when bid='bait_grubby_magnet' then s.kind='trash'
   when effect='shooting_star' then s.rarity=p_rarity and (p_rarity='mythic' or s.kind='trash')
   when effect='common_only' then s.rarity=p_rarity and not s.is_native and s.kind in ('fish','trash')
   else s.rarity=p_rarity and (p_profile->'target_kinds') ? s.kind::text end
 ), pool as (
  select * from candidates c where c.rarity=p_rarity
   or (effect='undiscovered' or bid='bait_grubby_magnet') and not exists(select 1 from candidates c2 where c2.rarity=p_rarity)
 )
 select array_agg(id order by id),not coalesce(bool_or(rarity=p_rarity),false) into ids,fallback from pool;
 return app_private.pick_habitat_group(ids,p_region,rod_region,
  coalesce((p_profile->>'native_multiplier')::numeric,1)*(case when p_native then 1.5 else 1 end),fallback);
end $$;

-- Both old and new traps settle using the rules stored when they were started.
create function app_private.trap_pick(p_region text,p_bait text,p_native boolean,p_local_discovery boolean,p_snapshot jsonb)
returns text language plpgsql set search_path='' as $$
declare b public.fishing_baits;r public.game_rarity;roll integer:=floor(random()*10000);ids text[];fallback boolean;profile jsonb:=p_snapshot->'bait_rules'->p_bait;
begin
 if auth.uid() is null then raise exception 'AUTH_REQUIRED';end if;
 if profile is null then raise exception 'INVALID_BAIT_SNAPSHOT';end if;
 if p_snapshot->>'bait_rules_version'='2' then
  r:=app_private.profile_fishing_rarity(profile);
  return app_private.pick_profile_collectible(p_region,r,profile,false,p_native,p_local_discovery);
 end if;
 b:=jsonb_populate_record(null::public.fishing_baits,profile);
 r:=case when b.alternating then app_private.consume_bait_cycle()
 when roll<b.mythic_bp then 'mythic'::public.game_rarity when roll<b.mythic_bp+b.epic_bp then 'epic'::public.game_rarity
 when roll<b.mythic_bp+b.epic_bp+b.rare_bp then 'rare'::public.game_rarity else 'common'::public.game_rarity end;
 if p_bait in ('bait_snowflake_salt','bait_shooting_star_tail') then return app_private.pick_balanced_bait_collectible(p_region,r,p_bait,p_native,false);end if;
 if b.fish_only then return app_private.pick_bait_fish(p_region,r,p_native,false);end if;
 with candidates as materialized (
 select s.id,s.rarity from public.collectible_species s where case
 when p_bait='bait_first_greeting' then s.kind in ('fish','trash','decoration') and not exists(select 1 from public.player_discoveries d where d.user_id=auth.uid() and d.species_id=s.id)
 and (not p_local_discovery or exists(select 1 from public.collectible_habitats h where h.species_id=s.id and h.region_id=p_region))
 when p_bait='bait_grubby_magnet' then s.kind='trash'
 when b.effect_kind='decoration' then s.kind='decoration' and s.rarity=r else s.kind in ('fish','trash') and s.rarity=r end
 ),pool as(select * from candidates c where c.rarity=r or not exists(select 1 from candidates c2 where c2.rarity=r))
 select array_agg(id order by id),not coalesce(bool_or(rarity=r),false) into ids,fallback from pool;
 return app_private.pick_habitat_group(ids,p_region,null,(case when p_native then 1.5 else 1 end)*(case when p_bait='bait_sea_memory' then 3 else 1 end),fallback and b.effect_kind<>'decoration');
end $$;

create function app_private.trap_success_chance_bp(p_bait text,p_reduction integer,p_snapshot jsonb)
returns integer language plpgsql stable set search_path='' as $$
declare b jsonb:=p_snapshot->'bait_rules'->p_bait;chance integer;
begin
 if b is null then raise exception 'INVALID_BAIT_SNAPSHOT';end if;
 if p_snapshot->>'bait_rules_version'='2' then return 10000;end if;
 if b->>'success_chance_bp' is not null then return (b->>'success_chance_bp')::integer;end if;
 chance:=case when p_bait='bait_safe' then 10000
 when p_bait in ('bait_grubby_magnet','bait_first_greeting','bait_magnet','bait_forbidden_star','bait_epic','bait_special') then 7000
 when p_bait='bait' then 3500 else 4000 end;
 return least(10000,chance+greatest(0,coalesce(p_reduction,0)));
end $$;

create function app_private.snapshot_trap_bait_rules()
returns trigger language plpgsql security definer set search_path='' as $$
begin
 new.vessel_snapshot:=new.vessel_snapshot||jsonb_build_object('bait_rules_version',2,
  'bait_rules',(select jsonb_object_agg(b.id,app_private.fishing_bait_balance_at(b.id,new.departed_at)) from app_private.fishing_bait_balance_profiles b));
 return new;
end $$;
create trigger snapshot_trap_bait_rules before insert on public.fishing_expeditions
for each row execute function app_private.snapshot_trap_bait_rules();

create or replace function app_private.prepare_fishing(p_region_id text,p_bait_id text,p_operation_id uuid)
returns jsonb language plpgsql security definer set search_path='' as $$
declare v_uid uuid:=auth.uid();p app_private.prepared_fishing_casts;w public.player_wallets;
 v_current text;v_required boolean;v_count integer;v_profile jsonb;v_started timestamptz;v_wait numeric;
 v_rarity public.game_rarity;v_species text;v_snapshot jsonb;
begin
 if v_uid is null then raise exception 'AUTH_REQUIRED';end if;
 if p_operation_id is null then raise exception 'INVALID_TRADE';end if;
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
 if p_bait_id='bait_first_greeting' and not exists(select 1 from public.collectible_species s where s.kind in ('fish','trash','decoration')
 and not exists(select 1 from public.player_discoveries d where d.user_id=v_uid and d.species_id=s.id)) then raise exception 'ALL_COLLECTIBLES_DISCOVERED';end if;
 v_started:=clock_timestamp();
 v_profile:=app_private.fishing_bait_balance_at(p_bait_id,v_started);
 v_rarity:=app_private.profile_fishing_rarity(v_profile);
 v_species:=app_private.pick_profile_collectible(p_region_id,v_rarity,v_profile,true);
 if v_species is null then raise exception 'NO_COLLECTIBLE_FOR_REGION';end if;
 select rarity into v_rarity from public.collectible_species where id=v_species;
 v_snapshot:=app_private.species_payload(v_species,null);
 -- Triangular jitter favors the center instead of the extreme wait times.
 v_wait:=(v_profile->>'wait_min_seconds')::numeric
  +((v_profile->>'wait_max_seconds')::numeric-(v_profile->>'wait_min_seconds')::numeric)*(random()+random())/2;
 insert into app_private.prepared_fishing_casts(user_id,operation_id,region_id,bait_id,eligible,species_id,map_region_id,rarity,snapshot,wait_seconds,failure_at,failure_reason,created_at,expires_at,bait_snapshot)
 values(v_uid,p_operation_id,p_region_id,p_bait_id,true,v_species,null,v_rarity,v_snapshot,v_wait,4.5,'bait',v_started,
  v_started+make_interval(secs=>v_wait::double precision)+interval '3 minutes',v_profile) returning * into p;
 update public.player_wallets set inventory=jsonb_set(inventory,array[p_bait_id],to_jsonb(v_count-1)),updated_at=now() where user_id=v_uid;
 return app_private.prepared_fishing_payload(p);
end $$;

create or replace function app_private.prepared_fishing_payload(p app_private.prepared_fishing_casts)
returns jsonb language sql stable set search_path='' as $$
 select jsonb_build_object('operation_id',p.operation_id,'region_id',p.region_id,'bait_id',p.bait_id,
 'eligible',p.eligible,'species',p.snapshot,'rarity',p.rarity,'wait_seconds',p.wait_seconds,
 'failure_at',p.failure_at,'failure_reason',p.failure_reason,'expires_at',p.expires_at,
 'finished',p.finished_at is not null,'result',p.result)
$$;

create or replace function app_private.regional_bait_odds(p_bait_id text,p_region_id text)
returns jsonb language plpgsql stable set search_path='' as $$
declare b jsonb;r public.game_rarity;
begin
 if not exists(select 1 from public.fishing_baits where id=p_bait_id) then raise exception 'INVALID_BAIT';end if;
 if not exists(select 1 from public.regions where id=p_region_id) then raise exception 'REGION_NOT_FOUND';end if;
 b:=app_private.fishing_bait_balance_at(p_bait_id,statement_timestamp());
 if b is null then raise exception 'INVALID_BAIT';end if;
 if b->>'effect_kind'='alternating' then
  select next_rarity into r from app_private.bait_cycles where user_id=auth.uid();r:=coalesce(r,'common');
  return jsonb_build_object('common_bp',case when r='common' then 10000 else 0 end,'rare_bp',case when r='rare' then 10000 else 0 end,'epic_bp',0,'mythic_bp',0,'failure_bp',0,'nextRarity',r);
 end if;
 return jsonb_build_object('common_bp',b->'common_bp','rare_bp',b->'rare_bp','epic_bp',b->'epic_bp','mythic_bp',b->'mythic_bp','failure_bp',0,
  'period',b->'period','target_kinds',b->'target_kinds');
end $$;

create or replace function app_private.fishing_state()
returns jsonb language plpgsql security definer set search_path='' as $$
declare v_uid uuid:=auth.uid();v_region text;
begin
 if v_uid is null then raise exception 'AUTH_REQUIRED';end if;
 select region_id into v_region from public.player_navigation where user_id=v_uid;
 v_region:=coalesce(v_region,'pongdang');
 return jsonb_build_object('regionId',v_region,'regionName',(select name from public.regions where id=v_region),
 'successChanceBp',10000,'mechanicsVersion',2,
 'prepared',(select app_private.prepared_fishing_payload(p) from app_private.prepared_fishing_casts p where user_id=v_uid and finished_at is null and expires_at>clock_timestamp()),
 'baits',(select jsonb_agg(to_jsonb(b)||app_private.regional_bait_odds(b.id,v_region)||jsonb_build_object('baseSuccessChanceBp',10000,'successChanceBp',10000,'mechanicsVersion',2) order by b.sort_order) from public.fishing_baits b));
end $$;

revoke all on function app_private.profile_fishing_rarity(jsonb),
 app_private.pick_profile_collectible(text,public.game_rarity,jsonb,boolean,boolean,boolean),
 app_private.trap_pick(text,text,boolean,boolean,jsonb),app_private.trap_success_chance_bp(text,integer,jsonb),
 app_private.snapshot_trap_bait_rules() from public,anon,authenticated;

CREATE OR REPLACE FUNCTION app_private.settle_legacy_expedition(p_action text, p_operation_id uuid, p_vessel_id text DEFAULT NULL::text, p_region_id text DEFAULT NULL::text, p_cargo jsonb DEFAULT NULL::jsonb, p_expedition_id uuid DEFAULT NULL::uuid)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''
AS $function$
declare u uuid:=auth.uid();v public.fishing_vessels;e public.fishing_expeditions;w public.player_wallets;
 sig jsonb;prev app_private.expedition_operations;receipt jsonb;cargo record;total integer:=0;count integer;sid text;bid text;
 bonus integer;bonus_bait text;draws text[]:=array[]::text[];i integer;item uuid;results jsonb:='[]';refunds jsonb:='{}';local_discovery boolean;failed integer:=0;
begin
 if u is null then raise exception 'AUTH_REQUIRED';end if;
 if p_action is null or p_action not in ('buy','depart','claim','instant') or p_operation_id is null then raise exception 'INVALID_EXPEDITION';end if;
 sig:=jsonb_build_object('action',p_action,'vessel',p_vessel_id,'region',p_region_id,'cargo',p_cargo,'expedition',p_expedition_id);
 perform pg_advisory_xact_lock(hashtextextended('expedition:'||u::text,0));
 select * into prev from app_private.expedition_operations where user_id=u and operation_id=p_operation_id;
 if found then
  if prev.signature<>sig then raise exception 'OPERATION_CONFLICT';end if;
  return app_private.expedition_state()||jsonb_build_object('receipt',prev.receipt,'replayed',true);
 end if;
 perform app_private.get_gold_wallet();
 select * into w from public.player_wallets where user_id=u for update;
 if p_action in ('buy','depart') then
  select * into v from public.fishing_vessels where id=p_vessel_id;
  if not found then raise exception 'VESSEL_NOT_FOUND';end if;
 end if;
 if p_action='buy' then
  if v.price>0 and not exists(select 1 from public.player_fishing_vessels where user_id=u and vessel_id=v.id) then
   if w.gold<v.price then raise exception 'INSUFFICIENT_GOLD';end if;
   update public.player_wallets set gold=gold-v.price,updated_at=now() where user_id=u;
   insert into public.player_fishing_vessels(user_id,vessel_id) values(u,v.id);
   insert into public.gold_transactions(user_id,operation_id,action,item_id,delta) values(u,p_operation_id,'buy','vessel:'||v.id,-v.price);
  end if;
  receipt:=jsonb_build_object('action','buy','vesselId',v.id);
 elsif p_action='depart' then
  if v.price>0 and not exists(select 1 from public.player_fishing_vessels where user_id=u and vessel_id=v.id) then raise exception 'VESSEL_NOT_OWNED';end if;
  if exists(select 1 from public.fishing_expeditions where user_id=u and claimed_at is null) then raise exception 'EXPEDITION_ACTIVE';end if;
  if not exists(select 1 from public.regions r where r.id=p_region_id and (not r.requires_map_fragment or exists(select 1 from public.player_map_fragments f where f.user_id=u and f.region_id=r.id))) then raise exception 'REGION_LOCKED';end if;
  if p_cargo is null or jsonb_typeof(p_cargo)<>'object' then raise exception 'INVALID_CARGO';end if;
  for cargo in select key,value from jsonb_each_text(p_cargo) loop
   if not exists(select 1 from public.fishing_baits where id=cargo.key) or cargo.value !~ '^[1-9][0-9]{0,2}$' then raise exception 'INVALID_CARGO';end if;
   count:=cargo.value::integer;total:=total+count;
   if coalesce((w.inventory->>cargo.key)::integer,0)<count then raise exception 'NO_BAIT';end if;
   w.inventory:=jsonb_set(w.inventory,array[cargo.key],to_jsonb((w.inventory->>cargo.key)::integer-count));
  end loop;
  if total<v.min_baits or total>v.max_baits then raise exception 'CARGO_LIMIT';end if;
  update public.player_wallets set inventory=w.inventory,updated_at=now() where user_id=u;
  insert into public.fishing_expeditions(user_id,vessel_id,region_id,cargo,vessel_snapshot,returns_at)
   values(u,v.id,p_region_id,p_cargo,to_jsonb(v),clock_timestamp()+make_interval(mins=>v.duration_minutes)) returning * into e;
  receipt:=jsonb_build_object('action','depart','expeditionId',e.id);
 else
  perform app_private.notify_due_expeditions(p_expedition_id);
  select * into e from public.fishing_expeditions where id=p_expedition_id and user_id=u for update;
  if not found then raise exception 'EXPEDITION_NOT_FOUND';end if;
  if e.claimed_at is not null then
   receipt:=jsonb_build_object('action','claim','expeditionId',e.id,'result',e.result);
  elsif p_action='instant' then
   if not coalesce((select instant_return_enabled from app_private.expedition_settings where id),false) then raise exception 'TEST_DISABLED';end if;
   update public.fishing_expeditions set returns_at=least(returns_at,clock_timestamp()) where id=e.id;
   receipt:=jsonb_build_object('action','instant','expeditionId',e.id);
  else
   if clock_timestamp()<e.returns_at then raise exception 'EXPEDITION_NOT_READY';end if;
   v:=jsonb_populate_record(null::public.fishing_vessels,e.vessel_snapshot);
   for cargo in select key,value from jsonb_each_text(e.cargo) loop
    count:=cargo.value::integer;total:=total+count;
    for i in 1..count loop draws:=array_append(draws,cargo.key);end loop;
   end loop;
   bonus:=case when v.bonus_kind='per_ten' then least(total/10,v.bonus_count) else v.bonus_count end;
   bonus_bait:=case v.bonus_kind when 'special' then 'bait_special' when 'magnet' then 'bait_magnet' when 'candy' then 'bait_forbidden_star' when 'discovery' then 'bait_first_greeting' when 'epic' then 'bait_epic' else 'bait' end;
   if v.bonus_kind='copy' then
    select d into bonus_bait from unnest(draws) d where d not in ('bait_first_greeting','bait_epic','bait_magnet') order by random() limit 1;
    bonus_bait:=coalesce(bonus_bait,'bait');
   end if;
   for i in 1..bonus loop draws:=array_append(draws,bonus_bait);end loop;
   -- Snapshots from older departures have null for newly introduced fields.
   for i in 1..coalesce(v.bonus_basic_count,0) loop draws:=array_append(draws,'bait');end loop;
   for i in 1..cardinality(draws) loop
    bid:=draws[i];local_discovery:=i>total and v.bonus_kind='discovery';
    sid:=app_private.trap_pick(e.region_id,bid,v.bonus_kind='native',local_discovery,e.vessel_snapshot);
    if sid is null and local_discovery then bid:='bait_special';sid:=app_private.trap_pick(e.region_id,bid,false,false,e.vessel_snapshot);end if;
    if sid is null and bid='bait_first_greeting' and i<=total then
     refunds:=jsonb_set(refunds,array[bid],to_jsonb(coalesce((refunds->>bid)::integer,0)+1));
     w.inventory:=jsonb_set(w.inventory,array[bid],to_jsonb(coalesce((w.inventory->>bid)::integer,0)+1));
    elsif sid is not null and random()>=app_private.trap_success_chance_bp(bid,v.failure_reduction_bp,e.vessel_snapshot)::numeric/10000 then
     failed:=failed+1;
    else
     if sid is null then raise exception 'NO_COLLECTIBLE_FOR_REGION';end if;
     insert into public.player_collectibles(user_id,species_id) values(u,sid) returning id into item;
     insert into public.player_discoveries(user_id,species_id) values(u,sid) on conflict do nothing;
     results:=results||jsonb_build_array(jsonb_build_object('id',item,'firstDiscovery',coalesce((select evidence.first_discovery from app_private.title_acquisition_evidence evidence where evidence.collectible_id=item and evidence.user_id=u),false),'species',app_private.species_payload(sid,null),'bonus',i>total,'baitId',bid));
    end if;
   end loop;
   receipt:=jsonb_build_object('action','claim','expeditionId',e.id,'result',jsonb_build_object('items',results,'refunds',refunds,'failed',failed,'attempted',cardinality(draws),'succeeded',jsonb_array_length(results)));
   update public.player_wallets set inventory=w.inventory,updated_at=now() where user_id=u;
   update public.fishing_expeditions set claimed_at=clock_timestamp(),result=receipt->'result' where id=e.id;
  end if;
 end if;
 insert into app_private.expedition_operations values(u,p_operation_id,sig,receipt);
 return app_private.expedition_state()||jsonb_build_object('receipt',receipt,'replayed',false);
end $function$
;

-- Keep the legacy worm purchase/sale endpoint on the same live catalog price.
create or replace function app_private.trade_gold(p_operation_id uuid,p_action text,p_item_id text default null)
returns jsonb language plpgsql security definer set search_path='' as $$
declare v_uid uuid:=auth.uid();v_wallet public.player_wallets;v_previous public.gold_transactions;v_delta integer;v_count integer;v_price integer;
begin
 if v_uid is null then raise exception 'AUTH_REQUIRED';end if;
 if p_operation_id is null or p_action is null or p_action not in ('charge','buy','sell') then raise exception 'INVALID_TRADE';end if;
 insert into public.player_wallets(user_id) values(v_uid) on conflict do nothing;
 select * into v_wallet from public.player_wallets where user_id=v_uid for update;
 select * into v_previous from public.gold_transactions where user_id=v_uid and operation_id=p_operation_id;
 if found then
  if v_previous.action<>p_action or v_previous.item_id is distinct from p_item_id then raise exception 'OPERATION_CONFLICT';end if;
  return app_private.get_gold_wallet()||jsonb_build_object('delta',0);
 end if;
 if p_action='charge' then
  if p_item_id is not null then raise exception 'INVALID_TRADE';end if;
  if not coalesce((select test_charge_enabled from app_private.gold_settings where id),false) then raise exception 'TEST_CHARGE_DISABLED';end if;
  if v_wallet.test_claimed then raise exception 'TEST_CHARGE_ALREADY_CLAIMED';end if;
  v_delta:=1000;
 else
  if p_item_id is null or p_item_id not in ('bait','shell') then raise exception 'INVALID_ITEM';end if;
  v_count:=coalesce((v_wallet.inventory->>p_item_id)::integer,0);
  v_price:=case when p_item_id='bait' then (select price from public.fishing_baits where id='bait') else 300 end;
  if v_price is null then raise exception 'INVALID_ITEM';end if;
  if p_action='buy' then
   if v_wallet.gold<v_price then raise exception 'INSUFFICIENT_GOLD';end if;
   v_delta:=-v_price;v_count:=v_count+1;
  else
   if v_count<1 then raise exception 'INSUFFICIENT_INVENTORY';end if;
   v_delta:=v_price*6/10;v_count:=v_count-1;
  end if;
  v_wallet.inventory:=jsonb_set(v_wallet.inventory,array[p_item_id],to_jsonb(v_count));
 end if;
 if v_wallet.gold+v_delta>1000000000 then raise exception 'GOLD_LIMIT';end if;
 update public.player_wallets set gold=gold+v_delta,inventory=v_wallet.inventory,test_claimed=test_claimed or p_action='charge',updated_at=now() where user_id=v_uid;
 insert into public.gold_transactions(user_id,operation_id,action,item_id,delta) values(v_uid,p_operation_id,p_action,p_item_id,v_delta);
 return app_private.get_gold_wallet()||jsonb_build_object('delta',v_delta);
end $$;

notify pgrst,'reload schema';
commit;
