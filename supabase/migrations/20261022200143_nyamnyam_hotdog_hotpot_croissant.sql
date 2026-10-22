-- Generated from supabase/catalog/catalog.json. Review before migration deployment.
begin;
set constraints all deferred;
insert into public.collectible_species ("id","kind","name","description","swim_y_min","swim_y_max","speed","size","rarity","thumbnail_path","sell_price","sprite_sheet_path","native_region_id","movement_type","flip_with_direction","travel_direction") values
('nyamnyam-hotdog-sardine','fish','핫도그 정어리','폭신한 빵 지느러미와 케첩 줄무늬를 뽐내며 재빠르게 헤엄쳐요.','0.18','0.75','0.029',70,'common','fish/normal/nyamnyam-hotdog-sardine_v1_thumbnail.png',54,'fish/normal/nyamnyam-hotdog-sardine_v1_sprite.png','nyamnyam','swim',true,'both'),
('nyamnyam-layered-croissant-nautilus','fish','천겹 크루아상 앵무조개','겹겹이 말린 버터빛 껍데기 아래 부드러운 촉수를 펼쳐 천천히 나아가요.','0.3','0.78','0.013',125,'epic','fish/epic/nyamnyam-layered-croissant-nautilus_v1_thumbnail.png',872,'fish/epic/nyamnyam-layered-croissant-nautilus_v1_sprite.png','nyamnyam','pulse',true,'both'),
('nyamnyam-seafood-hotpot-angler','fish','해물전골 아귀','해물 향이 피어나는 둥근 몸과 국자 모양 유인등으로 바다 친구들을 불러요.','0.45','0.86','0.016',125,'epic','fish/epic/nyamnyam-seafood-hotpot-angler_v1_thumbnail.png',902,'fish/epic/nyamnyam-seafood-hotpot-angler_v1_sprite.png','nyamnyam','swim',true,'both')
on conflict(id) do update set "kind"=excluded."kind","name"=excluded."name","description"=excluded."description","swim_y_min"=excluded."swim_y_min","swim_y_max"=excluded."swim_y_max","speed"=excluded."speed","size"=excluded."size","rarity"=excluded."rarity","thumbnail_path"=excluded."thumbnail_path","sell_price"=excluded."sell_price","sprite_sheet_path"=excluded."sprite_sheet_path","native_region_id"=excluded."native_region_id","movement_type"=excluded."movement_type","flip_with_direction"=excluded."flip_with_direction","travel_direction"=excluded."travel_direction";
delete from public.collectible_habitats where species_id in ('nyamnyam-hotdog-sardine','nyamnyam-layered-croissant-nautilus','nyamnyam-seafood-hotpot-angler');
insert into public.collectible_habitats(species_id,region_id) values
('nyamnyam-hotdog-sardine','nyamnyam'),
('nyamnyam-layered-croissant-nautilus','nyamnyam'),
('nyamnyam-seafood-hotpot-angler','nyamnyam');
notify pgrst, 'reload schema';
commit;
