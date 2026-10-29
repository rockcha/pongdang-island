-- Compatibility with the direction column currently present only on the target
-- remote project. This is a no-op on the locally replayed expected schema.
do $firefly_direction$
begin
 if exists(select 1 from information_schema.columns where table_schema='public' and table_name='collectible_species' and column_name='facing_direction') then
  execute $metadata$update public.collectible_species set facing_direction='right' where native_region_id='firefly' and kind='fish'$metadata$;
 end if;
end;
$firefly_direction$;
