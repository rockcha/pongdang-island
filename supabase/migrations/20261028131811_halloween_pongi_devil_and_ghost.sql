-- Generated from supabase/catalog/catalog.json. Review before migration deployment.
begin;
set constraints all deferred;
insert into public.collectible_species ("id","kind","name","description","swim_y_min","swim_y_max","speed","size","rarity","thumbnail_path","sell_price","sprite_sheet_path","native_region_id","movement_type","flip_with_direction","travel_direction") values
('halloween-pongi-candy-devil','fish','사탕 배달부 꼬마 악마 퐁이','작은 악마 뿔과 박쥐 망토를 두른 퐁이. 호박 가방 속 사탕을 두 팔로 꼭 안고, 친구들에게 달콤한 할로윈을 배달하러 물살을 헤쳐 나가요.','0.25','0.68','0.034',120,'epic','fish/epic/halloween-pongi-candy-devil_v1_thumbnail.png',1240,'fish/epic/halloween-pongi-candy-devil_v1_sprite.png',null,'swim',true,'both'),
('halloween-pongi-ghost-blanket','fish','유령 이불 속 퐁이','하얀 이불을 뒤집어쓰고 유령인 척하는 퐁이. 분홍 불가사리와 동그란 얼굴이 빼꼼 보이고, 이불 끝은 물살을 따라 부드럽게 나부껴요.','0.12','0.55','0.027',120,'epic','fish/epic/halloween-pongi-ghost-blanket_v1_thumbnail.png',1220,'fish/epic/halloween-pongi-ghost-blanket_v1_sprite.png',null,'swim',true,'both')
on conflict(id) do update set "kind"=excluded."kind","name"=excluded."name","description"=excluded."description","swim_y_min"=excluded."swim_y_min","swim_y_max"=excluded."swim_y_max","speed"=excluded."speed","size"=excluded."size","rarity"=excluded."rarity","thumbnail_path"=excluded."thumbnail_path","sell_price"=excluded."sell_price","sprite_sheet_path"=excluded."sprite_sheet_path","native_region_id"=excluded."native_region_id","movement_type"=excluded."movement_type","flip_with_direction"=excluded."flip_with_direction","travel_direction"=excluded."travel_direction";
delete from public.collectible_habitats where species_id in ('halloween-pongi-candy-devil','halloween-pongi-ghost-blanket');
insert into public.collectible_habitats(species_id,region_id) values
('halloween-pongi-candy-devil','bluegrove'),
('halloween-pongi-candy-devil','cloudferry'),
('halloween-pongi-candy-devil','coral'),
('halloween-pongi-candy-devil','dreamabyss'),
('halloween-pongi-candy-devil','mechsanctum'),
('halloween-pongi-candy-devil','mistmoon'),
('halloween-pongi-candy-devil','mukhyang'),
('halloween-pongi-candy-devil','nyamnyam'),
('halloween-pongi-candy-devil','plunder'),
('halloween-pongi-candy-devil','pongdang'),
('halloween-pongi-candy-devil','primal'),
('halloween-pongi-candy-devil','scrapisle'),
('halloween-pongi-candy-devil','siren'),
('halloween-pongi-candy-devil','starruins'),
('halloween-pongi-candy-devil','whitenight'),
('halloween-pongi-ghost-blanket','bluegrove'),
('halloween-pongi-ghost-blanket','cloudferry'),
('halloween-pongi-ghost-blanket','coral'),
('halloween-pongi-ghost-blanket','dreamabyss'),
('halloween-pongi-ghost-blanket','mechsanctum'),
('halloween-pongi-ghost-blanket','mistmoon'),
('halloween-pongi-ghost-blanket','mukhyang'),
('halloween-pongi-ghost-blanket','nyamnyam'),
('halloween-pongi-ghost-blanket','plunder'),
('halloween-pongi-ghost-blanket','pongdang'),
('halloween-pongi-ghost-blanket','primal'),
('halloween-pongi-ghost-blanket','scrapisle'),
('halloween-pongi-ghost-blanket','siren'),
('halloween-pongi-ghost-blanket','starruins'),
('halloween-pongi-ghost-blanket','whitenight');
notify pgrst, 'reload schema';
commit;
