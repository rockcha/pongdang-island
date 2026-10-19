-- Generated from supabase/catalog/catalog.json; reviewed and scoped to seven new themes.
begin;
insert into public.aquarium_backgrounds ("id","name","price","image_path") values
('deepsea-post-office','심해 우체국',650,'deepsea-post-office.png'),
('moon-dream-onsen','달잠 온천',550,'moon-dream-onsen.png'),
('moss-glasshouse','이끼 낀 유리온실',400,'moss-glasshouse.png'),
('shell-dessert-shop','조개 디저트 가게',500,'shell-dessert-shop.png'),
('starlight-train-cabin','별빛 기차 객실',800,'starlight-train-cabin.png'),
('submerged-library','물에 잠긴 도서관',700,'submerged-library.png'),
('sunset-rooftop-garden','노을 옥상정원',400,'sunset-rooftop-garden.png')
on conflict(id) do update set "name"=excluded."name","price"=excluded."price","image_path"=excluded."image_path";
notify pgrst, 'reload schema';
commit;
