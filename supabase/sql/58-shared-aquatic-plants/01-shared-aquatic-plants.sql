-- Apply after 57. Upload assets/storage-upload/new/20261015-222454/ first.
-- Repeatable; preserves ownership, discoveries and placements.
begin;
insert into public.collectible_species
(id,kind,name,description,swim_y_min,swim_y_max,speed,size,rarity,sprite_sheet_path,thumbnail_path,sell_price,native_region_id,movement_type,flip_with_direction,travel_direction,facing_direction,idle_animated)
values
('ribbon-eelgrass','decoration','리본 잘피','가늘고 긴 초록 잎이 리본처럼 휘어진다. 작은 물고기가 잠깐 숨을 고를 수 있는 초록 그늘을 만든다.',null,null,0,72,'common',null,'decorations/normal/ribbon-eelgrass_thumbnail.png',35,null,'fixed',false,'both','front',false),
('pebble-sea-moss','decoration','조약돌 바다이끼','둥근 조약돌 위로 보드라운 초록 이끼가 내려앉았다. 바닥 한편에 작은 풀밭을 만들어 준다.',null,null,0,52,'common',null,'decorations/normal/pebble-sea-moss_thumbnail.png',30,null,'fixed',false,'both','front',false),
('spiral-kelp','decoration','꼬불 미역','넓적한 올리브빛 잎 끝이 꼬불꼬불 말려 있다. 한 줄기만 놓아도 작은 바다에 풍성한 숲이 생긴다.',null,null,0,82,'common',null,'decorations/normal/spiral-kelp_thumbnail.png',40,null,'fixed',false,'both','front',false),
('pearl-sea-grapes','decoration','진주알 바다포도','가는 줄기마다 맑은 민트빛 방울이 송골송골 맺혀 있다. 빛을 받으면 작은 진주알처럼 은은하게 반짝인다.',null,null,0,68,'rare',null,'decorations/rare/pearl-sea-grapes_thumbnail.png',155,null,'fixed',false,'both','front',false),
('rose-fan-seaweed','decoration','장밋빛 부채해초','장밋빛 잎이 얇은 부채처럼 겹겹이 펼쳐진다. 잎맥 사이로 스며드는 물빛이 어항에 부드러운 색을 더한다.',null,null,0,86,'rare',null,'decorations/rare/rose-fan-seaweed_thumbnail.png',175,null,'fixed',false,'both','front',false),
('rusty-bottle-cap','trash','녹슨 병뚜껑','푸른 칠이 벗겨진 병뚜껑. 가장자리의 작은 녹 자국에 바다를 떠돈 시간이 남아 있다.',0.5,0.9,0.01,34,'common',null,'trash/normal/rusty-bottle-cap_thumbnail.png',8,null,'swim',false,'both','front',false),
('cracked-flowerpot','trash','금 간 꼬마 화분','모서리가 깨진 작은 토분. 흙 대신 모래가 조금 남아 있고 금 간 틈에는 해초 한 줄기가 걸려 있다.',0.5,0.9,0.01,46,'common',null,'trash/normal/cracked-flowerpot_thumbnail.png',15,null,'swim',false,'both','front',false)
on conflict(id) do update set kind=excluded.kind,name=excluded.name,description=excluded.description,
swim_y_min=excluded.swim_y_min,swim_y_max=excluded.swim_y_max,speed=excluded.speed,size=excluded.size,
rarity=excluded.rarity,sprite_sheet_path=excluded.sprite_sheet_path,thumbnail_path=excluded.thumbnail_path,
sell_price=excluded.sell_price,native_region_id=excluded.native_region_id,movement_type=excluded.movement_type,
flip_with_direction=excluded.flip_with_direction,travel_direction=excluded.travel_direction,facing_direction=excluded.facing_direction,idle_animated=excluded.idle_animated;
insert into public.collectible_habitats(species_id,region_id)
select s.id,r.id from public.collectible_species s cross join public.regions r where s.id in ('ribbon-eelgrass','pebble-sea-moss','spiral-kelp','pearl-sea-grapes','rose-fan-seaweed','rusty-bottle-cap','cracked-flowerpot')
on conflict(species_id,region_id) do nothing;
notify pgrst,'reload schema';
commit;
select s.id,s.name,s.kind,s.rarity,s.is_native,s.size,s.thumbnail_path,array_agg(h.region_id order by h.region_id) habitats
from public.collectible_species s join public.collectible_habitats h on h.species_id=s.id
where s.id in ('ribbon-eelgrass','pebble-sea-moss','spiral-kelp','pearl-sea-grapes','rose-fan-seaweed','rusty-bottle-cap','cracked-flowerpot') group by s.id order by s.kind,s.rarity,s.id;
