-- Generated from supabase/catalog/catalog.json. Review before migration deployment.
begin;
set constraints all deferred;
insert into public.collectible_species ("id","kind","name","description","swim_y_min","swim_y_max","speed","size","rarity","thumbnail_path","sell_price","sprite_sheet_path","native_region_id","movement_type","flip_with_direction","travel_direction") values
('shared-grimhowl-giant-wolf-eel','fish','침묵을 찢는 송곳니, 그림하울','은빛 물결무늬와 차가운 눈빛을 지닌 거대 늑대장어. 긴 몸을 낮게 물결치며, 날카로운 송곳니로 심해의 침묵을 가릅니다.','0.48','0.88','0.018',145,'epic','fish/epic/shared-grimhowl-giant-wolf-eel_v2_thumbnail.png',874,'fish/epic/shared-grimhowl-giant-wolf-eel_v2_sprite.png',null,'swim',true,'both')
on conflict(id) do update set "kind"=excluded."kind","name"=excluded."name","description"=excluded."description","swim_y_min"=excluded."swim_y_min","swim_y_max"=excluded."swim_y_max","speed"=excluded."speed","size"=excluded."size","rarity"=excluded."rarity","thumbnail_path"=excluded."thumbnail_path","sell_price"=excluded."sell_price","sprite_sheet_path"=excluded."sprite_sheet_path","native_region_id"=excluded."native_region_id","movement_type"=excluded."movement_type","flip_with_direction"=excluded."flip_with_direction","travel_direction"=excluded."travel_direction";
delete from public.collectible_habitats where species_id in ('shared-grimhowl-giant-wolf-eel');
insert into public.collectible_habitats(species_id,region_id) values
('shared-grimhowl-giant-wolf-eel','bluegrove'),
('shared-grimhowl-giant-wolf-eel','cloudferry'),
('shared-grimhowl-giant-wolf-eel','coral'),
('shared-grimhowl-giant-wolf-eel','dreamabyss'),
('shared-grimhowl-giant-wolf-eel','mistmoon'),
('shared-grimhowl-giant-wolf-eel','mukhyang'),
('shared-grimhowl-giant-wolf-eel','nyamnyam'),
('shared-grimhowl-giant-wolf-eel','pongdang'),
('shared-grimhowl-giant-wolf-eel','primal'),
('shared-grimhowl-giant-wolf-eel','scrapisle'),
('shared-grimhowl-giant-wolf-eel','siren'),
('shared-grimhowl-giant-wolf-eel','starruins'),
('shared-grimhowl-giant-wolf-eel','whitenight');
notify pgrst, 'reload schema';
commit;
