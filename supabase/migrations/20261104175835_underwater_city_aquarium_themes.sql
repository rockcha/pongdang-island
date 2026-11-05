-- Generated from supabase/catalog/catalog.json. Review before migration deployment.
begin;
set constraints all deferred;
insert into public.aquarium_backgrounds ("id","name","price","image_path","tier") values
('pearl-lantern-street','진주등 상점가',800,'pearl-lantern-street-panorama-v1.png','special'),
('sunlit-coral-street','햇살 산호 거리',800,'sunlit-coral-street-panorama-v1.png','special')
on conflict(id) do update set "name"=excluded."name","price"=excluded."price","image_path"=excluded."image_path","tier"=excluded."tier";
notify pgrst, 'reload schema';
commit;
