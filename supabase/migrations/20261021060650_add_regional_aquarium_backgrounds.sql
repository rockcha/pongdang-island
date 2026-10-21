-- Generated from supabase/catalog/catalog.json. Review before migration deployment.
begin;
set constraints all deferred;
insert into public.aquarium_backgrounds ("id","name","price","image_path","tier") values
('region-bluegrove','푸른골의 물빛 골짜기',650,'region-bluegrove.png','mood'),
('region-dreamabyss','꿈먹는 심연의 숨결',800,'region-dreamabyss.png','mood'),
('region-primal','태고의 뿌리 바다',800,'region-primal.png','mood'),
('region-scrapisle','녹빛 고물섬의 기억',800,'region-scrapisle.png','special'),
('region-siren','세이렌의 잠든 신전',1000,'region-siren.png','special'),
('region-starruins','별잠 유적의 고요',900,'region-starruins.png','special')
on conflict(id) do update set "name"=excluded."name","price"=excluded."price","image_path"=excluded."image_path","tier"=excluded."tier";
notify pgrst, 'reload schema';
commit;
