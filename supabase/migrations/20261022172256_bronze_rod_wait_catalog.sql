-- Generated from supabase/catalog/catalog.json. Review before migration deployment.
begin;
set constraints all deferred;
insert into public.fishing_rods ("id","name","price","region_id","failure_reduction_bp","native_bonus_bp","wait_reduction_seconds") values
('bronze','청동 낚싯대',400,null,0,0,1)
on conflict(id) do update set "name"=excluded."name","price"=excluded."price","region_id"=excluded."region_id","failure_reduction_bp"=excluded."failure_reduction_bp","native_bonus_bp"=excluded."native_bonus_bp","wait_reduction_seconds"=excluded."wait_reduction_seconds";
notify pgrst, 'reload schema';
commit;
