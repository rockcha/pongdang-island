-- Generated from supabase/catalog/catalog.json. Review before migration deployment.
begin;
set constraints all deferred;
insert into public.collectible_species ("id","kind","name","description","swim_y_min","swim_y_max","speed","size","rarity","thumbnail_path","sell_price","sprite_sheet_path","native_region_id","movement_type","flip_with_direction","travel_direction") values
('pongi-mobile-treasure-salvager','fish','퐁이 이동식 보물 인양선','작은 크레인으로 바닷속 보물을 건지는 퐁이들의 인양선. 잠수한 퐁이가 줄을 붙잡고 보물상자의 길을 안내한다.','0.22','0.74','0.013',145,'mythic','fish/mythic/pongi-mobile-treasure-salvager_v1_thumbnail.png',3400,'fish/mythic/pongi-mobile-treasure-salvager_v1_sprite.png',null,'swim',true,'both'),
('pongi-turtle-expedition','fish','퐁이 거북이 탐험대','커다란 바다거북과 함께 바다를 누비는 퐁이 탐험대. 지도를 펴고 망원경을 살피며 아직 모르는 항로를 찾아간다.','0.2','0.78','0.011',155,'mythic','fish/mythic/pongi-turtle-expedition_v1_thumbnail.png',3300,'fish/mythic/pongi-turtle-expedition_v1_sprite.png',null,'swim',true,'both')
on conflict(id) do update set "kind"=excluded."kind","name"=excluded."name","description"=excluded."description","swim_y_min"=excluded."swim_y_min","swim_y_max"=excluded."swim_y_max","speed"=excluded."speed","size"=excluded."size","rarity"=excluded."rarity","thumbnail_path"=excluded."thumbnail_path","sell_price"=excluded."sell_price","sprite_sheet_path"=excluded."sprite_sheet_path","native_region_id"=excluded."native_region_id","movement_type"=excluded."movement_type","flip_with_direction"=excluded."flip_with_direction","travel_direction"=excluded."travel_direction";
delete from public.collectible_habitats where species_id in ('pongi-mobile-treasure-salvager','pongi-turtle-expedition');
insert into public.collectible_habitats(species_id,region_id) values
('pongi-mobile-treasure-salvager','bluegrove'),
('pongi-mobile-treasure-salvager','cloudferry'),
('pongi-mobile-treasure-salvager','coral'),
('pongi-mobile-treasure-salvager','dreamabyss'),
('pongi-mobile-treasure-salvager','mistmoon'),
('pongi-mobile-treasure-salvager','mukhyang'),
('pongi-mobile-treasure-salvager','nyamnyam'),
('pongi-mobile-treasure-salvager','pongdang'),
('pongi-mobile-treasure-salvager','primal'),
('pongi-mobile-treasure-salvager','scrapisle'),
('pongi-mobile-treasure-salvager','siren'),
('pongi-mobile-treasure-salvager','starruins'),
('pongi-mobile-treasure-salvager','whitenight'),
('pongi-turtle-expedition','bluegrove'),
('pongi-turtle-expedition','cloudferry'),
('pongi-turtle-expedition','coral'),
('pongi-turtle-expedition','dreamabyss'),
('pongi-turtle-expedition','mistmoon'),
('pongi-turtle-expedition','mukhyang'),
('pongi-turtle-expedition','nyamnyam'),
('pongi-turtle-expedition','pongdang'),
('pongi-turtle-expedition','primal'),
('pongi-turtle-expedition','scrapisle'),
('pongi-turtle-expedition','siren'),
('pongi-turtle-expedition','starruins'),
('pongi-turtle-expedition','whitenight');
notify pgrst, 'reload schema';
commit;
