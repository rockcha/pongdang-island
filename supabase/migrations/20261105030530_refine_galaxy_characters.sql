-- Generated from supabase/catalog/catalog.json. Review before migration deployment.
begin;
set constraints all deferred;
insert into public.collectible_species ("id","kind","name","description","swim_y_min","swim_y_max","speed","size","rarity","thumbnail_path","sell_price","sprite_sheet_path","native_region_id","movement_type","flip_with_direction","travel_direction","weather_type") values
('galaxy-apocalypsis','fish','멸망의 집행자, 아포칼립시스','부서진 행성을 갑옷처럼 두른 거대한 우주 기사','0.80','0.88','0.024',165,'mythic','fish/mythic/galaxy-apocalypsis_v1_thumbnail.png',3300,'fish/mythic/galaxy-apocalypsis_swim8_v1_sprite.png','galaxy','fixed',false,'both',null)
on conflict(id) do update set "kind"=excluded."kind","name"=excluded."name","description"=excluded."description","swim_y_min"=excluded."swim_y_min","swim_y_max"=excluded."swim_y_max","speed"=excluded."speed","size"=excluded."size","rarity"=excluded."rarity","thumbnail_path"=excluded."thumbnail_path","sell_price"=excluded."sell_price","sprite_sheet_path"=excluded."sprite_sheet_path","native_region_id"=excluded."native_region_id","movement_type"=excluded."movement_type","flip_with_direction"=excluded."flip_with_direction","travel_direction"=excluded."travel_direction","weather_type"=excluded."weather_type";
delete from public.collectible_habitats where species_id in ('galaxy-apocalypsis');
insert into public.collectible_habitats(species_id,region_id) values
('galaxy-apocalypsis','galaxy');
notify pgrst, 'reload schema';
commit;
