-- Generated from supabase/catalog/catalog.json. Review before migration deployment.
begin;
set constraints all deferred;
insert into public.fishing_rods ("id","name","price","region_id","failure_reduction_bp","native_bonus_bp","wait_reduction_seconds") values
('loveletter','벚꽃 소인 낚싯대',3000,'loveletter',200,200,1)
on conflict(id) do update set "name"=excluded."name","price"=excluded."price","region_id"=excluded."region_id","failure_reduction_bp"=excluded."failure_reduction_bp","native_bonus_bp"=excluded."native_bonus_bp","wait_reduction_seconds"=excluded."wait_reduction_seconds";
notify pgrst, 'reload schema';
commit;
