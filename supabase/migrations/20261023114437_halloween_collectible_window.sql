-- Reserved event prefixes gate newly registered species without a deployment race.
-- This controls fresh draws only; owned items and prepared manual casts survive expiry.
begin;
create table app_private.collectible_event_windows (
 id text primary key,
 species_prefix text not null unique check (species_prefix <> ''),
 starts_at timestamptz not null,
 ends_at timestamptz not null,
 check (starts_at < ends_at)
);
alter table app_private.collectible_event_windows enable row level security;
revoke all on app_private.collectible_event_windows from public,anon,authenticated;
insert into app_private.collectible_event_windows(id,species_prefix,starts_at,ends_at)
values ('halloween_2026','halloween-','2026-10-24 00:00:00+09','2026-11-01 00:00:00+09');

create function app_private.collectible_available_at(p_species_id text,p_at timestamptz)
returns boolean language sql stable set search_path='' as $$
 select p_species_id is not null and p_at is not null and not exists (
  select 1 from app_private.collectible_event_windows e
  where starts_with(p_species_id,e.species_prefix)
   and (p_at < e.starts_at or p_at >= e.ends_at)
 )
$$;
revoke all on function app_private.collectible_available_at(text,timestamptz) from public,anon,authenticated;

CREATE OR REPLACE FUNCTION app_private.pick_habitat_group(p_ids text[], p_region text, p_rod_region text DEFAULT NULL::text, p_home_multiplier numeric DEFAULT 1, p_rarity_fallback boolean DEFAULT false)
 RETURNS text
 LANGUAGE sql
 SET search_path TO ''
AS $function$
 with candidates as materialized (
  select s.id,s.rarity,s.native_region_id,
   case when not s.is_native then 'shared' when s.native_region_id=p_region then 'home' else 'away' end bucket
  from public.collectible_species s where app_private.collectible_available_at(s.id,statement_timestamp()) and s.id=any(p_ids)
 ), groups as materialized (
  select distinct bucket from candidates
 ), selected as materialized (
  select bucket from groups
  order by -ln(greatest(random(),1e-15))/case bucket
   when 'home' then 25*greatest(p_home_multiplier,0.001)*case when p_rod_region=p_region then 1.1 else 1 end
   when 'shared' then 80 else 5 end,bucket limit 1
 )
 select c.id from candidates c join selected g using(bucket)
 order by -ln(greatest(random(),1e-15))/(
  case when c.bucket='away' and c.native_region_id=p_rod_region then 3 else 1 end
  *case when p_rarity_fallback then case c.rarity when 'common' then 7700 when 'rare' then 2000 when 'epic' then 270 else 30 end else 1 end
 ),c.id limit 1
$function$;

CREATE OR REPLACE FUNCTION app_private.pick_profile_collectible(p_region text, p_rarity game_rarity, p_profile jsonb, p_manual boolean DEFAULT false, p_native boolean DEFAULT false, p_local_discovery boolean DEFAULT false)
 RETURNS text
 LANGUAGE plpgsql
 SET search_path TO ''
AS $function$
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
  select s.id,s.rarity from public.collectible_species s where app_private.collectible_available_at(s.id,statement_timestamp()) and case
   when effect='undiscovered' then s.kind in ('fish','trash','decoration')
    and not exists(select 1 from public.player_discoveries d where d.user_id=auth.uid() and d.species_id=s.id)
    and (not p_local_discovery or exists(select 1 from public.collectible_habitats h where h.species_id=s.id and h.region_id=p_region))
   when bid='bait_grubby_magnet' then s.kind='trash'
   when effect='shooting_star' then s.rarity=p_rarity and (p_rarity='mythic' or s.kind='trash')
   when effect='common_only' then s.rarity=p_rarity and not s.is_native and (p_profile->'target_kinds') ? s.kind::text
   else s.rarity=p_rarity and (p_profile->'target_kinds') ? s.kind::text end
 ), pool as (
  select * from candidates c where c.rarity=p_rarity
   or (effect='undiscovered' or bid='bait_grubby_magnet') and not exists(select 1 from candidates c2 where c2.rarity=p_rarity)
 )
 select array_agg(id order by id),not coalesce(bool_or(rarity=p_rarity),false) into ids,fallback from pool;
 return app_private.pick_habitat_group(ids,p_region,rod_region,
  coalesce((p_profile->>'native_multiplier')::numeric,1)*(case when p_native then 1.5 else 1 end),fallback);
end $function$;

CREATE OR REPLACE FUNCTION app_private.harbor_draw(p_region text, p_rule jsonb)
 RETURNS text
 LANGUAGE plpgsql
 SET search_path TO ''
AS $function$
declare r public.game_rarity;roll integer;v_kind text:=p_rule->>'kind';wanted text;ids text[];
 fallback boolean:=false;sid text;
begin
 if auth.uid() is null then raise exception 'AUTH_REQUIRED';end if;
 if random()*10000>=(p_rule->>'success_bp')::integer then return null;end if;
 roll:=floor(random()*10000)::integer;
 r:=case when roll<(p_rule->>'mythic_bp')::integer then 'mythic'::public.game_rarity
  when roll<(p_rule->>'mythic_bp')::integer+(p_rule->>'epic_bp')::integer then 'epic'::public.game_rarity
  when roll<(p_rule->>'mythic_bp')::integer+(p_rule->>'epic_bp')::integer+(p_rule->>'rare_bp')::integer then 'rare'::public.game_rarity
  else 'common'::public.game_rarity end;
 if v_kind='trash_weighted' then
  wanted:=case when random()*10000<(p_rule->>'trash_bp')::integer then 'trash' else 'fish' end;
 end if;
 select array_agg(s.id order by s.id) into ids from public.collectible_species s where app_private.collectible_available_at(s.id,statement_timestamp()) and s.rarity=r and case v_kind
  when 'decoration' then s.kind='decoration'
  when 'trash_only' then s.kind='trash'
  when 'trash_weighted' then s.kind::text=wanted
  when 'discovery_only' then s.kind in('fish','trash','decoration') and not exists(
   select 1 from public.player_discoveries d where d.user_id=auth.uid() and d.species_id=s.id)
  when 'discovery_weighted' then s.kind in('fish','trash','decoration')
  else s.kind in('fish','trash') end;
 -- Preserve legacy specialty fallback rules. New mixed-kind boats only
 -- renormalize a missing kind within the same grade, never upgrade the grade.
 if ids is null and v_kind='trash_weighted' then
  select array_agg(s.id order by s.id) into ids from public.collectible_species s where app_private.collectible_available_at(s.id,statement_timestamp()) and s.rarity=r and s.kind in('fish','trash');
 elsif ids is null and v_kind in('trash_only','discovery_only') then
  fallback:=true;
  select array_agg(s.id order by s.id) into ids from public.collectible_species s where
   case when v_kind='trash_only' then s.kind='trash' else s.kind in('fish','trash','decoration')
    and not exists(select 1 from public.player_discoveries d where d.user_id=auth.uid() and d.species_id=s.id) end;
 end if;
 if ids is null then
  if v_kind='discovery_only' then return null;end if;
  raise exception 'NO_COLLECTIBLE_FOR_REGION';
 end if;
 -- Independent habitat picker: future bait/rod helper changes cannot leak in.
 with candidates as materialized(
  select s.id,s.rarity,
   case when not s.is_native then 'shared' when s.native_region_id=p_region then 'home' else 'away' end bucket,
   case when v_kind='discovery_weighted' and not exists(select 1 from public.player_discoveries d where d.user_id=auth.uid() and d.species_id=s.id)
    then (p_rule->>'discovery_weight')::numeric else 1 end discovery_weight
  from public.collectible_species s where app_private.collectible_available_at(s.id,statement_timestamp()) and s.id=any(ids)
 ),groups as materialized(select distinct bucket from candidates),selected as materialized(
  select bucket from groups order by -ln(greatest(random(),1e-15))/case bucket
   when 'home' then 35*(p_rule->>'home_multiplier')::numeric when 'shared' then 60 else 5 end,bucket limit 1
 )select c.id into sid from candidates c join selected g using(bucket)
 order by -ln(greatest(random(),1e-15))/(c.discovery_weight*case when fallback then
  case c.rarity when 'common' then 7700 when 'rare' then 2000 when 'epic' then 270 else 30 end else 1 end),c.id limit 1;
 return sid;
end $function$;

CREATE OR REPLACE FUNCTION app_private.trap_pick(p_region text, p_bait text, p_native boolean, p_local_discovery boolean, p_snapshot jsonb)
 RETURNS text
 LANGUAGE plpgsql
 SET search_path TO ''
AS $function$
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
 select s.id,s.rarity from public.collectible_species s where app_private.collectible_available_at(s.id,statement_timestamp()) and case
 when p_bait='bait_first_greeting' then s.kind in ('fish','trash','decoration') and not exists(select 1 from public.player_discoveries d where d.user_id=auth.uid() and d.species_id=s.id)
 and (not p_local_discovery or exists(select 1 from public.collectible_habitats h where h.species_id=s.id and h.region_id=p_region))
 when p_bait='bait_grubby_magnet' then s.kind='trash'
 when b.effect_kind='decoration' then s.kind='decoration' and s.rarity=r else s.kind in ('fish','trash') and s.rarity=r end
 ),pool as(select * from candidates c where c.rarity=r or not exists(select 1 from candidates c2 where c2.rarity=r))
 select array_agg(id order by id),not coalesce(bool_or(rarity=r),false) into ids,fallback from pool;
 return app_private.pick_habitat_group(ids,p_region,null,(case when p_native then 1.5 else 1 end)*(case when p_bait='bait_sea_memory' then 3 else 1 end),fallback and b.effect_kind<>'decoration');
end $function$;

CREATE OR REPLACE FUNCTION app_private.pick_regional_collectible(p_region_id text, p_rarity game_rarity, p_decoration boolean, p_map_roll integer)
 RETURNS TABLE(species_id text, map_region_id text)
 LANGUAGE plpgsql
 SET search_path TO ''
AS $function$
declare v_rod_region text;ids text[];sid text;
begin
 if p_map_roll is null or p_map_roll<0 or p_map_roll>=10000 then raise exception 'INVALID_ROLL';end if;
 if not exists(select 1 from public.regions where id=p_region_id) then raise exception 'REGION_NOT_FOUND';end if;
 select r.region_id into v_rod_region from public.player_rod_loadouts l
 join public.player_fishing_rods o on o.user_id=l.user_id and o.rod_id=l.equipped_rod_id
 join public.fishing_rods r on r.id=o.rod_id where l.user_id=auth.uid() and r.native_bonus_bp>0;
 select array_agg(s.id order by s.id) into ids from public.collectible_species s where app_private.collectible_available_at(s.id,statement_timestamp()) and s.rarity=p_rarity and ((p_decoration and s.kind='decoration') or (not p_decoration and s.kind in ('fish','trash')));
 sid:=app_private.pick_habitat_group(ids,p_region_id,v_rod_region);
 if sid is not null then return query select sid,null::text;end if;
end $function$;

CREATE OR REPLACE FUNCTION app_private.pick_bait_fish(p_region text, p_rarity game_rarity, p_native boolean DEFAULT false, p_manual boolean DEFAULT false)
 RETURNS text
 LANGUAGE plpgsql
 SET search_path TO ''
AS $function$
declare ids text[];rod_region text;
begin
 if auth.uid() is null then raise exception 'AUTH_REQUIRED';end if;
 if not exists(select 1 from public.regions where id=p_region) then raise exception 'REGION_NOT_FOUND';end if;
 if p_manual then
  select r.region_id into rod_region from public.player_rod_loadouts l
  join public.player_fishing_rods o on o.user_id=l.user_id and o.rod_id=l.equipped_rod_id
  join public.fishing_rods r on r.id=o.rod_id where l.user_id=auth.uid() and r.native_bonus_bp>0;
 end if;
 select array_agg(id order by id) into ids from public.collectible_species where app_private.collectible_available_at(id,statement_timestamp()) and kind='fish' and rarity=p_rarity;
 return app_private.pick_habitat_group(ids,p_region,rod_region,case when p_native then 1.5 else 1 end,false);
end $function$;

CREATE OR REPLACE FUNCTION app_private.pick_balanced_bait_collectible(p_region text, p_rarity game_rarity, p_bait text, p_native boolean DEFAULT false, p_manual boolean DEFAULT false)
 RETURNS text
 LANGUAGE plpgsql
 SET search_path TO ''
AS $function$
declare ids text[];rod_region text;
begin
 if auth.uid() is null then raise exception 'AUTH_REQUIRED';end if;
 if p_bait is null or p_bait not in ('bait_snowflake_salt','bait_shooting_star_tail') then raise exception 'INVALID_BAIT';end if;
 if not exists(select 1 from public.regions where id=p_region) then raise exception 'REGION_NOT_FOUND';end if;
 if p_rarity is null or (p_bait='bait_shooting_star_tail' and p_rarity not in ('common','mythic')) then raise exception 'INVALID_RARITY';end if;
 if p_manual then
  select r.region_id into rod_region from public.player_rod_loadouts l
  join public.player_fishing_rods o on o.user_id=l.user_id and o.rod_id=l.equipped_rod_id
  join public.fishing_rods r on r.id=o.rod_id where l.user_id=auth.uid() and r.native_bonus_bp>0;
 end if;
 select array_agg(s.id order by s.id) into ids from public.collectible_species s where app_private.collectible_available_at(s.id,statement_timestamp()) and s.rarity=p_rarity and case
  when p_bait='bait_snowflake_salt' then not s.is_native and s.kind in ('fish','trash')
  when p_rarity='mythic' then s.kind in ('fish','trash','decoration')
  else s.kind='trash' end;
 if ids is null then raise exception 'NO_COLLECTIBLE_FOR_REGION';end if;
 return app_private.pick_habitat_group(ids,p_region,rod_region,case when p_native then 1.5 else 1 end,false);
end $function$;

commit;
