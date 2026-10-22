-- Generated from supabase/catalog/catalog.json. Review before migration deployment.
begin;
set constraints all deferred;
insert into public.regions ("id","name","description","rarity","sort_order","image_path","requires_map_fragment") values
('nyamnyam','냠냠 한상바다','만두섬과 김밥 절벽, 계란 등대가 펼쳐진 맛있는 바다. 음식의 모습을 닮은 바다 친구들이 찾아올 따뜻한 한 상이에요.','rare',13,'nyamnyam/scenery-v2.png',true)
on conflict(id) do update set "name"=excluded."name","description"=excluded."description","rarity"=excluded."rarity","sort_order"=excluded."sort_order","image_path"=excluded."image_path","requires_map_fragment"=excluded."requires_map_fragment";
insert into public.fishing_map_blueprints ("region_id","piece_count","thumbnail_path","enabled") values
('nyamnyam',4,'https://ewafafphiovbpjwogwzn.supabase.co/storage/v1/object/public/regions/nyamnyam/map-v2.png',true)
on conflict(region_id) do update set "piece_count"=excluded."piece_count","thumbnail_path"=excluded."thumbnail_path","enabled"=excluded."enabled";
notify pgrst, 'reload schema';
commit;
