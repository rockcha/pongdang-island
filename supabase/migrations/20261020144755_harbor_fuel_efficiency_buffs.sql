-- Generated from supabase/catalog/catalog.json. Review before migration deployment.
begin;
set constraints all deferred;
insert into public.harbor_vessels ("id","name","price","duration_minutes","fuel_cost","fishing_count","sprite_path","sort_order","fishing_count_max","catch_bait_id","native_bonus") values
('billow-rider','너울타기 어선',1600,360,3,12,'/port/billow-rider-sprite.png',9,24,'bait',false),
('fishing-drone','낚시용 드론',800,60,1,4,'/port/fishing-drone-sprite.png',2,5,'bait',false),
('golden-luck','행운의 금빛어선',2500,480,4,18,'/port/golden-luck-sprite.png',10,32,'bait',false),
('haeneomi-trawler','해넘이 원양어선',1500,480,5,28,'/port/haeneomi-trawler-sprite.png',4,null,'bait',false),
('neoul-boat','너울 낚싯배',900,120,2,10,'/port/neoul-boat-sprite.png',3,null,'bait',false),
('scrap-gobbler','고철먹보 집게봇',1400,300,2,18,'/port/scrap-gobbler-sprite.png',8,null,'bait_grubby_magnet',false),
('starlit-cruiser','별잠 유람선',2200,900,5,30,'/port/starlit-cruiser-sprite.png',5,40,'bait',false),
('waterway-explorer','물길잡이 탐사선',1600,240,2,10,'/port/waterway-explorer-sprite.png',6,null,'bait',true)
on conflict(id) do update set "name"=excluded."name","price"=excluded."price","duration_minutes"=excluded."duration_minutes","fuel_cost"=excluded."fuel_cost","fishing_count"=excluded."fishing_count","sprite_path"=excluded."sprite_path","sort_order"=excluded."sort_order","fishing_count_max"=excluded."fishing_count_max","catch_bait_id"=excluded."catch_bait_id","native_bonus"=excluded."native_bonus";
notify pgrst, 'reload schema';
commit;
