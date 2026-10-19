-- Generated from supabase/catalog/catalog.json. Review before migration deployment.
begin;
set constraints all deferred;
insert into public.harbor_vessels ("id","name","price","duration_minutes","fuel_cost","fishing_count","sprite_path","sort_order","fishing_count_max","catch_bait_id","native_bonus") values
('fishing-drone','낚시용 드론',800,60,1,2,'/port/fishing-drone-sprite.png',2,3,'bait',false),
('fishing-raft','낚시용 뗏목',400,30,0,2,'/port/fishing-raft-sprite.png',1,null,'bait',false),
('haeneomi-trawler','해넘이 원양어선',1500,480,5,18,'/port/haeneomi-trawler-sprite.png',4,null,'bait',false),
('neoul-boat','너울 낚싯배',900,120,2,5,'/port/neoul-boat-sprite.png',3,null,'bait',false),
('pearl-salvager','진주빛 인양선',1800,360,3,8,'/port/pearl-salvager-sprite.png',7,null,'bait_magnet',false),
('scrap-gobbler','고철먹보 집게봇',1400,300,2,10,'/port/scrap-gobbler-sprite.png',8,null,'bait_grubby_magnet',false),
('starlit-cruiser','별잠 유람선',2200,900,5,15,'/port/starlit-cruiser-sprite.png',5,25,'bait',false),
('waterway-explorer','물길잡이 탐사선',1600,240,2,8,'/port/waterway-explorer-sprite.png',6,null,'bait',true)
on conflict(id) do update set "name"=excluded."name","price"=excluded."price","duration_minutes"=excluded."duration_minutes","fuel_cost"=excluded."fuel_cost","fishing_count"=excluded."fishing_count","sprite_path"=excluded."sprite_path","sort_order"=excluded."sort_order","fishing_count_max"=excluded."fishing_count_max","catch_bait_id"=excluded."catch_bait_id","native_bonus"=excluded."native_bonus";
notify pgrst, 'reload schema';
commit;
