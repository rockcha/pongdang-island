begin;
create or replace function app_private.collectible_habitat_weight(p_primary_region text,p_region text)
returns numeric language sql immutable set search_path='' as $$
 select case when p_primary_region is null then 1::numeric
  when p_primary_region=p_region then 2::numeric else 0.05::numeric end
$$;
-- Preserve the regional rod's additive bonus (+0.2 at home, +0.1 away).
create or replace function app_private.rod_habitat_weight(p_primary_region text,p_region text,p_rod_region text)
returns numeric language sql immutable set search_path='' as $$
 select case when p_primary_region is not null and p_primary_region=p_rod_region
  then case when p_primary_region=p_region then 2.2::numeric else 0.15::numeric end
  else app_private.collectible_habitat_weight(p_primary_region,p_region) end
$$;
notify pgrst,'reload schema';
commit;
