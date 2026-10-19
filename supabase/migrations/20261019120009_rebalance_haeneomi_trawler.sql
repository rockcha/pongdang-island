-- Generated from supabase/catalog/catalog.json. Review before migration deployment.
begin;
set constraints all deferred;
insert into public.harbor_vessels ("id","name","price","duration_minutes","fuel_cost","fishing_count","sprite_path","sort_order") values
('fishing-raft','낚시용 뗏목',300,30,1,2,'/port/fishing-raft-sprite.png',1),
('haeneomi-trawler','해넘이 원양어선',1500,480,5,18,'/port/haeneomi-trawler-sprite.png',3),
('neoul-boat','너울 낚싯배',900,120,2,5,'/port/neoul-boat-sprite.png',2)
on conflict(id) do update set "name"=excluded."name","price"=excluded."price","duration_minutes"=excluded."duration_minutes","fuel_cost"=excluded."fuel_cost","fishing_count"=excluded."fishing_count","sprite_path"=excluded."sprite_path","sort_order"=excluded."sort_order";
notify pgrst, 'reload schema';
commit;
