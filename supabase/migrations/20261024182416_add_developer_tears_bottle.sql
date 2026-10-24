-- Generated from supabase/catalog/catalog.json. Review before migration deployment.
begin;
set constraints all deferred;
insert into public.collectible_species ("id","kind","name","description","swim_y_min","swim_y_max","speed","size","rarity","thumbnail_path","sell_price","sprite_sheet_path","native_region_id","movement_type","flip_with_direction","travel_direction") values
('developer-tears-bottle','trash','개발자의 눈물이 담긴 병','밤샘 디버깅 끝에 한 방울씩 모인 개발자의 눈물. 병은 제법 묵직하지만, 감정 노동은 판매가에 포함되지 않았다.','0.84','0.94','0.001',36,'common','trash/normal/developer-tears-bottle_thumbnail.png',5,null,null,'fixed',false,'both')
on conflict(id) do update set "kind"=excluded."kind","name"=excluded."name","description"=excluded."description","swim_y_min"=excluded."swim_y_min","swim_y_max"=excluded."swim_y_max","speed"=excluded."speed","size"=excluded."size","rarity"=excluded."rarity","thumbnail_path"=excluded."thumbnail_path","sell_price"=excluded."sell_price","sprite_sheet_path"=excluded."sprite_sheet_path","native_region_id"=excluded."native_region_id","movement_type"=excluded."movement_type","flip_with_direction"=excluded."flip_with_direction","travel_direction"=excluded."travel_direction";
delete from public.collectible_habitats where species_id in ('developer-tears-bottle');
insert into public.collectible_habitats(species_id,region_id) values
('developer-tears-bottle','bluegrove'),
('developer-tears-bottle','cloudferry'),
('developer-tears-bottle','coral'),
('developer-tears-bottle','dreamabyss'),
('developer-tears-bottle','mistmoon'),
('developer-tears-bottle','mukhyang'),
('developer-tears-bottle','pongdang'),
('developer-tears-bottle','siren'),
('developer-tears-bottle','starruins'),
('developer-tears-bottle','whitenight');
notify pgrst, 'reload schema';
commit;
