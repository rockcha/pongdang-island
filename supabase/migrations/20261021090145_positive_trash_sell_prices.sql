-- Generated from supabase/catalog/catalog.json. Review before migration deployment.
begin;
set constraints all deferred;
insert into public.collectible_species ("id","kind","name","description","swim_y_min","swim_y_max","speed","size","rarity","thumbnail_path","sell_price","sprite_sheet_path","native_region_id","movement_type","flip_with_direction","travel_direction") values
('cracked-pressure-gauge','trash','금 간 수압계','유리에 금이 가고 바늘이 끝까지 돌아간 낡은 수압계.','0.84','0.94','0.012',52,'rare','trash/rare/cracked-pressure-gauge_thumbnail.png',19,null,'dreamabyss','fixed',false,'both'),
('dented-diving-lamp','trash','찌그러진 잠수등','보호 철망이 찌그러진 잠수등. 흐린 유리 안쪽의 불빛은 꺼졌다.','0.84','0.94','0.012',52,'rare','trash/rare/dented-diving-lamp_thumbnail.png',19,null,'dreamabyss','fixed',false,'both')
on conflict(id) do update set "kind"=excluded."kind","name"=excluded."name","description"=excluded."description","swim_y_min"=excluded."swim_y_min","swim_y_max"=excluded."swim_y_max","speed"=excluded."speed","size"=excluded."size","rarity"=excluded."rarity","thumbnail_path"=excluded."thumbnail_path","sell_price"=excluded."sell_price","sprite_sheet_path"=excluded."sprite_sheet_path","native_region_id"=excluded."native_region_id","movement_type"=excluded."movement_type","flip_with_direction"=excluded."flip_with_direction","travel_direction"=excluded."travel_direction";
delete from public.collectible_habitats where species_id in ('cracked-pressure-gauge','dented-diving-lamp');
insert into public.collectible_habitats(species_id,region_id) values
('cracked-pressure-gauge','dreamabyss'),
('dented-diving-lamp','dreamabyss');
-- Trash remains low value, but must always be sellable by the inventory RPC.
set constraints all immediate;
alter table public.collectible_species add constraint collectible_species_trash_positive_sell_price
 check (kind <> 'trash' or sell_price > 0);
notify pgrst, 'reload schema';
commit;
