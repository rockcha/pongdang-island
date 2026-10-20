-- Catalog source: supabase/catalog/catalog.json (fishing_baits).
-- Reviewed catalog output narrowed to the one authorized sale-state change.
-- Restore through a new catalog migration when sales resume.
begin;
do $$
begin
 update public.fishing_baits set price=null where id='bait_magnet';
 if not found then raise exception 'BAIT_MAGNET_NOT_FOUND'; end if;
end $$;
notify pgrst, 'reload schema';
commit;
