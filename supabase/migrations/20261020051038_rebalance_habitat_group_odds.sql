begin;
-- Preserve group-size independence and all equipment/bait modifiers.
create or replace function app_private.pick_habitat_group(
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
   when 'home' then 45*greatest(p_home_multiplier,0.001)*case when p_rod_region=p_region then 1.1 else 1 end
   when 'shared' then 50 else 5 end,bucket limit 1
 )
 select c.id from candidates c join selected g using(bucket)
 order by -ln(greatest(random(),1e-15))/(
  case when c.bucket='away' and c.native_region_id=p_rod_region then 3 else 1 end
  *case when p_rarity_fallback then case c.rarity when 'common' then 7700 when 'rare' then 2000 when 'epic' then 270 else 30 end else 1 end
 ),c.id limit 1
$$;
revoke all on function app_private.pick_habitat_group(text[],text,text,numeric,boolean) from public,anon,authenticated;
commit;
