-- Generated from supabase/catalog/catalog.json; reviewed and scoped to six new tiered themes.
begin;
insert into public.aquarium_backgrounds ("id","name","price","image_path","tier") values
('cherry-blossom-pond','벚꽃이 고인 연못',450,'cherry-blossom-pond.png','mood'),
('firefly-reed-marsh','반딧불 갈대습지',400,'firefly-reed-marsh.png','mood'),
('milky-dawn','우윳빛 새벽',200,'milky-dawn.png','simple'),
('mint-ripples','민트빛 잔물결',200,'mint-ripples.png','simple'),
('submarine-observatory','잠수함 관측실',700,'submarine-observatory.png','special'),
('undersea-teahouse','해저 찻집',650,'undersea-teahouse.png','special')
on conflict(id) do update set "name"=excluded."name","price"=excluded."price","image_path"=excluded."image_path","tier"=excluded."tier";
notify pgrst, 'reload schema';
commit;
