-- Generated from supabase/catalog/catalog.json. Review before migration deployment.
begin;
set constraints all deferred;
insert into public.collectible_species ("id","kind","name","description","swim_y_min","swim_y_max","speed","size","rarity","thumbnail_path","sell_price","sprite_sheet_path","native_region_id","movement_type","flip_with_direction","travel_direction") values
('pharaoh-solar-scarab','fish','천년왕조의 마지막 유산, 황금가면','거대한 파라오의 황금가면이 공중에 떠 있어요. 눈에서 흘러나오는 푸른 영혼이 천년왕조의 마지막 기억을 품고 있어요.','0.28','0.72','0.008',170,'mythic','fish/mythic/pharaoh-solar-scarab_v3_thumbnail.png',3300,'fish/mythic/pharaoh-solar-scarab_compat_v3_sprite.png','pharaoh','swim',true,'right')
on conflict(id) do update set "kind"=excluded."kind","name"=excluded."name","description"=excluded."description","swim_y_min"=excluded."swim_y_min","swim_y_max"=excluded."swim_y_max","speed"=excluded."speed","size"=excluded."size","rarity"=excluded."rarity","thumbnail_path"=excluded."thumbnail_path","sell_price"=excluded."sell_price","sprite_sheet_path"=excluded."sprite_sheet_path","native_region_id"=excluded."native_region_id","movement_type"=excluded."movement_type","flip_with_direction"=excluded."flip_with_direction","travel_direction"=excluded."travel_direction";
delete from public.collectible_habitats where species_id in ('pharaoh-solar-scarab');
insert into public.collectible_habitats(species_id,region_id) values
('pharaoh-solar-scarab','pharaoh');
notify pgrst, 'reload schema';
commit;
