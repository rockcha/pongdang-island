-- Generated from supabase/catalog/catalog.json. Review before migration deployment.
begin;
set constraints all deferred;
insert into public.aquarium_backgrounds ("id","name","price","image_path","tier") values
('loveletter-night-post-office','밤에도 불 켜진 우체국',5300,'loveletter-night-post-office-panorama-v1.png','special'),
('loveletter-petal-harbor','꽃잎이 잠든 포구',4800,'loveletter-petal-harbor-panorama-v1.png','special')
on conflict(id) do update set "name"=excluded."name","price"=excluded."price","image_path"=excluded."image_path","tier"=excluded."tier";
notify pgrst, 'reload schema';
commit;
