-- Generated from supabase/catalog/catalog.json. Review before migration deployment.
begin;
set constraints all deferred;
insert into public.collectible_species ("id","kind","name","description","swim_y_min","swim_y_max","speed","size","rarity","thumbnail_path","sell_price","sprite_sheet_path","native_region_id","movement_type","flip_with_direction","travel_direction") values
('cloud-broken-broom','trash','부러진 빗자루','하늘을 달렸을지도 모를 부러진 빗자루. 풀린 짚 사이에 아주 작은 마력이 남아 있습니다.','0.9','0.98','0.001',68,'rare','trash/epic/cloud-broken-broom_thumbnail.png',100,null,'cloudferry','fixed',false,'both')
on conflict(id) do update set "kind"=excluded."kind","name"=excluded."name","description"=excluded."description","swim_y_min"=excluded."swim_y_min","swim_y_max"=excluded."swim_y_max","speed"=excluded."speed","size"=excluded."size","rarity"=excluded."rarity","thumbnail_path"=excluded."thumbnail_path","sell_price"=excluded."sell_price","sprite_sheet_path"=excluded."sprite_sheet_path","native_region_id"=excluded."native_region_id","movement_type"=excluded."movement_type","flip_with_direction"=excluded."flip_with_direction","travel_direction"=excluded."travel_direction";
delete from public.collectible_habitats where species_id in ('cloud-broken-broom');
insert into public.collectible_habitats(species_id,region_id) values
('cloud-broken-broom','cloudferry');
notify pgrst, 'reload schema';
commit;
