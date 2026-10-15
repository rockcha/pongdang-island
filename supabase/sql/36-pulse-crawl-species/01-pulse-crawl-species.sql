-- Apply after 35. Upload fish/normal and fish/rare PNGs from
-- assets/storage-upload/new/20261015-114904/ to collectibles first.
-- Repeatable; preserves owned individuals, discoveries and placements.
begin;
insert into public.collectible_species
 (id,kind,name,description,swim_y_min,swim_y_max,speed,size,rarity,sprite_sheet_path,thumbnail_path,sell_price,native_region_id,movement_type,flip_with_direction,travel_direction)
values
 ('moonbell-jellyfish','fish','달방울 해파리','반투명 연보라색 갓 안에 둥근 달무늬가 떠 있는 해파리. 안개달 해역에서 짧은 촉수를 모아 위로 솟았다 천천히 내려온다.',.20,.75,.030,60,'rare','fish/rare/moonbell-jellyfish_sprite.png','fish/rare/moonbell-jellyfish_thumbnail.png',170,'mistmoon','pulse',false,'both'),
 ('peach-umbrella-jellyfish','fish','복숭아 우산해파리','복숭아빛 우산 같은 갓 아래 크림색 촉수가 모여 있다. 몸을 오므리며 통통 떠올랐다 잔물결 사이로 느긋하게 내려온다.',.25,.80,.035,56,'common','fish/normal/peach-umbrella-jellyfish_sprite.png','fish/normal/peach-umbrella-jellyfish_thumbnail.png',35,null,'pulse',false,'both'),
 ('coral-claw-crab','fish','산호집게 꽃게','둥근 살구색 등딱지와 산호빛 집게를 가진 작은 꽃게. 산호빛 여울의 바닥을 옆으로 종종 걸으며 조개껍데기를 살핀다.',.86,.94,.030,64,'rare','fish/rare/coral-claw-crab_sprite.png','fish/rare/coral-claw-crab_thumbnail.png',180,'coral','crawl',false,'both'),
 ('pebble-hermit-crab','fish','조약돌 소라게','매끈한 회청색 소라집 아래 주황색 다리가 옹기종기 모여 있다. 바닥을 느릿느릿 오가며 집 밖으로 눈을 내민다.',.88,.96,.025,52,'common','fish/normal/pebble-hermit-crab_sprite.png','fish/normal/pebble-hermit-crab_thumbnail.png',30,null,'crawl',false,'both')
on conflict(id) do update set
 kind=excluded.kind,name=excluded.name,description=excluded.description,
 swim_y_min=excluded.swim_y_min,swim_y_max=excluded.swim_y_max,speed=excluded.speed,size=excluded.size,rarity=excluded.rarity,
 sprite_sheet_path=excluded.sprite_sheet_path,thumbnail_path=excluded.thumbnail_path,sell_price=excluded.sell_price,
 native_region_id=excluded.native_region_id,movement_type=excluded.movement_type,
 flip_with_direction=excluded.flip_with_direction,travel_direction=excluded.travel_direction;

delete from public.collectible_habitats h using public.collectible_species s
where h.species_id=s.id and s.id in ('moonbell-jellyfish','coral-claw-crab') and h.region_id<>s.native_region_id;
insert into public.collectible_habitats(species_id,region_id)
select s.id,s.native_region_id from public.collectible_species s where s.id in ('moonbell-jellyfish','coral-claw-crab')
on conflict do nothing;
insert into public.collectible_habitats(species_id,region_id)
select s.id,r.id from public.collectible_species s cross join public.regions r
where s.id in ('peach-umbrella-jellyfish','pebble-hermit-crab')
 and r.id in ('pongdang','coral','mistmoon','starruins','dreamabyss')
on conflict do nothing;
commit;

select s.id,s.name,s.rarity,s.is_native,s.native_region_id,s.movement_type,s.flip_with_direction,
 array_agg(h.region_id order by h.region_id) as habitats
from public.collectible_species s join public.collectible_habitats h on h.species_id=s.id
where s.id in ('moonbell-jellyfish','peach-umbrella-jellyfish','coral-claw-crab','pebble-hermit-crab')
group by s.id order by s.id;
