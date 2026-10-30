-- Generated from supabase/catalog/catalog.json. Review before migration deployment.
begin;
set constraints all deferred;
insert into public.collectible_species ("id","kind","name","description","swim_y_min","swim_y_max","speed","size","rarity","thumbnail_path","sell_price","sprite_sheet_path","native_region_id","movement_type","flip_with_direction","travel_direction") values
('pharaoh-obelisk-colossus','fish','오벨리스크 거신','모래 속에서 깨어난 거신이에요. 어깨 위 오벨리스크에 태양의 힘이 깃들었어요.','0.86','0.96','0.009',170,'mythic','fish/mythic/pharaoh-obelisk-colossus_v2_thumbnail.png',3500,'fish/mythic/pharaoh-obelisk-colossus_compat_v2_sprite.png','pharaoh','fixed',true,'right')
on conflict(id) do update set "kind"=excluded."kind","name"=excluded."name","description"=excluded."description","swim_y_min"=excluded."swim_y_min","swim_y_max"=excluded."swim_y_max","speed"=excluded."speed","size"=excluded."size","rarity"=excluded."rarity","thumbnail_path"=excluded."thumbnail_path","sell_price"=excluded."sell_price","sprite_sheet_path"=excluded."sprite_sheet_path","native_region_id"=excluded."native_region_id","movement_type"=excluded."movement_type","flip_with_direction"=excluded."flip_with_direction","travel_direction"=excluded."travel_direction";
delete from public.collectible_habitats where species_id in ('pharaoh-obelisk-colossus');
insert into public.collectible_habitats(species_id,region_id) values
('pharaoh-obelisk-colossus','pharaoh');
notify pgrst, 'reload schema';
commit;
