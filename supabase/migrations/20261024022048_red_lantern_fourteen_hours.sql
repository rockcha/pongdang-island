-- Generated from supabase/catalog/catalog.json. Review before migration deployment.
begin;
set constraints all deferred;
insert into public.harbor_vessels ("id","name","price","duration_minutes","fuel_cost","fishing_count","sprite_path","sort_order","fishing_count_max","catch_bait_id","native_bonus","catch_rule") values
('red-lantern','홍등 야간어선',3400,840,10,9,'https://ewafafphiovbpjwogwzn.supabase.co/storage/v1/object/public/collectibles/vessels/red-lantern.png',22,null,'bait_special',false,'{"version":2,"success_bp":8000,"common_bp":0,"rare_bp":9870,"epic_bp":100,"mythic_bp":30,"kind":"mixed","trash_bp":7000,"discovery_weight":1,"home_multiplier":1}'::jsonb)
on conflict(id) do update set "name"=excluded."name","price"=excluded."price","duration_minutes"=excluded."duration_minutes","fuel_cost"=excluded."fuel_cost","fishing_count"=excluded."fishing_count","sprite_path"=excluded."sprite_path","sort_order"=excluded."sort_order","fishing_count_max"=excluded."fishing_count_max","catch_bait_id"=excluded."catch_bait_id","native_bonus"=excluded."native_bonus","catch_rule"=excluded."catch_rule";
notify pgrst, 'reload schema';
commit;
