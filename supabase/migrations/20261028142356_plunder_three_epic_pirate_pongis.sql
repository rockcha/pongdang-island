-- Generated from supabase/catalog/catalog.json. Review before migration deployment.
begin;
set constraints all deferred;
insert into public.collectible_species ("id","kind","name","description","swim_y_min","swim_y_max","speed","size","rarity","thumbnail_path","sell_price","sprite_sheet_path","native_region_id","movement_type","flip_with_direction","travel_direction") values
('plunder-black-sail-captain-pongi','fish','검은돛 선장 퐁이','검은 삼각모와 붉은 안감 코트를 두른 작은 선장이에요. 가슴의 황동 나침반으로 동료들이 돌아갈 길을 찾아요.','0.30','0.70','0.021',150,'epic','fish/epic/plunder-black-sail-captain-pongi_v1_thumbnail.png',1180,'fish/epic/plunder-black-sail-captain-pongi_v1_sprite.png','plunder','swim',true,'both'),
('plunder-safecracker-pongi','fish','금고털이 퐁이','청록 두건에 열쇠를 숨기고 작은 황동 금고를 꼭 안은 퐁이예요. 자기 금고의 비밀번호는 자주 잊어버려요.','0.30','0.70','0.023',136,'epic','fish/epic/plunder-safecracker-pongi_v1_thumbnail.png',1160,'fish/epic/plunder-safecracker-pongi_v1_sprite.png','plunder','swim',true,'both'),
('plunder-red-knot-bosun-pongi','fish','붉은매듭 갑판장 퐁이','붉은 머릿수건과 밧줄 꾸러미를 두른 씩씩한 갑판장이에요. 단단한 매듭만큼 동료와의 약속도 풀리지 않아요.','0.30','0.70','0.024',145,'epic','fish/epic/plunder-red-knot-bosun-pongi_v1_thumbnail.png',1140,'fish/epic/plunder-red-knot-bosun-pongi_v1_sprite.png','plunder','swim',true,'both')
on conflict(id) do update set "kind"=excluded."kind","name"=excluded."name","description"=excluded."description","swim_y_min"=excluded."swim_y_min","swim_y_max"=excluded."swim_y_max","speed"=excluded."speed","size"=excluded."size","rarity"=excluded."rarity","thumbnail_path"=excluded."thumbnail_path","sell_price"=excluded."sell_price","sprite_sheet_path"=excluded."sprite_sheet_path","native_region_id"=excluded."native_region_id","movement_type"=excluded."movement_type","flip_with_direction"=excluded."flip_with_direction","travel_direction"=excluded."travel_direction";
delete from public.collectible_habitats where species_id in ('plunder-black-sail-captain-pongi','plunder-safecracker-pongi','plunder-red-knot-bosun-pongi');
insert into public.collectible_habitats(species_id,region_id) values
('plunder-black-sail-captain-pongi','plunder'),
('plunder-safecracker-pongi','plunder'),
('plunder-red-knot-bosun-pongi','plunder');
notify pgrst, 'reload schema';
commit;
