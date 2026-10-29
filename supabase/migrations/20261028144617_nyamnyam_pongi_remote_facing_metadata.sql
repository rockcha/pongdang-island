begin;

-- The legacy production project has facing_direction; the replayed local
-- schema does not. Preserve that difference and update only reviewed artwork.
do $migration$
begin
  if exists (
    select 1 from information_schema.columns
    where table_schema = 'public' and table_name = 'collectible_species'
      and column_name = 'facing_direction'
  ) then
    update public.collectible_species
    set facing_direction = 'right'
    where id in (
      'nyamnyam-pongi-donut-float',
      'nyamnyam-pongi-little-baker',
      'nyamnyam-pongi-popcorn-courier'
    ) and facing_direction is distinct from 'right';
  end if;
end
$migration$;

commit;
