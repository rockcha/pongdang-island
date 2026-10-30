-- Generated from supabase/catalog/catalog.json. Review before migration deployment.
begin;
set constraints all deferred;
insert into public.aquarium_backgrounds ("id","name","price","image_path","tier") values
('pharaoh-sleeping-pyramid-court','잠든 피라미드의 뜰',2500,'pharaoh-sleeping-pyramid-court-panorama-v1.png','special'),
('pharaoh-sunken-sun-tomb','태양이 잠긴 왕릉',3000,'pharaoh-sunken-sun-tomb-panorama-v1.png','special')
on conflict(id) do update set "name"=excluded."name","price"=excluded."price","image_path"=excluded."image_path","tier"=excluded."tier";
notify pgrst, 'reload schema';
commit;
