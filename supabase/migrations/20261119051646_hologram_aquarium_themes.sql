-- Generated from supabase/catalog/catalog.json. Review before migration deployment.
begin;
set constraints all deferred;
insert into public.aquarium_backgrounds ("id","name","price","image_path","tier") values
('hologram-dusk-transit','심해의 마지막 열차',3200,'hologram-dusk-transit-panorama-v1.png','special'),
('hologram-glass-dome','유리돔 관측소',1800,'hologram-glass-dome-panorama-v1.png','special')
on conflict(id) do update set "name"=excluded."name","price"=excluded."price","image_path"=excluded."image_path","tier"=excluded."tier";
notify pgrst, 'reload schema';
commit;
