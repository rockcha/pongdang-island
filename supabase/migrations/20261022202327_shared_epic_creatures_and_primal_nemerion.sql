-- Generated from supabase/catalog/catalog.json. Review before migration deployment.
begin;
set constraints all deferred;
insert into public.collectible_species ("id","kind","name","description","swim_y_min","swim_y_max","speed","size","rarity","thumbnail_path","sell_price","sprite_sheet_path","native_region_id","movement_type","flip_with_direction","travel_direction") values
('primal-nemerion-last-ocean-heir','fish','사라진 대양의 마지막 후예, 네메리온','사라진 대양의 기억을 품은 거대한 고대 실러캔스. 두꺼운 비늘과 육질 지느러미를 움직이다가, 턱과 아가미를 크게 펼쳐 태고의 숨을 내쉽니다.','0.28','0.84','0.014',178,'mythic','fish/mythic/primal-nemerion-last-ocean-heir_v1_thumbnail.png',3022,'fish/mythic/primal-nemerion-last-ocean-heir_v1_sprite.png','primal','swim',true,'both'),
('shared-golden-whale-shark','fish','황금 고래상어','넓고 둥근 머리와 황금빛 별점 무늬를 지닌 거대한 고래상어. 느긋한 꼬리짓으로 모든 해역을 누빕니다.','0.18','0.8','0.016',160,'epic','fish/epic/shared-golden-whale-shark_v1_thumbnail.png',900,'fish/epic/shared-golden-whale-shark_v1_sprite.png',null,'swim',true,'both'),
('shared-grimhowl-giant-wolf-eel','fish','침묵을 찢는 송곳니, 그림하울','육중한 턱과 우툴두툴한 피부를 지닌 거대 늑대장어. 긴 몸을 낮게 물결치며 조용한 바다를 가릅니다.','0.48','0.88','0.018',145,'epic','fish/epic/shared-grimhowl-giant-wolf-eel_v1_thumbnail.png',874,'fish/epic/shared-grimhowl-giant-wolf-eel_v1_sprite.png',null,'swim',true,'both')
on conflict(id) do update set "kind"=excluded."kind","name"=excluded."name","description"=excluded."description","swim_y_min"=excluded."swim_y_min","swim_y_max"=excluded."swim_y_max","speed"=excluded."speed","size"=excluded."size","rarity"=excluded."rarity","thumbnail_path"=excluded."thumbnail_path","sell_price"=excluded."sell_price","sprite_sheet_path"=excluded."sprite_sheet_path","native_region_id"=excluded."native_region_id","movement_type"=excluded."movement_type","flip_with_direction"=excluded."flip_with_direction","travel_direction"=excluded."travel_direction";
delete from public.collectible_habitats where species_id in ('primal-nemerion-last-ocean-heir','shared-golden-whale-shark','shared-grimhowl-giant-wolf-eel');
insert into public.collectible_habitats(species_id,region_id) values
('primal-nemerion-last-ocean-heir','primal'),
('shared-golden-whale-shark','bluegrove'),
('shared-golden-whale-shark','cloudferry'),
('shared-golden-whale-shark','coral'),
('shared-golden-whale-shark','dreamabyss'),
('shared-golden-whale-shark','mistmoon'),
('shared-golden-whale-shark','mukhyang'),
('shared-golden-whale-shark','nyamnyam'),
('shared-golden-whale-shark','pongdang'),
('shared-golden-whale-shark','primal'),
('shared-golden-whale-shark','scrapisle'),
('shared-golden-whale-shark','siren'),
('shared-golden-whale-shark','starruins'),
('shared-golden-whale-shark','whitenight'),
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
