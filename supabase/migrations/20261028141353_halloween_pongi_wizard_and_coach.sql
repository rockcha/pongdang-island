-- Generated from supabase/catalog/catalog.json. Review before migration deployment.
begin;
set constraints all deferred;
insert into public.collectible_species ("id","kind","name","description","swim_y_min","swim_y_max","speed","size","rarity","thumbnail_path","sell_price","sprite_sheet_path","native_region_id","movement_type","flip_with_direction","travel_direction") values
('halloween-pongi-pumpkin-coach','fish','호박 마차 운전사 퐁이','동그란 호박 마차의 운전석에 앉은 퐁이. 잎사귀 추진기를 돌리고 따뜻한 창문 불빛을 밝히며 친구들을 할로윈 잔치로 데려가요.','0.28','0.74','0.029',144,'epic','fish/epic/halloween-pongi-pumpkin-coach_v1_thumbnail.png',1260,'fish/epic/halloween-pongi-pumpkin-coach_v1_sprite.png',null,'swim',true,'both'),
('halloween-pongi-wizard-broom','fish','물살 가르는 꼬마 마법사 퐁이','끝이 접힌 마법사 모자와 청록 망토를 두른 퐁이. 빗자루를 꼭 붙잡고 모자가 날아가지 않게 누르며 할로윈의 물살을 씩씩하게 헤쳐 나가요.','0.18','0.65','0.041',128,'epic','fish/epic/halloween-pongi-wizard-broom_v1_thumbnail.png',1240,'fish/epic/halloween-pongi-wizard-broom_v1_sprite.png',null,'swim',true,'both')
on conflict(id) do update set "kind"=excluded."kind","name"=excluded."name","description"=excluded."description","swim_y_min"=excluded."swim_y_min","swim_y_max"=excluded."swim_y_max","speed"=excluded."speed","size"=excluded."size","rarity"=excluded."rarity","thumbnail_path"=excluded."thumbnail_path","sell_price"=excluded."sell_price","sprite_sheet_path"=excluded."sprite_sheet_path","native_region_id"=excluded."native_region_id","movement_type"=excluded."movement_type","flip_with_direction"=excluded."flip_with_direction","travel_direction"=excluded."travel_direction";
delete from public.collectible_habitats where species_id in ('halloween-pongi-pumpkin-coach','halloween-pongi-wizard-broom');
insert into public.collectible_habitats(species_id,region_id) values
('halloween-pongi-pumpkin-coach','bluegrove'),
('halloween-pongi-pumpkin-coach','cloudferry'),
('halloween-pongi-pumpkin-coach','coral'),
('halloween-pongi-pumpkin-coach','dreamabyss'),
('halloween-pongi-pumpkin-coach','mechsanctum'),
('halloween-pongi-pumpkin-coach','mistmoon'),
('halloween-pongi-pumpkin-coach','mukhyang'),
('halloween-pongi-pumpkin-coach','nyamnyam'),
('halloween-pongi-pumpkin-coach','plunder'),
('halloween-pongi-pumpkin-coach','pongdang'),
('halloween-pongi-pumpkin-coach','primal'),
('halloween-pongi-pumpkin-coach','scrapisle'),
('halloween-pongi-pumpkin-coach','siren'),
('halloween-pongi-pumpkin-coach','starruins'),
('halloween-pongi-pumpkin-coach','whitenight'),
('halloween-pongi-wizard-broom','bluegrove'),
('halloween-pongi-wizard-broom','cloudferry'),
('halloween-pongi-wizard-broom','coral'),
('halloween-pongi-wizard-broom','dreamabyss'),
('halloween-pongi-wizard-broom','mechsanctum'),
('halloween-pongi-wizard-broom','mistmoon'),
('halloween-pongi-wizard-broom','mukhyang'),
('halloween-pongi-wizard-broom','nyamnyam'),
('halloween-pongi-wizard-broom','plunder'),
('halloween-pongi-wizard-broom','pongdang'),
('halloween-pongi-wizard-broom','primal'),
('halloween-pongi-wizard-broom','scrapisle'),
('halloween-pongi-wizard-broom','siren'),
('halloween-pongi-wizard-broom','starruins'),
('halloween-pongi-wizard-broom','whitenight');
notify pgrst, 'reload schema';
commit;
