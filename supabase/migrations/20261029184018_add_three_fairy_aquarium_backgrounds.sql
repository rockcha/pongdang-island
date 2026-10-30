-- Generated from supabase/catalog/catalog.json. Review before migration deployment.
begin;
set constraints all deferred;
insert into public.aquarium_backgrounds ("id","name","price","image_path","tier") values
('fairy-dew-grove','이슬 머금은 요정숲',1500,'fairy-dew-grove-panorama-v1.png','special'),
('fairy-moonlit-lake','달빛 잠든 요정 호수',1800,'fairy-moonlit-lake-panorama-v1.png','special'),
('fairy-petal-palace','꽃잎 속 요정 궁전',1650,'fairy-petal-palace-panorama-v1.png','special')
on conflict(id) do update set "name"=excluded."name","price"=excluded."price","image_path"=excluded."image_path","tier"=excluded."tier";
notify pgrst, 'reload schema';
commit;
