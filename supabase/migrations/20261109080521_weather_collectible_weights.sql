begin;

-- Weight is relative only within the independent 3% weather pool.
-- Existing species retain equal weight; spirits use one unit against two.
alter table public.collectible_species
 add column weather_weight smallint not null default 2
 constraint collectible_species_weather_weight_check check (weather_weight between 1 and 10000);

create or replace function app_private.pick_weather_collectible(
 p_kind text,p_at timestamptz,p_roll double precision default null
) returns text language plpgsql set search_path='' as $$
declare v_roll double precision;v_id text;
begin
 if p_kind is null or p_at is null then return null;end if;
 v_roll:=coalesce(p_roll,random());
 if v_roll<0 or v_roll>=1 then raise exception 'INVALID_WEATHER_ROLL';end if;
 if v_roll>=0.03 then return null;end if;
 -- Conditional on a successful draw, roll / .03 is uniform in [0,1).
 -- One ordered cumulative draw preserves the outer probability exactly.
 with eligible as (
  select s.id,s.weather_weight from public.collectible_species s
  where s.weather_type=p_kind and s.kind in ('fish','trash','decoration')
   and not exists (select 1 from app_private.collectible_event_windows e
    where starts_with(s.id,e.species_prefix) and (p_at<e.starts_at or p_at>=e.ends_at))
 ), weighted as (
  select id,sum(weather_weight) over(order by id rows unbounded preceding) as upper_weight,
   sum(weather_weight) over() as total_weight from eligible
 )
 select id into v_id from weighted
 where upper_weight::double precision>(v_roll/0.03)*total_weight::double precision
 order by id limit 1;
 return v_id;
end $$;

-- CREATE OR REPLACE retains the existing private invoker boundary and ACL.
notify pgrst,'reload schema';
commit;
