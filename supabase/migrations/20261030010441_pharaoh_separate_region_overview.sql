-- Generated from supabase/catalog/catalog.json. Review before migration deployment.
begin;
set constraints all deferred;
insert into public.regions ("id","name","description","rarity","sort_order","image_path","requires_map_fragment") values
('pharaoh','파라오의 황금해','황금빛 물결 너머로 모래 왕국의 피라미드와 오벨리스크가 솟아 있어요. 잠든 왕릉의 수호자들과 오래된 보물을 만나 보세요.','epic',17,'https://ewafafphiovbpjwogwzn.supabase.co/storage/v1/object/public/collectibles/regions/pharaoh/overview-v2.png',true)
on conflict(id) do update set "name"=excluded."name","description"=excluded."description","rarity"=excluded."rarity","sort_order"=excluded."sort_order","image_path"=excluded."image_path","requires_map_fragment"=excluded."requires_map_fragment";
notify pgrst, 'reload schema';
commit;
