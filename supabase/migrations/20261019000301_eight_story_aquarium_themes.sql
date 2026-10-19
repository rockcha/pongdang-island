-- Generated from supabase/catalog/catalog.json; reviewed and scoped to eight new themes.
begin;
insert into public.aquarium_backgrounds ("id","name","price","image_path") values
('bottle-harbor','병 속의 작은 항구',600,'bottle-harbor.png'),
('coral-laundromat','산호 세탁소',450,'coral-laundromat.png'),
('dawn-flower-market','새벽 꽃시장',400,'dawn-flower-market.png'),
('jellyfish-bus-stop','해파리 버스정류장',550,'jellyfish-bus-stop.png'),
('sleeping-dragon-treasury','잠든 용의 보물창고',800,'sleeping-dragon-treasury.png'),
('snowy-attic','눈 내리는 다락방',500,'snowy-attic.png'),
('sunken-arcade','수몰된 오락실',650,'sunken-arcade.png'),
('whale-music-room','고래 뱃속 음악실',700,'whale-music-room.png')
on conflict(id) do update set "name"=excluded."name","price"=excluded."price","image_path"=excluded."image_path";
notify pgrst, 'reload schema';
commit;
