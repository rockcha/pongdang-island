-- Generated from supabase/catalog/catalog.json. Review before migration deployment.
begin;
set constraints all deferred;
insert into public.collectible_species ("id","kind","name","description","swim_y_min","swim_y_max","speed","size","rarity","thumbnail_path","sell_price","sprite_sheet_path","native_region_id","movement_type","flip_with_direction","travel_direction") values
('nyamnyam-pongi-donut-float','fish','도넛 튜브 퐁이','딸기 초콜릿 도넛 튜브를 끼고 우유병을 품에 안은 퐁이. 작은 발과 넓은 꼬리로 물을 저으며 냠냠 한상바다의 달콤한 물결을 즐겨요.','0.12','0.56','0.027',112,'epic','fish/epic/nyamnyam-pongi-donut-float_v1_thumbnail.png',910,'fish/epic/nyamnyam-pongi-donut-float_v1_sprite.png','nyamnyam','swim',true,'both'),
('nyamnyam-pongi-little-baker','fish','꼬마 제빵사 퐁이','폭신한 제빵 모자와 연둣빛 앞치마를 입은 퐁이. 갓 구운 빵 바구니와 바게트를 꼭 안고 냠냠 한상바다의 바닥을 바삐 걸어 다녀요.','0.90','0.96','0.017',112,'epic','fish/epic/nyamnyam-pongi-little-baker_v1_thumbnail.png',920,'fish/epic/nyamnyam-pongi-little-baker_v1_sprite.png','nyamnyam','crawl',true,'both'),
('nyamnyam-pongi-popcorn-courier','fish','팝콘 배달부 퐁이','빨간 줄무늬 팝콘 통을 꼭 안고 배달하는 퐁이. 머리 위 팝콘 한 알이 떨어지지 않도록 조심하며 냠냠 한상바다를 헤엄쳐요.','0.22','0.68','0.032',112,'epic','fish/epic/nyamnyam-pongi-popcorn-courier_v1_thumbnail.png',900,'fish/epic/nyamnyam-pongi-popcorn-courier_v1_sprite.png','nyamnyam','swim',true,'both')
on conflict(id) do update set "kind"=excluded."kind","name"=excluded."name","description"=excluded."description","swim_y_min"=excluded."swim_y_min","swim_y_max"=excluded."swim_y_max","speed"=excluded."speed","size"=excluded."size","rarity"=excluded."rarity","thumbnail_path"=excluded."thumbnail_path","sell_price"=excluded."sell_price","sprite_sheet_path"=excluded."sprite_sheet_path","native_region_id"=excluded."native_region_id","movement_type"=excluded."movement_type","flip_with_direction"=excluded."flip_with_direction","travel_direction"=excluded."travel_direction";
delete from public.collectible_habitats where species_id in ('nyamnyam-pongi-donut-float','nyamnyam-pongi-little-baker','nyamnyam-pongi-popcorn-courier');
insert into public.collectible_habitats(species_id,region_id) values
('nyamnyam-pongi-donut-float','nyamnyam'),
('nyamnyam-pongi-little-baker','nyamnyam'),
('nyamnyam-pongi-popcorn-courier','nyamnyam');
notify pgrst, 'reload schema';
commit;
