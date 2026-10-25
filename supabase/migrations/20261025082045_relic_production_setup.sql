begin;
set local lock_timeout='5s';
do $guard$ declare e record; actual text; begin
 if to_regclass('public.fishing_relics') is not null then raise exception 'RELIC_SETUP_ALREADY_EXISTS';end if;
 for e in select * from jsonb_to_recordset('[{"schema":"app_private","name":"bait_production_action","args":"p_action text, p_operation_id uuid, p_facility text, p_quantity integer","hash":"3b3a5688489e9d6df8758672fc77036b"},{"schema":"app_private","name":"bait_production_state","args":"","hash":"ba9e175c91c0a1001714434a1ebccb97"},{"schema":"app_private","name":"catch_experience","args":"p_kind text, p_rarity text, p_automatic boolean","hash":"943602560a7c32a4e434f2446b249732"},{"schema":"app_private","name":"collection_state","args":"","hash":"fdf7798c67b98b5d9120d05f91e8a860"},{"schema":"app_private","name":"expedition_action","args":"p_action text, p_operation_id uuid, p_vessel_id text, p_region_id text, p_cargo jsonb, p_expedition_id uuid","hash":"b6e055300febb6ac77b8a43f9db3f327"},{"schema":"app_private","name":"expedition_state","args":"","hash":"8439acf04cf29866c28903a4312cb634"},{"schema":"app_private","name":"finish_fishing","args":"p_operation_id uuid, p_won boolean","hash":"fc9650cd27ad39612ab744ae8118c6c3"},{"schema":"app_private","name":"harbor_action","args":"p_action text, p_operation_id uuid, p_vessel_id text, p_voyage_id uuid, p_quantity integer, p_boat_id uuid, p_slot integer, p_region_id text, p_secondary_region_id text","hash":"a95adec0356487fee5003f0e451c67c9"},{"schema":"app_private","name":"harbor_state","args":"","hash":"cccad521119701a69c50463c062c8680"},{"schema":"app_private","name":"personal_bait_workshop_action","args":"p_action text, p_operation_id uuid, p_bait_id text, p_quantity integer, p_minutes integer, p_job_id uuid, p_expected_fuel integer","hash":"d612fbc9b967f9bd98d9f4899226e26e"},{"schema":"app_private","name":"personal_bait_workshop_state","args":"","hash":"8865afbe6362d8f300d3c1b651b5e291"},{"schema":"app_private","name":"prepare_fishing","args":"p_region_id text, p_bait_id text, p_operation_id uuid","hash":"b93f1eedbf8271084eee577a5b6f8a2c"},{"schema":"app_private","name":"prepare_fishing","args":"p_region_id text, p_bait_id text, p_operation_id uuid, p_confirm_bite boolean","hash":"fbcc361de075dbd51c4b1d0304899c1d"},{"schema":"app_private","name":"prepared_fishing_payload","args":"p app_private.prepared_fishing_casts","hash":"20a2e7244c2d135f8970bf5ff38dee13"},{"schema":"app_private","name":"production_apply","args":"p_action text, p_operation_id uuid, p_facility text, p_materials jsonb, p_return_state boolean","hash":"219b80e3310106f8e5486505d0901726"},{"schema":"app_private","name":"production_state","args":"","hash":"e0ee4e8b182b45c275e3b1a338c0f4a3"}]'::jsonb) as x(schema text,name text,args text,hash text) loop
  select md5(replace(pg_get_functiondef(p.oid),chr(13),'')) into actual from pg_proc p join pg_namespace n on n.oid=p.pronamespace
   where n.nspname=e.schema and p.proname=e.name and pg_get_function_identity_arguments(p.oid)=e.args;
  if actual is distinct from e.hash then raise exception 'RELIC_SETUP_FUNCTION_DRIFT: %',e.name;end if;
 end loop;
end $guard$;

-- 20261025063517_fishing_map_and_relic_discoveries.sql

-- Discovery rewards never enter player_collectibles: placement, trade, gifting,
-- sale, merchant orders and production continue to accept ordinary assets only.
alter table public.fishing_map_blueprints add column rarity public.game_rarity not null default 'rare';
create table public.fishing_relics (
 id text primary key check (id ~ '^[a-z0-9][a-z0-9-]*$'),
 name text not null check (char_length(btrim(name)) between 1 and 100),
 description text not null default '',
 rarity public.game_rarity not null,
 thumbnail_path text not null check (btrim(thumbnail_path)<>''),
 enabled boolean not null default true
);
alter table public.fishing_relics enable row level security;
revoke all on public.fishing_relics from public,anon,authenticated;
grant select on public.fishing_relics to authenticated;
create policy relic_catalog_read on public.fishing_relics for select to authenticated using (enabled);

create table app_private.player_fishing_relics (
 user_id uuid not null references auth.users(id) on delete cascade,
 relic_id text not null references public.fishing_relics(id),
 acquired_at timestamptz not null default clock_timestamp(),
 primary key(user_id,relic_id)
);
alter table app_private.player_fishing_relics enable row level security;
revoke all on app_private.player_fishing_relics from public,anon,authenticated;
grant select on app_private.player_fishing_relics to authenticated;
create policy relic_discoveries_read on app_private.player_fishing_relics for select to authenticated
 using(user_id=(select auth.uid()));

alter table app_private.prepared_fishing_casts add column relic_id text references public.fishing_relics(id);
alter table app_private.prepared_fishing_casts drop constraint prepared_fishing_casts_check;
alter table app_private.prepared_fishing_casts drop constraint prepared_map_piece_shape;
alter table app_private.prepared_fishing_casts add constraint prepared_reward_shape check (
 eligible = (num_nonnulls(species_id,map_piece_number,relic_id)=1)
 and num_nonnulls(species_id,map_piece_number,relic_id)<=1
 and (map_piece_number is null or (map_region_id is not null and species_id is null))
);
-- Category selection now happens before ordinary species selection, so an
-- empty ordinary pool cannot prevent a map/relic reward from being reserved.
drop trigger prepare_map_piece on app_private.prepared_fishing_casts;
drop function app_private.prepare_fishing_map_piece();

create function app_private.fishing_map_piece_payload(p_region text,p_piece integer,p_user uuid)
returns jsonb language sql stable set search_path='' as $function$
 select jsonb_build_object('id','map-piece-'||b.region_id||'-'||p_piece,'kind','map','rarity',b.rarity,
 'name',r.name||'의 '||p_piece||'번째 조각 ('||progress.found||'/'||b.piece_count||')',
 'description','모든 지도 조각을 모으면 해역이 열려요. 지도와 도감에서 수집 현황을 확인하세요.',
 'thumbnail_path',b.thumbnail_path,'sell_price',0,'speed',0,'size',1,'swim_y_min',null,'swim_y_max',null,
 'sprite_sheet_path',null,'movement_type','fixed','is_native',false,'native_region_id',null,
 'mapPiece',true,'mapRegionId',b.region_id,'pieceNumber',p_piece,'pieceCount',b.piece_count,
 'pieceFoundCount',progress.found)
 from public.fishing_map_blueprints b join public.regions r on r.id=b.region_id
 cross join lateral (select count(*)::integer found from app_private.player_fishing_map_pieces f
  where f.user_id=p_user and f.region_id=b.region_id) progress
 where b.region_id=p_region and p_piece between 1 and b.piece_count
$function$;

create function app_private.fishing_relic_payload(p_id text) returns jsonb
language sql stable set search_path='' as $function$
 select jsonb_build_object('id','relic-'||id,'kind','relic','rarity',rarity,'name',name,'description',description,
 'thumbnail_path',thumbnail_path,'sell_price',0,'speed',0,'size',1,'swim_y_min',null,'swim_y_max',null,
 'sprite_sheet_path',null,'movement_type','fixed','is_native',false,'native_region_id',null,'relicId',id)
 from public.fishing_relics where id=p_id
$function$;

create function app_private.fishing_discovery_candidates(p_rarity public.game_rarity)
returns table(category text,reward_id text,region_id text,piece_number integer)
language sql stable set search_path='' as $function$
 select 'map'::text,'map-piece-'||b.region_id||'-'||n.piece_number,b.region_id,n.piece_number
 from public.fishing_map_blueprints b join public.regions r on r.id=b.region_id
 cross join lateral generate_series(1,b.piece_count) n(piece_number)
 where b.enabled and r.requires_map_fragment and b.rarity=p_rarity
 and not exists(select 1 from public.player_map_fragments f where f.user_id=auth.uid() and f.region_id=b.region_id)
 and not exists(select 1 from app_private.player_fishing_map_pieces f where f.user_id=auth.uid()
  and f.region_id=b.region_id and f.piece_number=n.piece_number)
 union all
 select 'relic',r.id,null::text,null::integer from public.fishing_relics r
 where r.enabled and r.rarity=p_rarity and not exists(select 1 from app_private.player_fishing_relics f
  where f.user_id=auth.uid() and f.relic_id=r.id)
$function$;

create function app_private.fishing_reward_category(p_roll double precision) returns text
language plpgsql immutable set search_path='' as $function$
begin
 if p_roll is null or not (p_roll>=0 and p_roll<1) then raise exception 'INVALID_REWARD_ROLL';end if;
 return case when p_roll<0.94 then 'ordinary' when p_roll<0.97 then 'map' else 'relic' end;
end $function$;

create or replace function app_private.prepare_fishing(p_region_id text,p_bait_id text,p_operation_id uuid,p_confirm_bite boolean)
returns jsonb language plpgsql security definer set search_path='' as $function$
declare v_uid uuid:=auth.uid();p app_private.prepared_fishing_casts;w public.player_wallets;
 v_current text;v_required boolean;v_count integer;v_profile jsonb;v_started timestamptz;v_wait numeric;
 v_rarity public.game_rarity;v_species text;v_snapshot jsonb;v_reduction integer;
 v_roll double precision;v_category text;v_reward record;v_map text;v_piece integer;v_relic text;
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
 v_rarity:=app_private.profile_fishing_rarity(v_profile);
 -- Fixed disjoint category ranges; absent categories return to the ordinary
 -- pool without increasing the other discovery category's chance.
 v_roll:=random();
 v_category:=app_private.fishing_reward_category(v_roll);
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
 select r.wait_reduction_seconds into v_reduction from public.player_rod_loadouts l
 join public.player_fishing_rods o on o.user_id=l.user_id and o.rod_id=l.equipped_rod_id
 join public.fishing_rods r on r.id=o.rod_id where l.user_id=v_uid;
 v_wait:=12+12*random()-coalesce(v_reduction,0);
 insert into app_private.prepared_fishing_casts(user_id,operation_id,region_id,bait_id,eligible,species_id,map_region_id,
  map_piece_number,relic_id,rarity,snapshot,wait_seconds,failure_at,failure_reason,created_at,expires_at,bait_snapshot,confirm_bite)
 values(v_uid,p_operation_id,p_region_id,p_bait_id,true,v_species,v_map,v_piece,v_relic,v_rarity,v_snapshot,v_wait,4.5,'bait',v_started,
  case when p_confirm_bite then v_started+interval '24 hours'
   else v_started+make_interval(secs=>v_wait::double precision)+interval '3 minutes' end,
  v_profile||jsonb_build_object('discovery_version',1),p_confirm_bite) returning * into p;
 update public.player_wallets set inventory=jsonb_set(inventory,array[p_bait_id],to_jsonb(v_count-1)),updated_at=now() where user_id=v_uid;
 return app_private.prepared_fishing_payload(p);
end $function$;

create or replace function app_private.finish_fishing(p_operation_id uuid,p_won boolean)
returns jsonb language plpgsql security definer set search_path='' as $function$
declare v_uid uuid:=auth.uid();p app_private.prepared_fishing_casts;a public.fishing_attempts;
 v_item uuid;v_success boolean;v_result jsonb;v_first boolean:=false;
begin
 if v_uid is null then raise exception 'AUTH_REQUIRED';end if;
 if p_won is null then raise exception 'INVALID_RESULT';end if;
 perform pg_advisory_xact_lock(hashtextextended('region:'||v_uid::text,0));
 select * into p from app_private.prepared_fishing_casts where user_id=v_uid and operation_id=p_operation_id for update;
 if not found then raise exception 'CAST_NOT_FOUND';end if;
 if p.finished_at is not null then return p.result||jsonb_build_object('replayed',true);end if;
 if p_won and p.confirm_bite and p.fight_started_at is null then raise exception 'CAST_NOT_STARTED';end if;
 if p_won and clock_timestamp()<(case when p.fight_started_at is null
  then p.created_at+make_interval(secs=>p.wait_seconds::double precision+3)
  else p.fight_started_at+interval '3 seconds' end) then raise exception 'CAST_TOO_EARLY';end if;
 v_success:=p_won and p.eligible and clock_timestamp()<=p.expires_at;
 if v_success then
  if p.map_piece_number is not null then
   insert into app_private.player_fishing_map_pieces(user_id,region_id,piece_number)
    values(v_uid,p.map_region_id,p.map_piece_number) on conflict do nothing;
   v_first:=found;
   if not exists(select 1 from public.fishing_map_blueprints b cross join lateral generate_series(1,b.piece_count) n(piece_number)
    where b.region_id=p.map_region_id and not exists(select 1 from app_private.player_fishing_map_pieces f
     where f.user_id=v_uid and f.region_id=b.region_id and f.piece_number=n.piece_number)) then
    insert into public.player_map_fragments(user_id,region_id) values(v_uid,p.map_region_id) on conflict do nothing;
   end if;
   -- Capture real collected count after success, not the random piece number.
   p.snapshot:=p.snapshot||jsonb_build_object(
    'name',app_private.fishing_map_piece_payload(p.map_region_id,p.map_piece_number,v_uid)->>'name',
    'pieceFoundCount',(app_private.fishing_map_piece_payload(p.map_region_id,p.map_piece_number,v_uid)->>'pieceFoundCount')::integer);
  elsif p.relic_id is not null then
   insert into app_private.player_fishing_relics(user_id,relic_id) values(v_uid,p.relic_id) on conflict do nothing;
   v_first:=found;
  else
   if p.map_region_id is not null then
    insert into public.player_map_fragments(user_id,region_id) values(v_uid,p.map_region_id) on conflict do nothing;
   end if;
   insert into public.player_collectibles(user_id,species_id,map_region_id) values(v_uid,p.species_id,p.map_region_id) returning id into v_item;
   insert into public.player_discoveries(user_id,species_id) values(v_uid,p.species_id) on conflict do nothing;
   v_first:=coalesce((select evidence.first_discovery from app_private.title_acquisition_evidence evidence
    where evidence.collectible_id=v_item and evidence.user_id=v_uid),false);
  end if;
 end if;
 -- Experience/title triggers read this immutable reward snapshot.
 update app_private.prepared_fishing_casts set snapshot=p.snapshot where user_id=v_uid and operation_id=p_operation_id;
 insert into public.fishing_attempts(user_id,operation_id,region_id,bait_id,rarity,collectible_id)
 values(v_uid,p.operation_id,p.region_id,p.bait_id,case when v_success then p.rarity end,v_item) returning * into a;
 v_result:=jsonb_build_object('attempt',to_jsonb(a)||jsonb_build_object('species',case when v_success then p.snapshot end,
 'firstDiscovery',v_first),'replayed',false,'failure_reason',case when v_success then null when clock_timestamp()>p.expires_at
  then 'expired' when not p.eligible then p.failure_reason else 'minigame' end);
 update app_private.prepared_fishing_casts set finished_at=clock_timestamp(),result=v_result where user_id=v_uid and operation_id=p_operation_id;
 return v_result;
end $function$;

create or replace function app_private.catch_experience(p_kind text,p_rarity text,p_automatic boolean default false)
returns integer language plpgsql immutable set search_path='' as $function$
declare amount numeric;
begin
 if p_kind not in ('fish','trash','decoration','map','relic') or p_kind is null
 or p_rarity not in ('common','rare','epic','mythic') or p_rarity is null or p_automatic is null then raise exception 'INVALID_EXPERIENCE_CATCH';end if;
 -- Existing rare map pieces still grant 30; all discovery grades follow XP by grade.
 amount:=case p_rarity when 'common' then 10 when 'rare' then 30 when 'epic' then 100 else 400 end;
 if p_kind='trash' then amount:=amount/2;end if;
 if p_automatic then amount:=amount*0.3;end if;
 return round(amount)::integer;
end $function$;

create or replace function app_private.collection_state() returns jsonb
language plpgsql security definer set search_path='' as $function$
declare v_uid uuid:=auth.uid();v_regions jsonb;v_catalog jsonb;
begin
 if v_uid is null then raise exception 'AUTH_REQUIRED';end if;
 select coalesce(jsonb_agg(jsonb_build_object('id',r.id,'name',r.name) order by r.sort_order),'[]'::jsonb)
 into v_regions from public.regions r;
 select coalesce(jsonb_agg(to_jsonb(s)||jsonb_build_object('discovered',d.species_id is not null,'habitats',v_regions)
  order by s.kind,s.id),'[]'::jsonb) into v_catalog
 from public.collectible_species s left join public.player_discoveries d on d.species_id=s.id and d.user_id=v_uid where s.kind<>'map';
 v_catalog:=v_catalog||coalesce((select jsonb_agg(app_private.fishing_map_piece_payload(b.region_id,n.piece_number,v_uid)
  ||jsonb_build_object('discovered',exists(select 1 from app_private.player_fishing_map_pieces f where f.user_id=v_uid
    and f.region_id=b.region_id and f.piece_number=n.piece_number)
   or exists(select 1 from public.player_map_fragments f where f.user_id=v_uid and f.region_id=b.region_id),'habitats',v_regions)
  order by r.sort_order,n.piece_number)
 from public.fishing_map_blueprints b join public.regions r on r.id=b.region_id
 cross join lateral generate_series(1,b.piece_count) n(piece_number) where b.enabled),'[]'::jsonb);
 v_catalog:=v_catalog||coalesce((select jsonb_agg(app_private.fishing_relic_payload(r.id)||jsonb_build_object(
  'discovered',exists(select 1 from app_private.player_fishing_relics f where f.user_id=v_uid and f.relic_id=r.id),
  'habitats',v_regions) order by r.rarity,r.id) from public.fishing_relics r where r.enabled),'[]'::jsonb);
 return jsonb_build_object('items',app_private.owned_collectibles(),'catalog',v_catalog);
end $function$;

revoke all on function app_private.fishing_map_piece_payload(text,integer,uuid),
 app_private.fishing_relic_payload(text),app_private.fishing_discovery_candidates(public.game_rarity),
 app_private.fishing_reward_category(double precision)
 from public,anon,authenticated;
notify pgrst,'reload schema';


-- 20261025063643_map_piece_rarity_catalog.sql
-- Generated from supabase/catalog/catalog.json. Review before migration deployment.

set constraints all deferred;
insert into public.fishing_map_blueprints ("region_id","piece_count","thumbnail_path","enabled","rarity") values
('nyamnyam',4,'https://ewafafphiovbpjwogwzn.supabase.co/storage/v1/object/public/regions/nyamnyam/map-v2.png',true,'rare')
on conflict(region_id) do update set "piece_count"=excluded."piece_count","thumbnail_path"=excluded."thumbnail_path","enabled"=excluded."enabled","rarity"=excluded."rarity";
notify pgrst, 'reload schema';


-- 20261025071736_relic_loadout_effects.sql

alter table public.fishing_relics add column effect_kind text not null default 'none',add column effect_value numeric not null default 0;
alter table public.fishing_relics add constraint relic_effect_shape check (
 (effect_kind='none' and effect_value=0) or
 (effect_kind in ('fuel_active_slots','bait_active_slots') and ((rarity='epic' and effect_value=1) or (rarity='mythic' and effect_value=2))) or
 (effect_kind='personal_bait_hours' and ((rarity='rare' and effect_value=2) or (rarity='epic' and effect_value=4) or (rarity='mythic' and effect_value=8))) or
 (effect_kind='fishing_wait_seconds' and ((rarity='rare' and effect_value=0.5) or (rarity='epic' and effect_value=1) or (rarity='mythic' and effect_value=2))) or
 (effect_kind='trap_seconds_per_bait' and ((rarity='rare' and effect_value=30) or (rarity='epic' and effect_value=90) or (rarity='mythic' and effect_value=180))) or
 (effect_kind='boat_discount_gold' and ((rarity='rare' and effect_value=50) or (rarity='epic' and effect_value=150) or (rarity='mythic' and effect_value=400)))
);
create table app_private.player_relic_loadouts(
 user_id uuid primary key references auth.users(id) on delete cascade,
 relic_id text not null,
 foreign key(user_id,relic_id) references app_private.player_fishing_relics(user_id,relic_id)
);
alter table app_private.player_relic_loadouts enable row level security;
revoke all on app_private.player_relic_loadouts from public,anon,authenticated;
-- Remember the actual discounted purchase so changing equipment cannot increase resale proceeds.
alter table public.harbor_boats add column paid_price integer check(paid_price>=0);

-- The action enforces the equipped bonus; storage accepts every supported snapshot.
alter table app_private.personal_bait_jobs drop constraint personal_bait_jobs_production_minutes_check;
alter table app_private.personal_bait_jobs add constraint personal_bait_jobs_production_minutes_check check(production_minutes between 30 and 1200 and production_minutes%30=0);

create function app_private.relic_bonus(p_effect text) returns numeric
language sql stable security definer set search_path='' as $$
 select coalesce((select r.effect_value from app_private.player_relic_loadouts l join public.fishing_relics r on r.id=l.relic_id
 where l.user_id=(select auth.uid()) and r.enabled and r.effect_kind=p_effect),0)
$$;
revoke all on function app_private.relic_bonus(text) from public,anon,authenticated;

create function app_private.relic_state() returns jsonb language plpgsql security definer set search_path='' as $$
declare u uuid:=auth.uid();begin
 if u is null then raise exception 'AUTH_REQUIRED';end if;
 return jsonb_build_object('equippedId',(select relic_id from app_private.player_relic_loadouts where user_id=u),'changeFee',500,
 'relics',coalesce((select jsonb_agg(to_jsonb(r)||jsonb_build_object('owned',exists(select 1 from app_private.player_fishing_relics d where d.user_id=u and d.relic_id=r.id)) order by r.effect_kind,r.effect_value,r.id) from public.fishing_relics r where r.enabled),'[]'::jsonb));
end$$;
create function public.relic_state() returns jsonb language sql security invoker set search_path='' as $$select app_private.relic_state()$$;
create function app_private.equip_relic(p_relic_id text,p_operation_id uuid,p_expected_fee integer default null) returns jsonb language plpgsql security definer set search_path='' as $$
declare u uuid:=auth.uid();w public.player_wallets;prev public.gold_transactions;current_id text;fee integer;item text;
begin
 if u is null then raise exception 'AUTH_REQUIRED';end if;
 if p_operation_id is null then raise exception 'INVALID_OPERATION';end if;
 perform app_private.get_gold_wallet();select * into strict w from public.player_wallets where user_id=u for update;
 item:='relic-loadout:'||coalesce(p_relic_id,'unequip');
 select * into prev from public.gold_transactions where user_id=u and operation_id=p_operation_id;
 if found then
  if prev.action<>'buy' or prev.item_id is distinct from item or (p_expected_fee is not null and prev.delta<>-p_expected_fee) then raise exception 'OPERATION_CONFLICT';end if;
  return app_private.relic_state()||jsonb_build_object('replayed',true);
 end if;
 select relic_id into current_id from app_private.player_relic_loadouts where user_id=u;
 if current_id is not distinct from p_relic_id then raise exception 'RELIC_ALREADY_EQUIPPED';end if;
 if p_relic_id is not null and not exists(select 1 from app_private.player_fishing_relics d join public.fishing_relics r on r.id=d.relic_id where d.user_id=u and d.relic_id=p_relic_id and r.enabled) then raise exception 'RELIC_NOT_OWNED';end if;
 fee:=case when current_id is not null and p_relic_id is not null then 1000 else 500 end;
 if p_expected_fee is not null and p_expected_fee<>fee then raise exception 'RELIC_LOADOUT_CHANGED';end if;
 if w.gold<fee then raise exception 'INSUFFICIENT_GOLD';end if;
 if p_relic_id is null then delete from app_private.player_relic_loadouts where user_id=u;
 else insert into app_private.player_relic_loadouts(user_id,relic_id) values(u,p_relic_id) on conflict(user_id) do update set relic_id=excluded.relic_id;end if;
 update public.player_wallets set gold=gold-fee,updated_at=clock_timestamp() where user_id=u;
 insert into public.gold_transactions(user_id,operation_id,action,item_id,delta) values(u,p_operation_id,'buy',item,-fee);
 return app_private.relic_state()||jsonb_build_object('replayed',false);
end$$;
create function public.equip_relic(p_relic_id text,p_operation_id uuid,p_expected_fee integer default null) returns jsonb language sql security invoker set search_path='' as $$select app_private.equip_relic(p_relic_id,p_operation_id,p_expected_fee)$$;
revoke all on function app_private.relic_state(),public.relic_state(),app_private.equip_relic(text,uuid,integer),public.equip_relic(text,uuid,integer) from public,anon;
grant execute on function app_private.relic_state(),public.relic_state(),app_private.equip_relic(text,uuid,integer),public.equip_relic(text,uuid,integer) to authenticated;

-- New work snapshots bonuses at start; changing loadout never rewrites existing jobs.
CREATE OR REPLACE FUNCTION app_private.production_apply(p_action text, p_operation_id uuid, p_facility text, p_materials jsonb, p_return_state boolean)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''
AS $function$
declare u uuid:=auth.uid();w public.player_wallets;f public.production_facilities;s app_private.production_sites;
 prev app_private.production_operations;sig jsonb;receipt jsonb;ids uuid[];n integer;v_now timestamptz;fuel bigint;
begin
 if u is null then raise exception 'AUTH_REQUIRED';end if;
 if p_operation_id is null or p_action is null or p_action not in ('buy','sell','start','claim','discard') or p_facility is null then raise exception 'INVALID_PRODUCTION';end if;
 if p_materials is null or jsonb_typeof(p_materials)<>'object' then raise exception 'INVALID_MATERIALS';end if;
 if p_action<>'start' and p_materials<>'{}'::jsonb then raise exception 'INVALID_MATERIALS';end if;
 sig:=jsonb_build_object('action',p_action,'facility',p_facility,'materials',p_materials);
 perform app_private.get_gold_wallet();
 select * into w from public.player_wallets where user_id=u for update;
 select * into prev from app_private.production_operations where user_id=u and operation_id=p_operation_id;
 if found then
  if prev.signature<>sig then raise exception 'OPERATION_CONFLICT';end if;
  return (case when p_return_state then app_private.production_state() else '{}'::jsonb end)||jsonb_build_object('receipt',prev.receipt,'replayed',true);
 end if;
 if p_action='buy' then
  select * into f from public.production_facilities where id=p_facility for share;
  if not found then raise exception 'PRODUCTION_NOT_FOUND';end if;
  if not f.enabled then raise exception 'PRODUCTION_UNAVAILABLE';end if;
 if w.gold<f.price then raise exception 'INSUFFICIENT_GOLD';end if;
  v_now:=clock_timestamp();
  insert into app_private.production_sites(user_id,facility_id) values(u,f.id) returning * into s;
  update public.player_wallets set gold=gold-f.price,updated_at=v_now where user_id=u;
  insert into public.gold_transactions(user_id,operation_id,action,item_id,delta) values(u,p_operation_id,'buy','production:'||f.id,-f.price);
  receipt:=jsonb_build_object('action','buy','facility',f.id,'siteId',s.id,'count',1);
 else
  s:=app_private.production_site(p_facility);
  select * into s from app_private.production_sites where id=s.id and user_id=u for update;
  select * into f from public.production_facilities where id=s.facility_id for share;
  v_now:=clock_timestamp();
  if p_action='sell' then
   if s.started_at is not null then raise exception 'PRODUCTION_BUSY';end if;
   if w.gold::bigint+(f.price/2)>1000000000 then raise exception 'GOLD_LIMIT';end if;
   delete from app_private.production_sites where id=s.id and user_id=u;
   update public.player_wallets set gold=gold+(f.price/2),updated_at=v_now where user_id=u;
   insert into public.gold_transactions(user_id,operation_id,action,item_id,delta)
    values(u,p_operation_id,'sell','production:'||f.id,f.price/2);
   receipt:=jsonb_build_object('action','sell','facility',f.id,'siteId',s.id,'gold',f.price/2,'count',1);
  elsif p_action='start' then
   if not f.enabled then raise exception 'PRODUCTION_UNAVAILABLE';end if;
   if s.started_at is not null then raise exception 'PRODUCTION_BUSY';end if;
   if app_private.production_active_count()>=4+app_private.relic_bonus('fuel_active_slots') then raise exception 'PRODUCTION_ACTIVE_LIMIT';end if;
   if (select count(*) from jsonb_each(p_materials)) not between 1 and 100 then raise exception 'INVALID_MATERIALS';end if;
   if exists(select 1 from jsonb_each(p_materials) e where jsonb_typeof(e.value)<>'number' or e.value::text !~ '^[1-9][0-9]{0,2}$') then raise exception 'INVALID_MATERIALS';end if;
   if (select sum(value::integer) from jsonb_each_text(p_materials))<>f.input_count then raise exception 'INVALID_MATERIAL_COUNT';end if;
   select array_agg(p.id order by p.id) into ids from jsonb_each_text(p_materials) e
   cross join lateral(select c.id from public.player_collectibles c join public.collectible_species cs on cs.id=c.species_id
    where c.user_id=u and c.species_id=e.key and cs.kind::text=f.kind and c.sold_at is null and c.consumed_at is null
    and c.tank_id is null and c.escrow_gift_id is null order by c.id limit e.value::integer)p;
   if coalesce(cardinality(ids),0)<>f.input_count then raise exception 'INSUFFICIENT_MATERIALS';end if;
   perform 1 from public.player_collectibles where user_id=u and id=any(ids) order by id for update;
   select count(*) into n from public.player_collectibles c join public.collectible_species cs on cs.id=c.species_id
    where c.user_id=u and c.id=any(ids) and cs.kind::text=f.kind and c.sold_at is null and c.consumed_at is null and c.tank_id is null and c.escrow_gift_id is null;
   if n<>f.input_count then raise exception 'INSUFFICIENT_MATERIALS';end if;
   v_now:=clock_timestamp();
   update public.player_collectibles set sold_at=v_now,consumed_at=v_now where user_id=u and id=any(ids);
   update app_private.production_sites set started_at=v_now,completes_at=v_now+make_interval(mins=>f.production_minutes),
    expires_at=v_now+make_interval(mins=>f.production_minutes+f.storage_minutes),run_output=f.output_count where user_id=u and id=s.id;
   receipt:=jsonb_build_object('action','start','facility',f.id,'siteId',s.id,'consumedIds',ids);
  else
   if s.started_at is null then raise exception 'PRODUCTION_IDLE';end if;
   if p_action='claim' then
    if v_now<s.completes_at then raise exception 'PRODUCTION_NOT_READY';end if;
    if v_now>=s.expires_at then raise exception 'PRODUCTION_EXPIRED';end if;
    fuel:=coalesce((w.inventory->>'fuel')::bigint,0)+s.run_output;
    if fuel>1000000000 then raise exception 'FUEL_LIMIT';end if;
    update public.player_wallets set inventory=jsonb_set(inventory,'{fuel}',to_jsonb(fuel::integer)),updated_at=v_now where user_id=u;
   elsif v_now<s.expires_at then raise exception 'PRODUCTION_NOT_EXPIRED';end if;
   receipt:=jsonb_build_object('action',p_action,'facility',f.id,'siteId',s.id,'fuel',case when p_action='claim' then s.run_output else 0 end);
   update app_private.production_sites set started_at=null,completes_at=null,expires_at=null,run_output=null where user_id=u and id=s.id;
  end if;
 end if;
 insert into app_private.production_operations(user_id,operation_id,signature,receipt) values(u,p_operation_id,sig,receipt);
 return (case when p_return_state then app_private.production_state() else '{}'::jsonb end)||jsonb_build_object('receipt',receipt,'replayed',false);
end $function$;

CREATE OR REPLACE FUNCTION app_private.production_state()
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''
AS $function$
declare u uuid:=auth.uid();result jsonb;
begin
 if u is null then raise exception 'AUTH_REQUIRED';end if;
 perform app_private.get_gold_wallet();
 with owned as materialized(select * from app_private.production_sites where user_id=u),
 first_site as(select distinct on(facility_id) * from owned order by facility_id,purchased_at,id),
 totals as(select facility_id,count(*) n from owned group by facility_id)
 select jsonb_build_object('activeLimit',4+app_private.relic_bonus('fuel_active_slots'),'activeTotal',app_private.production_active_count(),'serverNow',clock_timestamp(),'gold',w.gold,'fuel',coalesce((w.inventory->>'fuel')::integer,0),
 'facilities',coalesce((select jsonb_agg(to_jsonb(f)||jsonb_build_object('owned',s.id is not null,'ownedCount',coalesce(t.n,0),
 'startedAt',s.started_at,'completesAt',s.completes_at,'expiresAt',s.expires_at,'runOutput',s.run_output) order by f.price,f.id)
 from public.production_facilities f left join first_site s on s.facility_id=f.id left join totals t on t.facility_id=f.id
 where f.enabled or s.id is not null),'[]'::jsonb),
 'sites',coalesce((select jsonb_agg(to_jsonb(f)||jsonb_build_object('siteId',s.id,'owned',true,
 'startedAt',s.started_at,'completesAt',s.completes_at,'expiresAt',s.expires_at,'runOutput',s.run_output)
 order by f.price,f.id,s.purchased_at,s.id) from owned s join public.production_facilities f on f.id=s.facility_id),'[]'::jsonb))
 into result from public.player_wallets w where w.user_id=u;
 return result;
end $function$;

CREATE OR REPLACE FUNCTION app_private.bait_production_action(p_action text, p_operation_id uuid, p_facility text, p_quantity integer DEFAULT 1)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''
AS $function$
declare u uuid:=auth.uid();w public.player_wallets;f public.bait_production_facilities;s app_private.bait_production_sites;prev app_private.bait_production_operations;
 sig jsonb;receipt jsonb;v_now timestamptz;v_count bigint;v_cost bigint;
begin
 if u is null then raise exception 'AUTH_REQUIRED';end if;
 if p_action is null or p_action not in('buy','sell','start','claim','discard') or p_operation_id is null or p_facility is null or p_quantity is null or p_quantity not between 1 and 100 or (p_action<>'buy' and p_quantity<>1) then raise exception 'INVALID_PRODUCTION';end if;
 perform app_private.get_gold_wallet();
 select * into w from public.player_wallets where user_id=u for update;
 sig:=jsonb_build_object('action',p_action,'facility',p_facility,'quantity',p_quantity);
 select * into prev from app_private.bait_production_operations where user_id=u and operation_id=p_operation_id;
 if found then
  if prev.signature<>sig then raise exception 'OPERATION_CONFLICT';end if;
  return app_private.bait_production_state()||jsonb_build_object('receipt',prev.receipt,'replayed',true);
 end if;
 v_now:=clock_timestamp();
 if p_action='buy' then
  select * into f from public.bait_production_facilities where id=p_facility for share;
  if not found or not f.enabled then raise exception 'PRODUCTION_UNAVAILABLE';end if;
  v_cost:=f.price::bigint*p_quantity;
  if w.gold<v_cost then raise exception 'INSUFFICIENT_GOLD';end if;
  insert into app_private.bait_production_sites(user_id,facility_id) select u,f.id from generate_series(1,p_quantity);
  update public.player_wallets set gold=gold-v_cost,updated_at=v_now where user_id=u;
  insert into public.gold_transactions(user_id,operation_id,action,item_id,delta) values(u,p_operation_id,'buy','bait-production:'||f.id,-v_cost);
  receipt:=jsonb_build_object('action','buy','count',p_quantity);
 else
  select * into s from app_private.bait_production_sites where id=p_facility::uuid and user_id=u for update;
  if not found then raise exception 'PRODUCTION_NOT_OWNED';end if;
  select * into f from public.bait_production_facilities where id=s.facility_id for share;
  if p_action='sell' then
   if s.started_at is not null then raise exception 'PRODUCTION_BUSY';end if;
   v_cost:=f.price/2;
   if w.gold::bigint+v_cost>1000000000 then raise exception 'GOLD_LIMIT';end if;
   delete from app_private.bait_production_sites where id=s.id and user_id=u;
   update public.player_wallets set gold=gold+v_cost,updated_at=v_now where user_id=u;
   insert into public.gold_transactions(user_id,operation_id,action,item_id,delta) values(u,p_operation_id,'sell','bait-production:'||f.id,v_cost);
   receipt:=jsonb_build_object('action','sell','facility',f.id,'siteId',s.id,'gold',v_cost,'count',1);
  elsif p_action='start' then
   if not f.enabled then raise exception 'PRODUCTION_UNAVAILABLE';end if;
   if s.started_at is not null then raise exception 'PRODUCTION_BUSY';end if;
   if app_private.bait_production_active_count()>=4+app_private.relic_bonus('bait_active_slots') then raise exception 'PRODUCTION_ACTIVE_LIMIT';end if;
   if coalesce((w.inventory->>'fuel')::bigint,0)<f.fuel_cost then raise exception 'INSUFFICIENT_FUEL';end if;
   update public.player_wallets set inventory=jsonb_set(inventory,'{fuel}',to_jsonb((inventory->>'fuel')::integer-f.fuel_cost)),updated_at=v_now where user_id=u;
   update app_private.bait_production_sites set started_at=v_now,completes_at=v_now+make_interval(mins=>f.production_minutes),expires_at=v_now+make_interval(mins=>f.production_minutes+f.storage_minutes),run_output=f.output_count,run_bait_id=f.bait_id where id=s.id;
  else
   if s.started_at is null then raise exception 'PRODUCTION_IDLE';end if;
   if p_action='claim' then
    if v_now<s.completes_at then raise exception 'PRODUCTION_NOT_READY';end if;
    if v_now>=s.expires_at then raise exception 'PRODUCTION_EXPIRED';end if;
    v_count:=coalesce((w.inventory->>s.run_bait_id)::bigint,0)+s.run_output;
    if v_count>1000000000 then raise exception 'BAIT_LIMIT';end if;
    update public.player_wallets set inventory=jsonb_set(inventory,array[s.run_bait_id],to_jsonb(v_count::integer)),updated_at=v_now where user_id=u;
   elsif v_now<s.expires_at then raise exception 'PRODUCTION_NOT_EXPIRED';end if;
   update app_private.bait_production_sites set started_at=null,completes_at=null,expires_at=null,run_output=null,run_bait_id=null where id=s.id;
  end if;
  if p_action<>'sell' then
   receipt:=jsonb_build_object('action',p_action,'siteId',s.id,'count',case when p_action='claim' then s.run_output else 0 end);
  end if;
 end if;
 insert into app_private.bait_production_operations values(u,p_operation_id,sig,receipt);
 return app_private.bait_production_state()||jsonb_build_object('receipt',receipt,'replayed',false);
end $function$;

CREATE OR REPLACE FUNCTION app_private.bait_production_state()
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''
AS $function$
declare u uuid:=auth.uid();r jsonb;
begin
 if u is null then raise exception 'AUTH_REQUIRED';end if;
 perform app_private.get_gold_wallet();
 select jsonb_build_object('activeLimit',4+app_private.relic_bonus('bait_active_slots'),'activeTotal',app_private.bait_production_active_count(),'serverNow',clock_timestamp(),'gold',w.gold,'fuel',coalesce((w.inventory->>'fuel')::integer,0),
 'facilities',(select coalesce(jsonb_agg(to_jsonb(f)||jsonb_build_object('baitName',b.name,'image_path',b.image_path,'ownedCount',(select count(*) from app_private.bait_production_sites s where s.user_id=u and s.facility_id=f.id)) order by f.price,f.id),'[]'::jsonb) from public.bait_production_facilities f join public.fishing_baits b on b.id=f.bait_id where f.enabled),
 'sites',(select coalesce(jsonb_agg(to_jsonb(f)||jsonb_build_object('siteId',s.id,'baitName',b.name,'image_path',b.image_path,'startedAt',s.started_at,'completesAt',s.completes_at,'expiresAt',s.expires_at,'runOutput',s.run_output) order by s.purchased_at,s.id),'[]'::jsonb) from app_private.bait_production_sites s join public.bait_production_facilities f on f.id=s.facility_id join public.fishing_baits b on b.id=f.bait_id where s.user_id=u)) into r from public.player_wallets w where user_id=u;
 return r;
end $function$;

CREATE OR REPLACE FUNCTION app_private.personal_bait_workshop_action(p_action text, p_operation_id uuid, p_bait_id text DEFAULT NULL::text, p_quantity integer DEFAULT NULL::integer, p_minutes integer DEFAULT NULL::integer, p_job_id uuid DEFAULT NULL::uuid, p_expected_fuel integer DEFAULT NULL::integer)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''
AS $function$
declare u uuid:=auth.uid();w public.player_wallets;b public.fishing_baits;j app_private.personal_bait_jobs;
 previous app_private.personal_bait_operations;sig jsonb;receipt jsonb;unit_value integer;cost integer;stock bigint;v_now timestamptz;
begin
 if u is null then raise exception 'AUTH_REQUIRED';end if;
 if p_operation_id is null or p_action is null or p_action not in ('start','claim') then raise exception 'INVALID_WORKSHOP_ACTION';end if;
 sig:=jsonb_build_object('action',p_action,'bait',p_bait_id,'quantity',p_quantity,'minutes',p_minutes,'job',p_job_id,'expectedFuel',p_expected_fuel);
 perform app_private.get_gold_wallet();
 -- Shares the wallet lock with all other fuel spenders and reward claims.
 select * into strict w from public.player_wallets where user_id=u for update;
 select * into previous from app_private.personal_bait_operations where user_id=u and operation_id=p_operation_id;
 if found then
  if previous.signature<>sig then raise exception 'OPERATION_CONFLICT';end if;
  return app_private.personal_bait_workshop_state()||jsonb_build_object('receipt',previous.receipt,'replayed',true);
 end if;
 v_now:=clock_timestamp();
 if p_action='start' then
  if p_quantity is null or p_quantity not between 1 and 100 then raise exception 'INVALID_WORKSHOP_QUANTITY';end if;
  if p_minutes is null or p_minutes not between 30 and 720+60*app_private.relic_bonus('personal_bait_hours') or p_minutes%30<>0 then raise exception 'INVALID_WORKSHOP_TIME';end if;
  if p_job_id is not null then raise exception 'INVALID_WORKSHOP_ACTION';end if;
  select * into b from public.fishing_baits where id=p_bait_id and price>0 for share;
  if not found then raise exception 'BAIT_NOT_AVAILABLE';end if;
  if exists(select 1 from app_private.personal_bait_jobs where user_id=u and claimed_at is null) then raise exception 'PERSONAL_PRODUCTION_BUSY';end if;
  unit_value:=case when b.id='bait' then 50 else b.price end;
  -- 20% less fuel before rounding; preserve the existing linear time bonus.
  cost:=ceil(p_quantity::numeric*unit_value*92/(5750+100*(p_minutes/30-1)))::integer;
  if p_expected_fuel is distinct from cost then raise exception 'FUEL_QUOTE_CHANGED';end if;
  if coalesce((w.inventory->>'fuel')::bigint,0)<cost then raise exception 'INSUFFICIENT_FUEL';end if;
  update public.player_wallets set inventory=jsonb_set(inventory,'{fuel}',to_jsonb((inventory->>'fuel')::integer-cost)),updated_at=v_now where user_id=u;
  insert into app_private.personal_bait_jobs(user_id,bait_id,bait_name,image_path,quantity,production_minutes,unit_value,fuel_cost,started_at,completes_at)
   values(u,b.id,b.name,b.image_path,p_quantity,p_minutes,unit_value,cost,v_now,v_now+make_interval(mins=>p_minutes)) returning * into j;
  receipt:=jsonb_build_object('action','start','jobId',j.id,'baitId',b.id,'baitName',b.name,'quantity',j.quantity,'fuelCost',cost,'minutes',p_minutes);
 else
  if p_job_id is null or p_bait_id is not null or p_quantity is not null or p_minutes is not null or p_expected_fuel is not null then raise exception 'INVALID_WORKSHOP_ACTION';end if;
  select * into j from app_private.personal_bait_jobs where id=p_job_id and user_id=u for update;
  if not found or j.claimed_at is not null then raise exception 'WORKSHOP_JOB_NOT_FOUND';end if;
  if v_now<j.completes_at then raise exception 'PRODUCTION_NOT_READY';end if;
  stock:=coalesce((w.inventory->>j.bait_id)::bigint,0)+j.quantity;
  if stock>1000000000 then raise exception 'BAIT_LIMIT';end if;
  update public.player_wallets set inventory=jsonb_set(inventory,array[j.bait_id],to_jsonb(stock::integer)),updated_at=v_now where user_id=u;
  update app_private.personal_bait_jobs set claimed_at=v_now where id=j.id;
  receipt:=jsonb_build_object('action','claim','jobId',j.id,'baitId',j.bait_id,'baitName',j.bait_name,'quantity',j.quantity,'fuelCost',j.fuel_cost,'minutes',j.production_minutes);
 end if;
 insert into app_private.personal_bait_operations(user_id,operation_id,signature,receipt) values(u,p_operation_id,sig,receipt);
 return app_private.personal_bait_workshop_state()||jsonb_build_object('receipt',receipt,'replayed',false);
end $function$;

CREATE OR REPLACE FUNCTION app_private.personal_bait_workshop_state()
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''
AS $function$
declare u uuid:=auth.uid();w jsonb;
begin
 if u is null then raise exception 'AUTH_REQUIRED';end if;
 w:=app_private.get_gold_wallet();
 return jsonb_build_object('serverNow',clock_timestamp(),'fuel',coalesce((w->'inventory'->>'fuel')::integer,0),
  'limits',jsonb_build_object('maxQuantity',100,'minMinutes',30,'maxMinutes',720+60*app_private.relic_bonus('personal_bait_hours'),'stepMinutes',30,'maxActive',1),
  'baits',coalesce((select jsonb_agg(jsonb_build_object('id',b.id,'name',b.name,'imagePath',b.image_path,
   'unitValue',case when b.id='bait' then 50 else b.price end,'owned',coalesce((w->'inventory'->>b.id)::integer,0)) order by b.sort_order,b.id)
   from public.fishing_baits b where b.price>0),'[]'::jsonb),
  'job',(select jsonb_build_object('id',j.id,'baitId',j.bait_id,'baitName',j.bait_name,'imagePath',j.image_path,
   'quantity',j.quantity,'minutes',j.production_minutes,'unitValue',j.unit_value,'fuelCost',j.fuel_cost,
   'startedAt',j.started_at,'completesAt',j.completes_at)
   from app_private.personal_bait_jobs j where j.user_id=u and j.claimed_at is null));
end $function$;

CREATE OR REPLACE FUNCTION app_private.prepare_fishing(p_region_id text, p_bait_id text, p_operation_id uuid, p_confirm_bite boolean)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''
AS $function$
declare v_uid uuid:=auth.uid();p app_private.prepared_fishing_casts;w public.player_wallets;
 v_current text;v_required boolean;v_count integer;v_profile jsonb;v_started timestamptz;v_wait numeric;
 v_rarity public.game_rarity;v_species text;v_snapshot jsonb;v_reduction integer;
 v_roll double precision;v_category text;v_reward record;v_map text;v_piece integer;v_relic text;
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
 v_rarity:=app_private.profile_fishing_rarity(v_profile);
 -- Fixed disjoint category ranges; absent categories return to the ordinary
 -- pool without increasing the other discovery category's chance.
 v_roll:=random();
 v_category:=app_private.fishing_reward_category(v_roll);
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
 select r.wait_reduction_seconds into v_reduction from public.player_rod_loadouts l
 join public.player_fishing_rods o on o.user_id=l.user_id and o.rod_id=l.equipped_rod_id
 join public.fishing_rods r on r.id=o.rod_id where l.user_id=v_uid;
 v_wait:=greatest(1,12+12*random()-coalesce(v_reduction,0)-app_private.relic_bonus('fishing_wait_seconds'));
 insert into app_private.prepared_fishing_casts(user_id,operation_id,region_id,bait_id,eligible,species_id,map_region_id,
  map_piece_number,relic_id,rarity,snapshot,wait_seconds,failure_at,failure_reason,created_at,expires_at,bait_snapshot,confirm_bite)
 values(v_uid,p_operation_id,p_region_id,p_bait_id,true,v_species,v_map,v_piece,v_relic,v_rarity,v_snapshot,v_wait,4.5,'bait',v_started,
  case when p_confirm_bite then v_started+interval '24 hours'
   else v_started+make_interval(secs=>v_wait::double precision)+interval '3 minutes' end,
  v_profile||jsonb_build_object('discovery_version',1),p_confirm_bite) returning * into p;
 update public.player_wallets set inventory=jsonb_set(inventory,array[p_bait_id],to_jsonb(v_count-1)),updated_at=now() where user_id=v_uid;
 return app_private.prepared_fishing_payload(p);
end $function$;

CREATE OR REPLACE FUNCTION app_private.expedition_action(p_action text, p_operation_id uuid, p_vessel_id text DEFAULT NULL::text, p_region_id text DEFAULT NULL::text, p_cargo jsonb DEFAULT NULL::jsonb, p_expedition_id uuid DEFAULT NULL::uuid)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''
AS $function$
declare u uuid:=auth.uid();r jsonb;c record;total integer:=0;minutes numeric;
begin
 if u is null then raise exception 'AUTH_REQUIRED';end if;
 if p_action='buy' then raise exception 'VESSEL_RETIRED';end if;
 if p_action='depart' then
  if p_vessel_id is distinct from 'dinghy' then raise exception 'VESSEL_RETIRED';end if;
  if p_cargo is null or jsonb_typeof(p_cargo)<>'object' then raise exception 'INVALID_CARGO';end if;
  for c in select value from jsonb_each_text(p_cargo) loop
   if c.value !~ '^[1-9][0-9]{0,2}$' then raise exception 'INVALID_CARGO';end if;
   total:=total+c.value::integer;
  end loop;
  if total<1 or total>30 then raise exception 'CARGO_LIMIT';end if;
 end if;
 r:=app_private.settle_legacy_expedition(p_action,p_operation_id,p_vessel_id,p_region_id,p_cargo,p_expedition_id);
 if p_action='depart' and not (r->>'replayed')::boolean then
  minutes:=total*(app_private.trap_minutes_per_bait()*60-app_private.relic_bonus('trap_seconds_per_bait'))/60;
  update public.fishing_expeditions set returns_at=departed_at+make_interval(secs=>(minutes*60)::double precision),
   -- Legacy settlement populates an integer vessel record; preserve that shape.
   vessel_snapshot=jsonb_set(vessel_snapshot,'{duration_minutes}',to_jsonb(ceil(minutes)::integer))||jsonb_build_object('duration_seconds',minutes*60)
   where id=(r->'receipt'->>'expeditionId')::uuid and user_id=u;
  r:=app_private.expedition_state()||jsonb_build_object('receipt',r->'receipt','replayed',false);
 end if;
 return r;
end $function$;

CREATE OR REPLACE FUNCTION app_private.expedition_state()
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''
AS $function$
declare u uuid:=auth.uid();
begin
 if u is null then raise exception 'AUTH_REQUIRED';end if;
 return jsonb_build_object('serverNow',clock_timestamp(),'testEnabled',(select instant_return_enabled from app_private.expedition_settings where id),
 'minutesPerBait',(app_private.trap_minutes_per_bait()*60-app_private.relic_bonus('trap_seconds_per_bait'))/60,
 'vessels',(select jsonb_agg(to_jsonb(v)||jsonb_build_object('owned',true)) from public.fishing_vessels v where id='dinghy'),
 'active',(select (to_jsonb(e)-'result')||jsonb_build_object('boosts',app_private.expedition_boosts_payload(e.id)) from public.fishing_expeditions e where user_id=u and claimed_at is null),
 'history',coalesce((select jsonb_agg(to_jsonb(h)||jsonb_build_object('boosts',app_private.expedition_boosts_payload(h.id)) order by departed_at desc) from (select * from public.fishing_expeditions where user_id=u and claimed_at is not null order by departed_at desc limit 5) h),'[]'::jsonb),
 'baits',(select jsonb_agg(to_jsonb(b) order by sort_order) from public.fishing_baits b));
end $function$;

CREATE OR REPLACE FUNCTION app_private.harbor_action(p_action text, p_operation_id uuid, p_vessel_id text DEFAULT NULL::text, p_voyage_id uuid DEFAULT NULL::uuid, p_quantity integer DEFAULT 1, p_boat_id uuid DEFAULT NULL::uuid, p_slot integer DEFAULT NULL::integer, p_region_id text DEFAULT 'pongdang'::text, p_secondary_region_id text DEFAULT NULL::text)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''
AS $function$
declare u uuid:=auth.uid();v public.harbor_vessels;b public.harbor_boats;occupant public.harbor_boats;w public.player_wallets;trip public.harbor_voyages;
 prev app_private.harbor_operations;sig jsonb;receipt jsonb;n integer;slot integer;fuel integer;capacity integer;expansion_price integer;
begin
 if u is null then raise exception 'AUTH_REQUIRED';end if;
 if p_operation_id is null or p_action is null or p_action not in ('buy','depart','dock','store','sell','fuel','arrive','claim','claim_all','expand') then raise exception 'INVALID_HARBOR_ACTION';end if;
 if p_action in ('fuel','arrive','claim','claim_all') then return app_private.settle_legacy_harbor(p_action,p_operation_id,p_vessel_id,p_voyage_id,p_quantity);end if;
 sig:=jsonb_build_object('action',p_action,'vessel',p_vessel_id,'voyage',p_voyage_id,'quantity',p_quantity);
 if p_boat_id is not null or p_slot is not null then sig:=sig||jsonb_build_object('boat',p_boat_id,'slot',p_slot);end if;
 if p_action='depart' and p_region_id is distinct from 'pongdang' then sig:=sig||jsonb_build_object('region',p_region_id);end if;
 if p_secondary_region_id is not null then sig:=sig||jsonb_build_object('secondaryRegion',p_secondary_region_id);end if;
 perform pg_advisory_xact_lock(hashtextextended('harbor:'||u::text,0));
 select * into prev from app_private.harbor_operations where user_id=u and operation_id=p_operation_id;
 if found then
  if prev.signature<>sig then raise exception 'OPERATION_CONFLICT';end if;
  return app_private.harbor_state()||jsonb_build_object('receipt',prev.receipt,'replayed',true);
 end if;
 perform app_private.get_gold_wallet();select * into w from public.player_wallets where user_id=u for update;
 select coalesce((select dock_slots from app_private.player_harbor_capacity where user_id=u),2) into capacity;
 if p_action='expand' then
  if capacity>=4 then raise exception 'HARBOR_FULLY_EXPANDED';end if;
  if p_slot is distinct from capacity+1 then raise exception 'HARBOR_EXPANSION_CHANGED';end if;
  expansion_price:=case capacity when 2 then 10000 else 30000 end;
  if w.gold<expansion_price then raise exception 'INSUFFICIENT_GOLD';end if;
  insert into app_private.player_harbor_capacity(user_id,dock_slots) values(u,capacity+1)
   on conflict(user_id) do update set dock_slots=excluded.dock_slots;
  update public.player_wallets set gold=gold-expansion_price,updated_at=now() where user_id=u;
  insert into public.gold_transactions(user_id,operation_id,action,item_id,delta)
   values(u,p_operation_id,'buy','harbor-dock:'||(capacity+1)::text,-expansion_price);
  receipt:=jsonb_build_object('action','expand','dockSlots',capacity+1,'gold',expansion_price);
 elsif p_action='buy' then
  select * into v from public.harbor_vessels where id=p_vessel_id;
  if not found then raise exception 'VESSEL_NOT_FOUND';end if;
  select count(*) into n from public.harbor_boats where user_id=u and vessel_id=v.id and sold_at is null;
  v.price:=greatest(0,v.price-app_private.relic_bonus('boat_discount_gold')::integer);
  if w.gold<v.price then raise exception 'INSUFFICIENT_GOLD';end if;
  select s into slot from generate_series(1,capacity) s where not exists(select 1 from public.harbor_boats where user_id=u and dock_slot=s) order by s limit 1;
  insert into public.harbor_boats(user_id,vessel_id,paid_price,instance_no,dock_slot) values(u,v.id,v.price,(select s from generate_series(1,n+1) s where not exists(select 1 from public.harbor_boats hb where hb.user_id=u and hb.vessel_id=v.id and hb.instance_no=s and hb.sold_at is null) order by s limit 1),slot) returning * into b;
  insert into public.player_harbor_vessels(user_id,vessel_id) values(u,v.id) on conflict do nothing;
  update public.player_wallets set gold=gold-v.price,updated_at=now() where user_id=u;
  insert into public.gold_transactions(user_id,operation_id,action,item_id,delta) values(u,p_operation_id,'buy','harbor-vessel:'||v.id,-v.price);
  receipt:=jsonb_build_object('action','buy','vesselId',v.id,'boatId',b.id);
 else
  if p_boat_id is not null then select * into b from public.harbor_boats where id=p_boat_id and user_id=u and sold_at is null;
  elsif p_action='depart' then
   select * into b from public.harbor_boats b0 where b0.user_id=u and b0.vessel_id=p_vessel_id and b0.dock_slot is not null
    order by exists(select 1 from public.harbor_voyages t where t.boat_id=b0.id and t.claimed_at is null),b0.dock_slot limit 1;
  end if;
  if b.id is null then raise exception 'VESSEL_NOT_OWNED';end if;
  if p_vessel_id is not null and p_vessel_id<>b.vessel_id then raise exception 'INVALID_BOAT';end if;
  if exists(select 1 from public.harbor_voyages where boat_id=b.id and claimed_at is null) then raise exception 'VOYAGE_ACTIVE';end if;
  if p_action='sell' then
   select * into strict v from public.harbor_vessels where id=b.vessel_id;
   n:=coalesce(b.paid_price,v.price)/2;
   if w.gold::bigint+n>1000000000 then raise exception 'GOLD_LIMIT';end if;
   update public.harbor_boats set sold_at=clock_timestamp(),dock_slot=null where id=b.id;
   update public.player_wallets set gold=gold+n,updated_at=now() where user_id=u;
   insert into public.gold_transactions(user_id,operation_id,action,item_id,delta) values(u,p_operation_id,'sell','harbor-boat:'||b.id,n);
   receipt:=jsonb_build_object('action','sell','vesselId',v.id,'boatId',b.id,'gold',n);
  elsif p_action='dock' then
   if p_slot is null or p_slot not between 1 and capacity then raise exception 'INVALID_DOCK_SLOT';end if;
   if b.dock_slot is not null and b.dock_slot<>p_slot then raise exception 'BOAT_ALREADY_DOCKED';end if;
   select * into occupant from public.harbor_boats where user_id=u and dock_slot=p_slot and id<>b.id;
   if occupant.id is not null then
    if exists(select 1 from public.harbor_voyages where boat_id=occupant.id and claimed_at is null) then raise exception 'DOCK_RESERVED';end if;
    update public.harbor_boats set dock_slot=null where id=occupant.id;
   end if;
   update public.harbor_boats set dock_slot=p_slot where id=b.id;
   receipt:=jsonb_build_object('action','dock','boatId',b.id,'slot',p_slot);
  elsif p_action='store' then
   update public.harbor_boats set dock_slot=null where id=b.id;
   receipt:=jsonb_build_object('action','store','boatId',b.id);
  else
   if not exists(select 1 from public.regions where id=p_region_id) then raise exception 'REGION_NOT_FOUND';end if;
   if exists(select 1 from public.regions r where r.id=p_region_id and r.requires_map_fragment
    and not exists(select 1 from public.player_map_fragments m where m.user_id=u and m.region_id=r.id)) then raise exception 'REGION_LOCKED';end if;
   if b.dock_slot is null or b.dock_slot>capacity then raise exception 'DOCK_REQUIRED';end if;
   select * into strict v from public.harbor_vessels where id=b.vessel_id;
   if coalesce((v.catch_rule->>'region_count')::integer,1)=2 then
    if p_secondary_region_id is null or p_secondary_region_id=p_region_id then raise exception 'SECOND_REGION_REQUIRED';end if;
    if not exists(select 1 from public.regions where id=p_secondary_region_id) then raise exception 'REGION_NOT_FOUND';end if;
    if exists(select 1 from public.regions r where r.id=p_secondary_region_id and r.requires_map_fragment
     and not exists(select 1 from public.player_map_fragments m where m.user_id=u and m.region_id=r.id)) then raise exception 'REGION_LOCKED';end if;
   elsif p_secondary_region_id is not null then raise exception 'SECOND_REGION_NOT_ALLOWED';end if;
   fuel:=coalesce((w.inventory->>'fuel')::integer,0);
   if fuel<v.fuel_cost then raise exception 'INSUFFICIENT_FUEL';end if;
   update public.player_wallets set inventory=jsonb_set(inventory,'{fuel}',to_jsonb(fuel-v.fuel_cost)),updated_at=now() where user_id=u;
   insert into public.harbor_voyages(user_id,vessel_id,boat_id,region_id,vessel_snapshot,returns_at) values(u,v.id,b.id,p_region_id,to_jsonb(v)||case when p_secondary_region_id is not null then jsonb_build_object('secondary_region_id',p_secondary_region_id,'secondary_region_name',(select name from public.regions where id=p_secondary_region_id)) else '{}'::jsonb end||jsonb_build_object('fishing_count',v.fishing_count+floor(random()*(coalesce(v.fishing_count_max,v.fishing_count)-v.fishing_count+1))::integer),clock_timestamp()+make_interval(mins=>v.duration_minutes)) returning * into trip;
   receipt:=jsonb_build_object('action','depart','voyageId',trip.id,'vesselId',v.id,'boatId',b.id);
  end if;
 end if;
 insert into app_private.harbor_operations(user_id,operation_id,signature,receipt) values(u,p_operation_id,sig,receipt);
 return app_private.harbor_state()||jsonb_build_object('receipt',receipt,'replayed',false);
end $function$;

CREATE OR REPLACE FUNCTION app_private.harbor_state()
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''
AS $function$
declare u uuid:=auth.uid();w jsonb;capacity integer;
begin
 if u is null then raise exception 'AUTH_REQUIRED';end if;
 w:=app_private.get_gold_wallet();
 select coalesce((select dock_slots from app_private.player_harbor_capacity where user_id=u),2) into capacity;
 return jsonb_build_object('serverNow',clock_timestamp(),'fuel',coalesce((w->'inventory'->>'fuel')::integer,0),'fuelPrice',57,'fuelDailyLimit',5,'fuelPurchasedToday',coalesce((select sum((op.receipt->>'quantity')::integer) from app_private.harbor_operations op where op.user_id=u and op.receipt->>'action'='fuel' and op.created_at>=((clock_timestamp() at time zone 'Asia/Seoul')::date::timestamp at time zone 'Asia/Seoul')),0),'dockSlots',capacity,'nextDockExpansion',case when capacity<4 then jsonb_build_object('slot',capacity+1,'price',case capacity when 2 then 10000 else 30000 end) else null end,
 'regions',(select jsonb_agg(jsonb_build_object('id',r.id,'name',r.name,'unlocked',not r.requires_map_fragment or exists(select 1 from public.player_map_fragments m where m.user_id=u and m.region_id=r.id)) order by r.sort_order) from public.regions r),
 'vessels',coalesce((select jsonb_agg(to_jsonb(v)||jsonb_build_object('price',greatest(0,v.price-app_private.relic_bonus('boat_discount_gold')::integer),'basePrice',v.price,'owned',o.n>0,'ownedCount',o.n) order by v.sort_order)
  from public.harbor_vessels v cross join lateral(select count(*)::integer n from public.harbor_boats b where b.user_id=u and b.vessel_id=v.id and b.sold_at is null)o),'[]'::jsonb),
 'boats',coalesce((select jsonb_agg(to_jsonb(v)||jsonb_build_object('price',coalesce(b.paid_price,v.price),'id',b.id,'vessel_id',b.vessel_id,'instance_no',b.instance_no,'dock_slot',b.dock_slot,'owned',true) order by b.purchased_at,b.id)
  from public.harbor_boats b join public.harbor_vessels v on v.id=b.vessel_id where b.user_id=u and b.sold_at is null),'[]'::jsonb),
 'voyages',coalesce((select jsonb_agg(to_jsonb(v)||jsonb_build_object('region_name',(select name from public.regions where id=v.region_id)) order by v.departed_at) from public.harbor_voyages v where v.user_id=u and v.claimed_at is null),'[]'::jsonb));
end $function$;
notify pgrst,'reload schema';


-- 20261025071849_relic_catalog.sql
-- Generated from supabase/catalog/catalog.json. Review before migration deployment.

set constraints all deferred;
insert into public.fishing_relics ("id","name","description","rarity","thumbnail_path","enabled","effect_kind","effect_value") values
('undying-furnace-heart','꺼지지 않는 화로심장','연료생산소 동시 가동 가능 횟수 +1 · 장착 중에만 효과가 적용돼요.','epic','relics/epic/undying-furnace-heart_thumbnail.png',true,'fuel_active_slots',1),
('primordial-ember','태초의 불씨','연료생산소 동시 가동 가능 횟수 +2 · 장착 중에만 효과가 적용돼요.','mythic','relics/mythic/primordial-ember_thumbnail.png',true,'fuel_active_slots',2),
('abundant-conch','풍요의 소라고둥','미끼생산소 동시 가동 가능 횟수 +1 · 장착 중에만 효과가 적용돼요.','epic','relics/epic/abundant-conch_thumbnail.png',true,'bait_active_slots',1),
('ocean-seed','바다가 품은 씨앗','미끼생산소 동시 가동 가능 횟수 +2 · 장착 중에만 효과가 적용돼요.','mythic','relics/mythic/ocean-seed_thumbnail.png',true,'bait_active_slots',2),
('shell-hourglass','조개 모래시계','나만의 미끼 생산소 최대 제작 시간 +2시간 · 장착 중에만 효과가 적용돼요.','rare','relics/rare/shell-hourglass_thumbnail.png',true,'personal_bait_hours',2),
('still-wave-clock','멈춘 파도의 시계','나만의 미끼 생산소 최대 제작 시간 +4시간 · 장착 중에만 효과가 적용돼요.','epic','relics/epic/still-wave-clock_thumbnail.png',true,'personal_bait_hours',4),
('eternal-water-clock','영원의 물시계','나만의 미끼 생산소 최대 제작 시간 +8시간 · 장착 중에만 효과가 적용돼요.','mythic','relics/mythic/eternal-water-clock_thumbnail.png',true,'personal_bait_hours',8),
('silver-osprey-feather','은빛 물수리 깃털','낚시 대기 시간 0.5초 단축 · 장착 중에만 효과가 적용돼요.','rare','relics/rare/silver-osprey-feather_thumbnail.png',true,'fishing_wait_seconds',0.5),
('current-piercing-needle','물살을 가르는 바늘','낚시 대기 시간 1초 단축 · 장착 중에만 효과가 적용돼요.','epic','relics/epic/current-piercing-needle_thumbnail.png',true,'fishing_wait_seconds',1),
('instant-fishing-hook','찰나를 낚는 낚싯바늘','낚시 대기 시간 2초 단축 · 장착 중에만 효과가 적용돼요.','mythic','relics/mythic/instant-fishing-hook_thumbnail.png',true,'fishing_wait_seconds',2),
('fish-calling-bell','물고기를 부르는 방울','통발 미끼당 대기 시간 30초 단축 · 장착 중에만 효과가 적용돼요.','rare','relics/rare/fish-calling-bell_thumbnail.png',true,'trap_seconds_per_bait',30),
('tide-bell','밀물의 종','통발 미끼당 대기 시간 1분 30초 단축 · 장착 중에만 효과가 적용돼요.','epic','relics/epic/tide-bell_thumbnail.png',true,'trap_seconds_per_bait',90),
('sea-king-summoning-bell','해왕의 부름종','통발 미끼당 대기 시간 3분 단축 · 장착 중에만 효과가 적용돼요.','mythic','relics/mythic/sea-king-summoning-bell_thumbnail.png',true,'trap_seconds_per_bait',180),
('old-captain-seal','낡은 선장의 인장','배 구매 가격 50골드 할인 · 장착 중에만 효과가 적용돼요.','rare','relics/rare/old-captain-seal_thumbnail.png',true,'boat_discount_gold',50),
('golden-anchor-seal','황금 닻 인장','배 구매 가격 150골드 할인 · 장착 중에만 효과가 적용돼요.','epic','relics/epic/golden-anchor-seal_thumbnail.png',true,'boat_discount_gold',150),
('sea-king-shipwright-edict','해왕의 조선 칙서','배 구매 가격 400골드 할인 · 장착 중에만 효과가 적용돼요.','mythic','relics/mythic/sea-king-shipwright-edict_thumbnail.png',true,'boat_discount_gold',400)
on conflict(id) do update set "name"=excluded."name","description"=excluded."description","rarity"=excluded."rarity","thumbnail_path"=excluded."thumbnail_path","enabled"=excluded."enabled","effect_kind"=excluded."effect_kind","effect_value"=excluded."effect_value";
notify pgrst, 'reload schema';


-- 20261025081155_discovery_rpc_compatibility.sql

-- Preserve legacy rewards; discovery clients explicitly use the new entry point.
CREATE OR REPLACE FUNCTION app_private.prepare_discovery_cast(p_region_id text, p_bait_id text, p_operation_id uuid, p_confirm_bite boolean, p_discovery boolean)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''
AS $function$
declare v_uid uuid:=auth.uid();p app_private.prepared_fishing_casts;w public.player_wallets;
 v_current text;v_required boolean;v_count integer;v_profile jsonb;v_started timestamptz;v_wait numeric;
 v_rarity public.game_rarity;v_species text;v_snapshot jsonb;v_reduction integer;
 v_roll double precision;v_category text;v_reward record;v_map text;v_piece integer;v_relic text;
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
 v_rarity:=app_private.profile_fishing_rarity(v_profile);
 -- Fixed disjoint category ranges; absent categories return to the ordinary
 -- pool without increasing the other discovery category's chance.
 v_category:='ordinary';
 if p_discovery then
  v_roll:=random();
  v_category:=app_private.fishing_reward_category(v_roll);
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
 select r.wait_reduction_seconds into v_reduction from public.player_rod_loadouts l
 join public.player_fishing_rods o on o.user_id=l.user_id and o.rod_id=l.equipped_rod_id
 join public.fishing_rods r on r.id=o.rod_id where l.user_id=v_uid;
 v_wait:=greatest(1,12+12*random()-coalesce(v_reduction,0)-app_private.relic_bonus('fishing_wait_seconds'));
 insert into app_private.prepared_fishing_casts(user_id,operation_id,region_id,bait_id,eligible,species_id,map_region_id,
  map_piece_number,relic_id,rarity,snapshot,wait_seconds,failure_at,failure_reason,created_at,expires_at,bait_snapshot,confirm_bite)
 values(v_uid,p_operation_id,p_region_id,p_bait_id,true,v_species,v_map,v_piece,v_relic,v_rarity,v_snapshot,v_wait,4.5,'bait',v_started,
  case when p_confirm_bite then v_started+interval '24 hours'
   else v_started+make_interval(secs=>v_wait::double precision)+interval '3 minutes' end,
  v_profile||jsonb_build_object('discovery_version',1),p_confirm_bite) returning * into p;
 update public.player_wallets set inventory=jsonb_set(inventory,array[p_bait_id],to_jsonb(v_count-1)),updated_at=now() where user_id=v_uid;
 return app_private.prepared_fishing_payload(p);
end $function$;
create or replace function app_private.prepare_fishing(p_region_id text,p_bait_id text,p_operation_id uuid,p_confirm_bite boolean)
returns jsonb language sql security definer set search_path='' as $$
 select app_private.prepare_discovery_cast(p_region_id,p_bait_id,p_operation_id,p_confirm_bite,false)
$$;
revoke all on function app_private.prepare_discovery_cast(text,text,uuid,boolean,boolean) from public,anon;
grant execute on function app_private.prepare_discovery_cast(text,text,uuid,boolean,boolean) to authenticated;
create function public.prepare_discovery_fishing(p_region_id text,p_bait_id text,p_operation_id uuid,p_confirm_bite boolean default false)
returns jsonb language sql security invoker set search_path='' as $$
 select app_private.prepare_discovery_cast(p_region_id,p_bait_id,p_operation_id,p_confirm_bite,true)
 ||jsonb_build_object('server_now',clock_timestamp())
$$;
revoke all on function public.prepare_discovery_fishing(text,text,uuid,boolean) from public,anon;
grant execute on function public.prepare_discovery_fishing(text,text,uuid,boolean) to authenticated;
notify pgrst,'reload schema';

commit;
