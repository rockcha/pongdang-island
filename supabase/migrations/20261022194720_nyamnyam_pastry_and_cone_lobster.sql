-- Generated from supabase/catalog/catalog.json. Review before migration deployment.
begin;
set constraints all deferred;
insert into public.collectible_species ("id","kind","name","description","swim_y_min","swim_y_max","speed","size","rarity","thumbnail_path","sell_price","sprite_sheet_path","native_region_id","movement_type","flip_with_direction","travel_direction") values
('nyamnyam-bungeoppang-fish','fish','붕어빵피쉬','노릇한 붕어빵 몸속에 달콤한 팥앙금을 가득 품었어요.','0.22','0.78','0.025',94,'rare','fish/rare/nyamnyam-bungeoppang-fish_v1_thumbnail.png',304,'fish/rare/nyamnyam-bungeoppang-fish_v1_sprite.png','nyamnyam','swim',true,'both'),
('nyamnyam-vanilla-cone-lobster','fish','바닐라콘 랍스터','바닐라 아이스크림콘에 쏙 들어가 집게와 작은 다리로 바닷바닥을 걸어요.','0.84','0.97','0.009',94,'rare','fish/rare/nyamnyam-vanilla-cone-lobster_v1_thumbnail.png',316,'fish/rare/nyamnyam-vanilla-cone-lobster_v1_sprite.png','nyamnyam','crawl',true,'both')
on conflict(id) do update set "kind"=excluded."kind","name"=excluded."name","description"=excluded."description","swim_y_min"=excluded."swim_y_min","swim_y_max"=excluded."swim_y_max","speed"=excluded."speed","size"=excluded."size","rarity"=excluded."rarity","thumbnail_path"=excluded."thumbnail_path","sell_price"=excluded."sell_price","sprite_sheet_path"=excluded."sprite_sheet_path","native_region_id"=excluded."native_region_id","movement_type"=excluded."movement_type","flip_with_direction"=excluded."flip_with_direction","travel_direction"=excluded."travel_direction";
delete from public.collectible_habitats where species_id in ('nyamnyam-bungeoppang-fish','nyamnyam-vanilla-cone-lobster');
insert into public.collectible_habitats(species_id,region_id) values
('nyamnyam-bungeoppang-fish','nyamnyam'),
('nyamnyam-vanilla-cone-lobster','nyamnyam');
notify pgrst, 'reload schema';
commit;
