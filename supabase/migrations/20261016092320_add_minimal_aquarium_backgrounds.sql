-- Generated from catalog.json; narrowed on review to the three new backgrounds only.
begin;
insert into public.aquarium_backgrounds ("id","name","price","image_path") values
('glacier','빙하의 숨결',400,'glacier.png'),
('sunset','노을빛 바다',300,'sunset.png'),
('violet','보랏빛 고요',500,'violet.png')
on conflict(id) do update set "name"=excluded."name","price"=excluded."price","image_path"=excluded."image_path";
notify pgrst, 'reload schema';
commit;
