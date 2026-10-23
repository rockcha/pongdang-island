-- Generated from supabase/catalog/catalog.json. Review before migration deployment.
begin;
set constraints all deferred;
alter table public.fishing_rods drop constraint fishing_rods_wait_reduction_seconds_check;
alter table public.fishing_rods add constraint fishing_rods_wait_reduction_seconds_check check(wait_reduction_seconds between 0 and 3);
insert into public.fishing_rods ("id","name","price","region_id","failure_reduction_bp","native_bonus_bp","wait_reduction_seconds") values
('swift','쏜살 낚싯대',1800,null,0,0,3)
on conflict(id) do update set "name"=excluded."name","price"=excluded."price","region_id"=excluded."region_id","failure_reduction_bp"=excluded."failure_reduction_bp","native_bonus_bp"=excluded."native_bonus_bp","wait_reduction_seconds"=excluded."wait_reduction_seconds";
notify pgrst, 'reload schema';
commit;
