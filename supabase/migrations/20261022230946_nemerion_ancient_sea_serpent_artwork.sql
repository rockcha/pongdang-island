-- Generated from supabase/catalog/catalog.json. Review before migration deployment.
begin;
set constraints all deferred;
insert into public.collectible_species ("id","kind","name","description","swim_y_min","swim_y_max","speed","size","rarity","thumbnail_path","sell_price","sprite_sheet_path","native_region_id","movement_type","flip_with_direction","travel_direction") values
('primal-nemerion-last-ocean-heir','fish','사라진 대양의 마지막 후예, 네메리온','사라진 대양의 기억을 품은 거대한 고대 바다뱀. 길고 육중한 몸을 따라 파동을 흘려 유영하다가, 몸을 크게 굽혔다 펴며 태고의 물결을 일으킵니다.','0.28','0.84','0.014',178,'mythic','fish/mythic/primal-nemerion-last-ocean-heir_v2_thumbnail.png',3022,'fish/mythic/primal-nemerion-last-ocean-heir_v2_sprite.png','primal','swim',true,'both')
on conflict(id) do update set "kind"=excluded."kind","name"=excluded."name","description"=excluded."description","swim_y_min"=excluded."swim_y_min","swim_y_max"=excluded."swim_y_max","speed"=excluded."speed","size"=excluded."size","rarity"=excluded."rarity","thumbnail_path"=excluded."thumbnail_path","sell_price"=excluded."sell_price","sprite_sheet_path"=excluded."sprite_sheet_path","native_region_id"=excluded."native_region_id","movement_type"=excluded."movement_type","flip_with_direction"=excluded."flip_with_direction","travel_direction"=excluded."travel_direction";
delete from public.collectible_habitats where species_id in ('primal-nemerion-last-ocean-heir');
insert into public.collectible_habitats(species_id,region_id) values
('primal-nemerion-last-ocean-heir','primal');
notify pgrst, 'reload schema';
commit;
