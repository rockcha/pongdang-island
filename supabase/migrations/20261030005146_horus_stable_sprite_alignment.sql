-- Generated from supabase/catalog/catalog.json. Review before migration deployment.
begin;
set constraints all deferred;
insert into public.collectible_species ("id","kind","name","description","swim_y_min","swim_y_max","speed","size","rarity","thumbnail_path","sell_price","sprite_sheet_path","native_region_id","movement_type","flip_with_direction","travel_direction") values
('pharaoh-gold-wing-horus','fish','황금 날개의 호루스','황금 날개를 펼친 호루스가 눈부신 황금해를 굽어봐요.','0.22','0.76','0.02',170,'mythic','fish/mythic/pharaoh-gold-wing-horus_v1_thumbnail.png',3300,'fish/mythic/pharaoh-gold-wing-horus_compat_v2_sprite.png','pharaoh','swim',true,'right')
on conflict(id) do update set "kind"=excluded."kind","name"=excluded."name","description"=excluded."description","swim_y_min"=excluded."swim_y_min","swim_y_max"=excluded."swim_y_max","speed"=excluded."speed","size"=excluded."size","rarity"=excluded."rarity","thumbnail_path"=excluded."thumbnail_path","sell_price"=excluded."sell_price","sprite_sheet_path"=excluded."sprite_sheet_path","native_region_id"=excluded."native_region_id","movement_type"=excluded."movement_type","flip_with_direction"=excluded."flip_with_direction","travel_direction"=excluded."travel_direction";
delete from public.collectible_habitats where species_id in ('pharaoh-gold-wing-horus');
insert into public.collectible_habitats(species_id,region_id) values
('pharaoh-gold-wing-horus','pharaoh');
notify pgrst, 'reload schema';
commit;
