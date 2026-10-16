-- Generated from catalog.json, reviewed and limited to five new backgrounds.
begin;
insert into public.aquarium_backgrounds ("id","name","price","image_path") values
('aurorasea','물속의 오로라',800,'aurorasea.png'),
('autumnpond','가을이 잠긴 연못',350,'autumnpond.png'),
('cloudsea','구름이 잠긴 바다',600,'cloudsea.png'),
('icebubbles','빙하 속 기포',700,'icebubbles.png'),
('inksea','먹빛 수묵 바다',650,'inksea.png')
on conflict(id) do update set "name"=excluded."name","price"=excluded."price","image_path"=excluded."image_path";
notify pgrst, 'reload schema';
commit;
