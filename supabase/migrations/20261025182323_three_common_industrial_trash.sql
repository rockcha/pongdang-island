-- Generated from supabase/catalog/catalog.json. Review before migration deployment.
begin;
set constraints all deferred;
insert into public.collectible_species ("id","kind","name","description","swim_y_min","swim_y_max","speed","size","rarity","thumbnail_path","sell_price","sprite_sheet_path","native_region_id","movement_type","flip_with_direction","travel_direction") values
('broken-generator','trash','고장 난 발전기','시동줄을 당겨도 조용한 작은 발전기. 끊어진 전선과 금이 간 계기판만 남았다.','0.84','0.92','0.001',66,'common','trash/normal/broken-generator_thumbnail.png',3,null,null,'fixed',false,'both'),
('discarded-battery','trash','폐기된 배터리','충전도 불빛도 멈춘 낡은 배터리. 벗겨진 외장에 하얀 소금 자국이 남아 있다.','0.88','0.94','0.001',48,'common','trash/normal/discarded-battery_thumbnail.png',3,null,null,'fixed',false,'both'),
('rusty-cogwheel','trash','녹슨 톱니바퀴','바닷물에 오래 잠겨 붉게 녹슨 톱니바퀴. 닳아 버린 이빨 사이로 모래가 끼어 있다.','0.90','0.95','0.001',44,'common','trash/normal/rusty-cogwheel_thumbnail.png',3,null,null,'fixed',false,'both')
on conflict(id) do update set "kind"=excluded."kind","name"=excluded."name","description"=excluded."description","swim_y_min"=excluded."swim_y_min","swim_y_max"=excluded."swim_y_max","speed"=excluded."speed","size"=excluded."size","rarity"=excluded."rarity","thumbnail_path"=excluded."thumbnail_path","sell_price"=excluded."sell_price","sprite_sheet_path"=excluded."sprite_sheet_path","native_region_id"=excluded."native_region_id","movement_type"=excluded."movement_type","flip_with_direction"=excluded."flip_with_direction","travel_direction"=excluded."travel_direction";
delete from public.collectible_habitats where species_id in ('broken-generator','discarded-battery','rusty-cogwheel');
insert into public.collectible_habitats(species_id,region_id) values
('broken-generator','bluegrove'),
('broken-generator','cloudferry'),
('broken-generator','coral'),
('broken-generator','dreamabyss'),
('broken-generator','mistmoon'),
('broken-generator','mukhyang'),
('broken-generator','nyamnyam'),
('broken-generator','pongdang'),
('broken-generator','primal'),
('broken-generator','scrapisle'),
('broken-generator','siren'),
('broken-generator','starruins'),
('broken-generator','whitenight'),
('discarded-battery','bluegrove'),
('discarded-battery','cloudferry'),
('discarded-battery','coral'),
('discarded-battery','dreamabyss'),
('discarded-battery','mistmoon'),
('discarded-battery','mukhyang'),
('discarded-battery','nyamnyam'),
('discarded-battery','pongdang'),
('discarded-battery','primal'),
('discarded-battery','scrapisle'),
('discarded-battery','siren'),
('discarded-battery','starruins'),
('discarded-battery','whitenight'),
('rusty-cogwheel','bluegrove'),
('rusty-cogwheel','cloudferry'),
('rusty-cogwheel','coral'),
('rusty-cogwheel','dreamabyss'),
('rusty-cogwheel','mistmoon'),
('rusty-cogwheel','mukhyang'),
('rusty-cogwheel','nyamnyam'),
('rusty-cogwheel','pongdang'),
('rusty-cogwheel','primal'),
('rusty-cogwheel','scrapisle'),
('rusty-cogwheel','siren'),
('rusty-cogwheel','starruins'),
('rusty-cogwheel','whitenight');
notify pgrst, 'reload schema';
commit;
