-- Generated from supabase/catalog/catalog.json. Review before migration deployment.
begin;
set constraints all deferred;
insert into public.aquarium_backgrounds ("id","name","price","image_path","tier") values
('lunea-pink-lullaby','루네아의 연분홍 자장가',1100,'lunea-pink-lullaby.png','special'),
('primal-emerald-bay','태고의 에메랄드 만',1150,'primal-emerald-bay.png','special')
on conflict(id) do update set "name"=excluded."name","price"=excluded."price","image_path"=excluded."image_path","tier"=excluded."tier";
notify pgrst, 'reload schema';
commit;
