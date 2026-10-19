-- Generated catalog reviewed: persist visual detail tiers without changing prices or ownership.
begin;
alter table public.aquarium_backgrounds add column tier text not null default 'simple' constraint aquarium_backgrounds_tier_check check (tier in ('simple','mood','special'));
insert into public.aquarium_backgrounds ("id","name","price","image_path","tier") values
('aurorasea','물속의 오로라',800,'aurorasea.png','mood'),
('autumnpond','가을이 잠긴 연못',350,'autumnpond.png','mood'),
('blueflame','심해의 푸른 불꽃',700,'blueflame.png','mood'),
('bottle-harbor','병 속의 작은 항구',600,'bottle-harbor.png','special'),
('cloudsea','구름이 잠긴 바다',600,'cloudsea.png','mood'),
('coral','산호 정원',100,'coral.png','simple'),
('coral-laundromat','산호 세탁소',450,'coral-laundromat.png','special'),
('dawn-flower-market','새벽 꽃시장',400,'dawn-flower-market.png','special'),
('dawnmist','새벽 물안개',250,'dawnmist.png','simple'),
('deepsea-post-office','심해 우체국',650,'deepsea-post-office.png','special'),
('default','맑은 물빛',0,'default.png','simple'),
('glacier','빙하의 숨결',400,'glacier.png','mood'),
('goldendunes','황금빛 물결 사막',650,'goldendunes.png','mood'),
('icebubbles','빙하 속 기포',700,'icebubbles.png','mood'),
('inksea','먹빛 수묵 바다',650,'inksea.png','mood'),
('jellyfish-bus-stop','해파리 버스정류장',550,'jellyfish-bus-stop.png','special'),
('moon','달빛 바다',300,'moon.png','simple'),
('moon-dream-onsen','달잠 온천',550,'moon-dream-onsen.png','special'),
('moss-glasshouse','이끼 낀 유리온실',400,'moss-glasshouse.png','special'),
('pearl','진주 동굴',500,'pearl.png','mood'),
('rainsea','비 내리는 바다',200,'rainsea.png','simple'),
('rosesalt','장밋빛 소금 호수',600,'rosesalt.png','mood'),
('seagrass','연둣빛 해초밭',200,'seagrass.png','mood'),
('shell-dessert-shop','조개 디저트 가게',500,'shell-dessert-shop.png','special'),
('sleeping-dragon-treasury','잠든 용의 보물창고',800,'sleeping-dragon-treasury.png','special'),
('snowy-attic','눈 내리는 다락방',500,'snowy-attic.png','special'),
('starlight-train-cabin','별빛 기차 객실',800,'starlight-train-cabin.png','special'),
('stilltime','시간이 잠든 바다',800,'stilltime.png','simple'),
('submerged-library','물에 잠긴 도서관',700,'submerged-library.png','special'),
('sunken-arcade','수몰된 오락실',650,'sunken-arcade.png','special'),
('sunset','노을빛 바다',300,'sunset.png','simple'),
('sunset-rooftop-garden','노을 옥상정원',400,'sunset-rooftop-garden.png','special'),
('violet','보랏빛 고요',500,'violet.png','simple'),
('whale-music-room','고래 뱃속 음악실',700,'whale-music-room.png','special')
on conflict(id) do update set "name"=excluded."name","price"=excluded."price","image_path"=excluded."image_path","tier"=excluded."tier";
notify pgrst, 'reload schema';
commit;
