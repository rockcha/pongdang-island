-- Reviewed catalog diff: only the new primal region and map; existing rows/habitats are untouched.
begin;
set constraints all deferred;
insert into public.regions ("id","name","description","rarity","sort_order","image_path","requires_map_fragment") values
('primal','태고의 원시섬','거대한 고사리와 화산 안개 너머, 공룡 시대의 바다가 숨 쉬는 섬.','epic',6,'primal.png',true)
on conflict(id) do update set "name"=excluded."name","description"=excluded."description","rarity"=excluded."rarity","sort_order"=excluded."sort_order","image_path"=excluded."image_path","requires_map_fragment"=excluded."requires_map_fragment";
insert into public.collectible_species ("id","kind","name","description","swim_y_min","swim_y_max","speed","size","rarity","thumbnail_path","sell_price","sprite_sheet_path","native_region_id","movement_type","flip_with_direction","travel_direction") values
('map-primal','map','태고의 원시섬 지도 조각','고대 화산과 공룡 발자국의 항로가 그려진 특급 지도 조각.',null,null,'0',60,'epic','map/epic/map-primal_thumbnail.png',0,null,null,'fixed',false,'both')
on conflict(id) do update set "kind"=excluded."kind","name"=excluded."name","description"=excluded."description","swim_y_min"=excluded."swim_y_min","swim_y_max"=excluded."swim_y_max","speed"=excluded."speed","size"=excluded."size","rarity"=excluded."rarity","thumbnail_path"=excluded."thumbnail_path","sell_price"=excluded."sell_price","sprite_sheet_path"=excluded."sprite_sheet_path","native_region_id"=excluded."native_region_id","movement_type"=excluded."movement_type","flip_with_direction"=excluded."flip_with_direction","travel_direction"=excluded."travel_direction";
insert into public.collectible_habitats(species_id,region_id) values ('map-primal','primal') on conflict do nothing;
insert into public.fishing_rods(id,name,price,region_id,failure_reduction_bp,native_bonus_bp)
values ('primal','호박화석 낚싯대',1500,'primal',200,200)
on conflict(id) do update set name=excluded.name,price=excluded.price,region_id=excluded.region_id,failure_reduction_bp=excluded.failure_reduction_bp,native_bonus_bp=excluded.native_bonus_bp;
notify pgrst,'reload schema';
commit;
