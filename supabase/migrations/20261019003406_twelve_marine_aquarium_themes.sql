-- Generated from supabase/catalog/catalog.json; reviewed and scoped to twelve marine themes.
begin;
insert into public.aquarium_backgrounds ("id","name","price","image_path","tier") values
('black-sand-coral','검은 모래 산호밭',650,'black-sand-coral.png','mood'),
('blue-glass-ripples','푸른 유리물결',250,'blue-glass-ripples.png','simple'),
('blue-kelp-forest','푸른 다시마숲',600,'blue-kelp-forest.png','mood'),
('champagne-ripples','샴페인 물결',350,'champagne-ripples.png','simple'),
('glowing-sea-cavern','빛나는 해저 동굴',750,'glowing-sea-cavern.png','mood'),
('golden-sun-shallows','금빛 햇살 여울',400,'golden-sun-shallows.png','simple'),
('lemon-light-shallows','레몬빛 여울',200,'lemon-light-shallows.png','simple'),
('morning-eelgrass','잘피밭의 아침',450,'morning-eelgrass.png','mood'),
('peach-water-haze','복숭아 물안개',250,'peach-water-haze.png','simple'),
('pink-coral-shallows','분홍 산호 여울',500,'pink-coral-shallows.png','mood'),
('red-fan-coral','붉은 부채산호',700,'red-fan-coral.png','mood'),
('silver-moon-halo','은빛 달무리',300,'silver-moon-halo.png','simple')
on conflict(id) do update set "name"=excluded."name","price"=excluded."price","image_path"=excluded."image_path","tier"=excluded."tier";
notify pgrst, 'reload schema';
commit;
