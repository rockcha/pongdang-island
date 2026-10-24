-- Generated from supabase/catalog/catalog.json. Review before migration deployment.
begin;
set constraints all deferred;
insert into public.harbor_vessels ("id","name","price","duration_minutes","fuel_cost","fishing_count","sprite_path","sort_order","fishing_count_max","catch_bait_id","native_bonus","catch_rule") values
('duck-float','둥실 오리배',400,80,0,1,'https://ewafafphiovbpjwogwzn.supabase.co/storage/v1/object/public/collectibles/vessels/duck-float.png',19,3,'bait',false,'{"version":2,"success_bp":7000,"common_bp":8320,"rare_bp":1500,"epic_bp":150,"mythic_bp":30,"kind":"mixed","trash_bp":7000,"discovery_weight":1,"home_multiplier":1}'::jsonb),
('paper-sail','종이돛 보트',400,20,0,1,'https://ewafafphiovbpjwogwzn.supabase.co/storage/v1/object/public/collectibles/vessels/paper-sail.png',17,null,'bait',false,'{"version":2,"success_bp":5000,"common_bp":8320,"rare_bp":1500,"epic_bp":150,"mythic_bp":30,"kind":"mixed","trash_bp":7000,"discovery_weight":1,"home_multiplier":1}'::jsonb),
('tiny-puffer','꼬마 통통배',500,40,1,2,'https://ewafafphiovbpjwogwzn.supabase.co/storage/v1/object/public/collectibles/vessels/tiny-puffer.png',14,3,'bait',false,'{"version":2,"success_bp":6000,"common_bp":8320,"rare_bp":1500,"epic_bp":150,"mythic_bp":30,"kind":"mixed","trash_bp":7000,"discovery_weight":1,"home_multiplier":1}'::jsonb)
on conflict(id) do update set "name"=excluded."name","price"=excluded."price","duration_minutes"=excluded."duration_minutes","fuel_cost"=excluded."fuel_cost","fishing_count"=excluded."fishing_count","sprite_path"=excluded."sprite_path","sort_order"=excluded."sort_order","fishing_count_max"=excluded."fishing_count_max","catch_bait_id"=excluded."catch_bait_id","native_bonus"=excluded."native_bonus","catch_rule"=excluded."catch_rule";
notify pgrst, 'reload schema';
commit;
