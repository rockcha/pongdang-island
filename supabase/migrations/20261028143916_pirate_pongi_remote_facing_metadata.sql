-- Preserve the local schema and support the optional existing remote column.
begin;
do $body$
begin
  if exists (
    select 1 from information_schema.columns
    where table_schema = 'public' and table_name = 'collectible_species'
      and column_name = 'facing_direction'
  ) then
    execute $sql$
      update public.collectible_species
      set facing_direction = 'right'
      where id in (
        'plunder-black-sail-captain-pongi',
        'plunder-safecracker-pongi',
        'plunder-red-knot-bosun-pongi'
      ) and facing_direction is distinct from 'right'
    $sql$;
  end if;
end
$body$;
commit;
