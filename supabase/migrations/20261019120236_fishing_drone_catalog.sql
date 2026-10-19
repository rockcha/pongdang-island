-- Generated from supabase/catalog/catalog.json. Review before migration deployment.
begin;
set constraints all deferred;
insert into public.harbor_vessels ("id","name","price","duration_minutes","fuel_cost","fishing_count","sprite_path","sort_order","fishing_count_max") values
('fishing-raft','낚시용 뗏목',400,30,0,2,'/port/fishing-raft-sprite.png',1,null),
('haeneomi-trawler','해넘이 원양어선',1500,480,5,18,'/port/haeneomi-trawler-sprite.png',4,null),
('neoul-boat','너울 낚싯배',900,120,2,5,'/port/neoul-boat-sprite.png',3,null),
('fishing-drone','낚시용 드론',800,60,1,2,'/port/fishing-drone-sprite.png',2,3)
on conflict(id) do update set "name"=excluded."name","price"=excluded."price","duration_minutes"=excluded."duration_minutes","fuel_cost"=excluded."fuel_cost","fishing_count"=excluded."fishing_count","sprite_path"=excluded."sprite_path","sort_order"=excluded."sort_order","fishing_count_max"=excluded."fishing_count_max";
notify pgrst, 'reload schema';
commit;
