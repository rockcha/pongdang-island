begin;
-- Select a habitat group independently of the number of species in that group.
create function app_private.pick_habitat_group(
 p_ids text[],p_region text,p_rod_region text default null,
 p_home_multiplier numeric default 1,p_rarity_fallback boolean default false
) returns text language sql volatile set search_path='' as $$
 with candidates as materialized (
  select s.id,s.rarity,s.native_region_id,
   case when not s.is_native then 'shared' when s.native_region_id=p_region then 'home' else 'away' end bucket
  from public.collectible_species s where s.id=any(p_ids)
 ), groups as materialized (
  select distinct bucket from candidates
 ), selected as materialized (
  select bucket from groups
  order by -ln(greatest(random(),1e-15))/case bucket
   when 'home' then 60*greatest(p_home_multiplier,0.001)*case when p_rod_region=p_region then 1.1 else 1 end
   when 'shared' then 35 else 5 end,bucket limit 1
 )
 select c.id from candidates c join selected g using(bucket)
 order by -ln(greatest(random(),1e-15))/(
  case when c.bucket='away' and c.native_region_id=p_rod_region then 3 else 1 end
  *case when p_rarity_fallback then case c.rarity when 'common' then 7700 when 'rare' then 2000 when 'epic' then 270 else 30 end else 1 end
 ),c.id limit 1
$$;
revoke all on function app_private.pick_habitat_group(text[],text,text,numeric,boolean) from public,anon,authenticated;

create or replace function app_private.pick_regional_collectible(p_region_id text,p_rarity public.game_rarity,p_decoration boolean,p_map_roll integer)
returns table(species_id text,map_region_id text) language plpgsql set search_path='' as $$
declare v_rod_region text;ids text[];sid text;
begin
 if p_map_roll is null or p_map_roll<0 or p_map_roll>=10000 then raise exception 'INVALID_ROLL';end if;
 if not exists(select 1 from public.regions where id=p_region_id) then raise exception 'REGION_NOT_FOUND';end if;
 select r.region_id into v_rod_region from public.player_rod_loadouts l
 join public.player_fishing_rods o on o.user_id=l.user_id and o.rod_id=l.equipped_rod_id
 join public.fishing_rods r on r.id=o.rod_id where l.user_id=auth.uid() and r.native_bonus_bp>0;
 select array_agg(s.id order by s.id) into ids from public.collectible_species s
 where (p_decoration and s.kind='decoration') or (not p_decoration and s.kind in ('fish','trash') and s.rarity=p_rarity);
 sid:=app_private.pick_habitat_group(ids,p_region_id,v_rod_region);
 if sid is not null then return query select sid,null::text;end if;
end $$;

create or replace function app_private.pick_special_bait_collectible(p_region_id text,p_rarity public.game_rarity,p_bait_id text)
returns text language plpgsql set search_path='' as $$
declare v_rod_region text;ids text[];fallback boolean;
begin
 if auth.uid() is null then raise exception 'AUTH_REQUIRED';end if;
 if p_bait_id not in ('bait_grubby_magnet','bait_sea_memory','bait_first_greeting') then raise exception 'INVALID_BAIT';end if;
 if not exists(select 1 from public.regions where id=p_region_id) then raise exception 'REGION_NOT_FOUND';end if;
 select r.region_id into v_rod_region from public.player_rod_loadouts l
 join public.player_fishing_rods o on o.user_id=l.user_id and o.rod_id=l.equipped_rod_id
 join public.fishing_rods r on r.id=o.rod_id where l.user_id=auth.uid() and r.native_bonus_bp>0;
 with candidates as materialized (
  select s.id,s.rarity from public.collectible_species s where case p_bait_id
   when 'bait_grubby_magnet' then s.kind='trash'
   when 'bait_first_greeting' then s.kind in ('fish','trash','decoration') and not exists(select 1 from public.player_discoveries d where d.user_id=auth.uid() and d.species_id=s.id)
   else s.kind in ('fish','trash') and s.rarity=p_rarity end
 ), pool as (select * from candidates c where c.rarity=p_rarity or not exists(select 1 from candidates c2 where c2.rarity=p_rarity))
 select array_agg(id order by id),not coalesce(bool_or(rarity=p_rarity),false) into ids,fallback from pool;
 return app_private.pick_habitat_group(ids,p_region_id,v_rod_region,case when p_bait_id='bait_sea_memory' then 3 else 1 end,fallback);
end $$;

create or replace function app_private.expedition_pick(p_region text,p_bait text,p_native boolean,p_local_discovery boolean default false)
returns text language plpgsql set search_path='' as $$
declare b public.fishing_baits;r public.game_rarity;roll integer:=floor(random()*10000);ids text[];fallback boolean;
begin
 select * into strict b from public.fishing_baits where id=p_bait;
 r:=case when roll<b.mythic_bp then 'mythic' when roll<b.mythic_bp+b.epic_bp then 'epic' when roll<b.mythic_bp+b.epic_bp+b.rare_bp then 'rare' else 'common' end;
 with candidates as materialized (
  select s.id,s.rarity from public.collectible_species s where case
   when p_bait='bait_first_greeting' then s.kind in ('fish','trash','decoration')
    and not exists(select 1 from public.player_discoveries d where d.user_id=auth.uid() and d.species_id=s.id)
    and (not p_local_discovery or exists(select 1 from public.collectible_habitats h where h.species_id=s.id and h.region_id=p_region))
   when p_bait='bait_grubby_magnet' then s.kind='trash'
   when b.effect_kind='decoration' then s.kind='decoration'
   else s.kind in ('fish','trash') and s.rarity=r end
 ), pool as (select * from candidates c where b.effect_kind='decoration' or c.rarity=r or not exists(select 1 from candidates c2 where c2.rarity=r))
 select array_agg(id order by id),not coalesce(bool_or(rarity=r),false) into ids,fallback from pool;
 return app_private.pick_habitat_group(ids,p_region,null,
  (case when p_native then 1.5 else 1 end)*(case when p_bait='bait_sea_memory' then 3 else 1 end),
  fallback and b.effect_kind<>'decoration');
end $$;
notify pgrst,'reload schema';
commit;
