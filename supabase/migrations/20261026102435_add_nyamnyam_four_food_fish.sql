-- Generated from supabase/catalog/catalog.json. Review before migration deployment.
begin;
set constraints all deferred;
insert into public.collectible_species ("id","kind","name","description","swim_y_min","swim_y_max","speed","size","rarity","thumbnail_path","sell_price","sprite_sheet_path","native_region_id","movement_type","flip_with_direction","travel_direction") values
('nyamnyam-eggroll-medaka','fish','계란말이 송사리','노란 계란말이 몸통에 파잎 같은 지느러미가 달린 작은 송사리예요. 물살을 가르면 포근한 달걀빛이 반짝여요.','0.20','0.62','0.025',60,'common','fish/normal/nyamnyam-eggroll-medaka_v1_thumbnail.png',30,'fish/normal/nyamnyam-eggroll-medaka_v1_sprite.png','nyamnyam','swim',true,'both'),
('nyamnyam-omurice-goldfish','fish','오므라이스 금붕어','노란 달걀옷에 케첩 무늬를 두른 금붕어예요. 볶음밥빛 비늘과 풍성한 꼬리가 한상바다를 환하게 물들여요.','0.22','0.72','0.017',85,'rare','fish/rare/nyamnyam-omurice-goldfish_v1_thumbnail.png',220,'fish/rare/nyamnyam-omurice-goldfish_v1_sprite.png','nyamnyam','swim',true,'both'),
('nyamnyam-pancake-flounder','fish','팬케이크 가자미','노릇한 팬케이크 몸 위에 버터 한 조각을 얹은 가자미예요. 메이플 시럽빛 무늬를 반짝이며 바닥 가까이 느긋하게 헤엄쳐요.','0.68','0.88','0.013',83,'rare','fish/rare/nyamnyam-pancake-flounder_v1_thumbnail.png',240,'fish/rare/nyamnyam-pancake-flounder_v1_sprite.png','nyamnyam','swim',true,'both'),
('nyamnyam-sausage-puffer','fish','소시지 문어복','탱글한 소시지 몸에 문어 모양으로 갈라진 꼬리를 달고 헤엄쳐요. 통통한 배에는 작은 복어의 용기가 가득해요.','0.35','0.78','0.018',67,'common','fish/normal/nyamnyam-sausage-puffer_v1_thumbnail.png',33,'fish/normal/nyamnyam-sausage-puffer_v1_sprite.png','nyamnyam','swim',true,'both')
on conflict(id) do update set "kind"=excluded."kind","name"=excluded."name","description"=excluded."description","swim_y_min"=excluded."swim_y_min","swim_y_max"=excluded."swim_y_max","speed"=excluded."speed","size"=excluded."size","rarity"=excluded."rarity","thumbnail_path"=excluded."thumbnail_path","sell_price"=excluded."sell_price","sprite_sheet_path"=excluded."sprite_sheet_path","native_region_id"=excluded."native_region_id","movement_type"=excluded."movement_type","flip_with_direction"=excluded."flip_with_direction","travel_direction"=excluded."travel_direction";
delete from public.collectible_habitats where species_id in ('nyamnyam-eggroll-medaka','nyamnyam-omurice-goldfish','nyamnyam-pancake-flounder','nyamnyam-sausage-puffer');
insert into public.collectible_habitats(species_id,region_id) values
('nyamnyam-eggroll-medaka','nyamnyam'),
('nyamnyam-omurice-goldfish','nyamnyam'),
('nyamnyam-pancake-flounder','nyamnyam'),
('nyamnyam-sausage-puffer','nyamnyam');
notify pgrst, 'reload schema';
commit;
