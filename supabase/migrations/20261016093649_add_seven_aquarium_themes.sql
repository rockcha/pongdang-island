-- Generated from catalog.json, reviewed and limited to seven new backgrounds.
begin;
insert into public.aquarium_backgrounds ("id","name","price","image_path") values
('blueflame','심해의 푸른 불꽃',700,'blueflame.png'),
('dawnmist','새벽 물안개',250,'dawnmist.png'),
('goldendunes','황금빛 물결 사막',650,'goldendunes.png'),
('rainsea','비 내리는 바다',200,'rainsea.png'),
('rosesalt','장밋빛 소금 호수',600,'rosesalt.png'),
('seagrass','연둣빛 해초밭',200,'seagrass.png'),
('stilltime','시간이 잠든 바다',800,'stilltime.png')
on conflict(id) do update set "name"=excluded."name","price"=excluded."price","image_path"=excluded."image_path";
notify pgrst, 'reload schema';
commit;
