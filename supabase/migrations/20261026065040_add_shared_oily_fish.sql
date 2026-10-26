-- Generated from supabase/catalog/catalog.json. Review before migration deployment.
begin;
set constraints all deferred;
insert into public.collectible_species ("id","kind","name","description","swim_y_min","swim_y_max","speed","size","rarity","thumbnail_path","sell_price","sprite_sheet_path","native_region_id","movement_type","flip_with_direction","travel_direction") values
('shared-oily-eel','fish','기름 장어','매끈한 몸에 기름기가 도는 장어. 바다 아래를 부드러운 물결처럼 헤엄쳐요.','0.32','0.84','0.018',88,'common','fish/normal/shared-oily-eel_v1_thumbnail.png',19,'fish/normal/shared-oily-eel_v1_sprite.png',null,'swim',true,'both'),
('shared-oily-horse-mackerel','fish','기름 전갱이','은빛 비늘과 노란 지느러미에 기름기가 반짝이는 전갱이. 작은 몸에 바다의 든든한 힘을 품고 있어요.','0.20','0.74','0.024',68,'common','fish/normal/shared-oily-horse-mackerel_v1_thumbnail.png',10,'fish/normal/shared-oily-horse-mackerel_v1_sprite.png',null,'swim',true,'both'),
('shared-oily-spanish-mackerel','fish','기름 삼치','날렵한 은빛 몸에 기름이 밴 삼치. 물살을 가르는 꼬리마다 윤기가 반짝여요.','0.16','0.72','0.032',82,'common','fish/normal/shared-oily-spanish-mackerel_v1_thumbnail.png',15,'fish/normal/shared-oily-spanish-mackerel_v1_sprite.png',null,'swim',true,'both')
on conflict(id) do update set "kind"=excluded."kind","name"=excluded."name","description"=excluded."description","swim_y_min"=excluded."swim_y_min","swim_y_max"=excluded."swim_y_max","speed"=excluded."speed","size"=excluded."size","rarity"=excluded."rarity","thumbnail_path"=excluded."thumbnail_path","sell_price"=excluded."sell_price","sprite_sheet_path"=excluded."sprite_sheet_path","native_region_id"=excluded."native_region_id","movement_type"=excluded."movement_type","flip_with_direction"=excluded."flip_with_direction","travel_direction"=excluded."travel_direction";
delete from public.collectible_habitats where species_id in ('shared-oily-eel','shared-oily-horse-mackerel','shared-oily-spanish-mackerel');
insert into public.collectible_habitats(species_id,region_id) values
('shared-oily-eel','bluegrove'),
('shared-oily-eel','cloudferry'),
('shared-oily-eel','coral'),
('shared-oily-eel','dreamabyss'),
('shared-oily-eel','mistmoon'),
('shared-oily-eel','mukhyang'),
('shared-oily-eel','nyamnyam'),
('shared-oily-eel','pongdang'),
('shared-oily-eel','primal'),
('shared-oily-eel','scrapisle'),
('shared-oily-eel','siren'),
('shared-oily-eel','starruins'),
('shared-oily-eel','whitenight'),
('shared-oily-horse-mackerel','bluegrove'),
('shared-oily-horse-mackerel','cloudferry'),
('shared-oily-horse-mackerel','coral'),
('shared-oily-horse-mackerel','dreamabyss'),
('shared-oily-horse-mackerel','mistmoon'),
('shared-oily-horse-mackerel','mukhyang'),
('shared-oily-horse-mackerel','nyamnyam'),
('shared-oily-horse-mackerel','pongdang'),
('shared-oily-horse-mackerel','primal'),
('shared-oily-horse-mackerel','scrapisle'),
('shared-oily-horse-mackerel','siren'),
('shared-oily-horse-mackerel','starruins'),
('shared-oily-horse-mackerel','whitenight'),
('shared-oily-spanish-mackerel','bluegrove'),
('shared-oily-spanish-mackerel','cloudferry'),
('shared-oily-spanish-mackerel','coral'),
('shared-oily-spanish-mackerel','dreamabyss'),
('shared-oily-spanish-mackerel','mistmoon'),
('shared-oily-spanish-mackerel','mukhyang'),
('shared-oily-spanish-mackerel','nyamnyam'),
('shared-oily-spanish-mackerel','pongdang'),
('shared-oily-spanish-mackerel','primal'),
('shared-oily-spanish-mackerel','scrapisle'),
('shared-oily-spanish-mackerel','siren'),
('shared-oily-spanish-mackerel','starruins'),
('shared-oily-spanish-mackerel','whitenight');
notify pgrst, 'reload schema';
commit;
