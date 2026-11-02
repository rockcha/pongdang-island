-- Generated from supabase/catalog/catalog.json. Review before migration deployment.
begin;
set constraints all deferred;
insert into public.aquarium_backgrounds ("id","name","price","image_path","tier") values
('cheomseongdae-stars','별을 담은 첨성대',3800,'cheomseongdae-stars-panorama-v1.png','special'),
('hangang-fireworks-night','한강 불꽃의 밤',3500,'hangang-fireworks-night-panorama-v1.png','special')
on conflict(id) do update set "name"=excluded."name","price"=excluded."price","image_path"=excluded."image_path","tier"=excluded."tier";
notify pgrst, 'reload schema';
commit;
