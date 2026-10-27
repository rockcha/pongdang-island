-- Generated from supabase/catalog/catalog.json. Review before migration deployment.
begin;
set constraints all deferred;
insert into public.collectible_species ("id","kind","name","description","swim_y_min","swim_y_max","speed","size","rarity","thumbnail_path","sell_price","sprite_sheet_path","native_region_id","movement_type","flip_with_direction","travel_direction") values
('shared-clown-triggerfish','fish','클라운 트리거피시','검은 몸의 큼직한 흰 물방울무늬와 노란 입술이 눈길을 끄는 쥐치예요.','0.2','0.77','0.024',55,'common','fish/normal/shared-clown-triggerfish_v1_thumbnail.png',48,'fish/normal/shared-clown-triggerfish_v1_sprite.png',null,'swim',true,'both'),
('shared-flame-angelfish','fish','플레임 엔젤피시','붉은 주황빛 몸에 검은 세로줄과 푸른 지느러미 끝이 선명한 산호초 물고기예요.','0.2','0.77','0.028',51,'common','fish/normal/shared-flame-angelfish_v1_thumbnail.png',50,'fish/normal/shared-flame-angelfish_v1_sprite.png',null,'swim',true,'both'),
('shared-royal-gramma','fish','로열 그라마','보랏빛 머리에서 황금빛 꼬리로 이어지는 두 가지 색이 매력적인 작은 물고기예요.','0.2','0.77','0.025',48,'common','fish/normal/shared-royal-gramma_v1_thumbnail.png',55,'fish/normal/shared-royal-gramma_v1_sprite.png',null,'swim',true,'both')
on conflict(id) do update set "kind"=excluded."kind","name"=excluded."name","description"=excluded."description","swim_y_min"=excluded."swim_y_min","swim_y_max"=excluded."swim_y_max","speed"=excluded."speed","size"=excluded."size","rarity"=excluded."rarity","thumbnail_path"=excluded."thumbnail_path","sell_price"=excluded."sell_price","sprite_sheet_path"=excluded."sprite_sheet_path","native_region_id"=excluded."native_region_id","movement_type"=excluded."movement_type","flip_with_direction"=excluded."flip_with_direction","travel_direction"=excluded."travel_direction";
delete from public.collectible_habitats where species_id in ('shared-clown-triggerfish','shared-flame-angelfish','shared-royal-gramma');
insert into public.collectible_habitats(species_id,region_id) values
('shared-clown-triggerfish','bluegrove'),
('shared-clown-triggerfish','cloudferry'),
('shared-clown-triggerfish','coral'),
('shared-clown-triggerfish','dreamabyss'),
('shared-clown-triggerfish','mistmoon'),
('shared-clown-triggerfish','mukhyang'),
('shared-clown-triggerfish','nyamnyam'),
('shared-clown-triggerfish','plunder'),
('shared-clown-triggerfish','pongdang'),
('shared-clown-triggerfish','primal'),
('shared-clown-triggerfish','scrapisle'),
('shared-clown-triggerfish','siren'),
('shared-clown-triggerfish','starruins'),
('shared-clown-triggerfish','whitenight'),
('shared-flame-angelfish','bluegrove'),
('shared-flame-angelfish','cloudferry'),
('shared-flame-angelfish','coral'),
('shared-flame-angelfish','dreamabyss'),
('shared-flame-angelfish','mistmoon'),
('shared-flame-angelfish','mukhyang'),
('shared-flame-angelfish','nyamnyam'),
('shared-flame-angelfish','plunder'),
('shared-flame-angelfish','pongdang'),
('shared-flame-angelfish','primal'),
('shared-flame-angelfish','scrapisle'),
('shared-flame-angelfish','siren'),
('shared-flame-angelfish','starruins'),
('shared-flame-angelfish','whitenight'),
('shared-royal-gramma','bluegrove'),
('shared-royal-gramma','cloudferry'),
('shared-royal-gramma','coral'),
('shared-royal-gramma','dreamabyss'),
('shared-royal-gramma','mistmoon'),
('shared-royal-gramma','mukhyang'),
('shared-royal-gramma','nyamnyam'),
('shared-royal-gramma','plunder'),
('shared-royal-gramma','pongdang'),
('shared-royal-gramma','primal'),
('shared-royal-gramma','scrapisle'),
('shared-royal-gramma','siren'),
('shared-royal-gramma','starruins'),
('shared-royal-gramma','whitenight');
notify pgrst, 'reload schema';
commit;
