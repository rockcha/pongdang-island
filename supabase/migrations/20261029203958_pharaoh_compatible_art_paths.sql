-- Generated from supabase/catalog/catalog.json. Review before migration deployment.
begin;
set constraints all deferred;
insert into public.regions ("id","name","description","rarity","sort_order","image_path","requires_map_fragment") values
('pharaoh','파라오의 황금해','황금빛 물결 너머로 모래 왕국의 피라미드와 오벨리스크가 솟아 있어요. 잠든 왕릉의 수호자들과 오래된 보물을 만나 보세요.','epic',17,'https://ewafafphiovbpjwogwzn.supabase.co/storage/v1/object/public/collectibles/regions/pharaoh/scenery-v1.png',true)
on conflict(id) do update set "name"=excluded."name","description"=excluded."description","rarity"=excluded."rarity","sort_order"=excluded."sort_order","image_path"=excluded."image_path","requires_map_fragment"=excluded."requires_map_fragment";
insert into public.fishing_map_blueprints ("region_id","piece_count","thumbnail_path","enabled","rarity","piece_rarities") values
('pharaoh',4,'https://ewafafphiovbpjwogwzn.supabase.co/storage/v1/object/public/collectibles/regions/pharaoh/map-v1.png',true,'rare','["rare","rare","epic","epic"]'::jsonb)
on conflict(region_id) do update set "piece_count"=excluded."piece_count","thumbnail_path"=excluded."thumbnail_path","enabled"=excluded."enabled","rarity"=excluded."rarity","piece_rarities"=excluded."piece_rarities";
insert into public.collectible_species ("id","kind","name","description","swim_y_min","swim_y_max","speed","size","rarity","thumbnail_path","sell_price","sprite_sheet_path","native_region_id","movement_type","flip_with_direction","travel_direction") values
('pharaoh-gatekeeper-anubis','fish','황금해의 문지기 아누비스','금빛 지팡이를 든 아누비스가 잠든 왕릉의 문을 지켜요.','0.86','0.96','0.009',170,'mythic','fish/mythic/pharaoh-gatekeeper-anubis_v1_thumbnail.png',3500,'fish/mythic/pharaoh-gatekeeper-anubis_compat_v1_sprite.png','pharaoh','crawl',true,'right'),
('pharaoh-gold-wing-horus','fish','황금 날개의 호루스','황금 날개를 펼친 호루스가 눈부신 황금해를 굽어봐요.','0.22','0.76','0.02',170,'mythic','fish/mythic/pharaoh-gold-wing-horus_v1_thumbnail.png',3300,'fish/mythic/pharaoh-gold-wing-horus_compat_v1_sprite.png','pharaoh','swim',true,'right'),
('pharaoh-obelisk-colossus','fish','오벨리스크 거신','모래 속에서 깨어난 거신이에요. 어깨 위 오벨리스크에 태양의 힘이 깃들었어요.','0.86','0.96','0.009',170,'mythic','fish/mythic/pharaoh-obelisk-colossus_v1_thumbnail.png',3500,'fish/mythic/pharaoh-obelisk-colossus_compat_v1_sprite.png','pharaoh','crawl',true,'right'),
('pharaoh-solar-scarab','fish','태양을 굴리는 스카라베','뜨거운 태양을 굴리며 황금해의 새벽을 여는 신성한 스카라베예요.','0.86','0.96','0.009',170,'mythic','fish/mythic/pharaoh-solar-scarab_v1_thumbnail.png',3300,'fish/mythic/pharaoh-solar-scarab_compat_v1_sprite.png','pharaoh','crawl',true,'right')
on conflict(id) do update set "kind"=excluded."kind","name"=excluded."name","description"=excluded."description","swim_y_min"=excluded."swim_y_min","swim_y_max"=excluded."swim_y_max","speed"=excluded."speed","size"=excluded."size","rarity"=excluded."rarity","thumbnail_path"=excluded."thumbnail_path","sell_price"=excluded."sell_price","sprite_sheet_path"=excluded."sprite_sheet_path","native_region_id"=excluded."native_region_id","movement_type"=excluded."movement_type","flip_with_direction"=excluded."flip_with_direction","travel_direction"=excluded."travel_direction";
delete from public.collectible_habitats where species_id in ('pharaoh-gatekeeper-anubis','pharaoh-gold-wing-horus','pharaoh-obelisk-colossus','pharaoh-solar-scarab');
insert into public.collectible_habitats(species_id,region_id) values
('pharaoh-gatekeeper-anubis','pharaoh'),
('pharaoh-gold-wing-horus','pharaoh'),
('pharaoh-obelisk-colossus','pharaoh'),
('pharaoh-solar-scarab','pharaoh');
notify pgrst, 'reload schema';
commit;
