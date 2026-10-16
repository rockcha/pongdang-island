-- Apply after 50. Upload assets/storage-upload/new/20261015-201817/ first.
-- Repeatable; preserves ownership, discoveries and placements.
begin;
-- Retire the legacy common-only restriction. Regional maps also have rarities.
alter table public.collectible_species drop constraint if exists collectible_nonfish_common;
insert into public.collectible_species
(id,kind,name,description,swim_y_min,swim_y_max,speed,size,rarity,sprite_sheet_path,thumbnail_path,sell_price,native_region_id,movement_type,flip_with_direction,travel_direction,facing_direction,idle_animated)
values
('rainbow-mantis-shrimp','fish','색동 갯가재','민트빛과 주황빛 갑각이 색동옷처럼 겹친다. 작은 다리를 바삐 움직이며 바닥의 먹이를 찾아다닌다.',0.84,0.94,0.017,54,'common','fish/normal/rainbow-mantis-shrimp_sprite.png','fish/normal/rainbow-mantis-shrimp_thumbnail.png',35,null,'crawl',true,'both','right',false),
('pea-sponge','fish','완두 해면','완두콩처럼 둥근 초록 관들이 옹기종기 모여 있다. 작은 구멍으로 물을 들이고 내보내며 조용히 살아간다.',0.84,0.94,0.001,60,'common','fish/normal/pea-sponge_sprite.png','fish/normal/pea-sponge_thumbnail.png',30,null,'fixed',false,'both','right',true),
('tiny-sardine','fish','꼬마 정어리','푸른 등 아래 은빛 배가 반짝이는 작은 정어리. 짧은 꼬리를 부지런히 흔들며 바닷길을 누빈다.',0.2,0.8,0.03,54,'common','fish/normal/tiny-sardine_sprite.png','fish/normal/tiny-sardine_thumbnail.png',30,null,'swim',true,'both','right',false),
('peeking-conger-eel','fish','빼꼼 붕장어','모래 구멍에서 고개를 빼꼼 내민 작은 붕장어. 길게 굽은 몸을 살짝 흔들며 지나가는 친구들을 구경한다.',0.84,0.94,0.001,74,'common','fish/normal/peeking-conger-eel_sprite.png','fish/normal/peeking-conger-eel_thumbnail.png',40,null,'fixed',false,'both','right',true),
('starflower-feather-duster','fish','별꽃 관벌레','작은 관 끝에서 별꽃 같은 아가미를 펼치는 관벌레. 분홍 깃털을 오므렸다 펴며 물속의 작은 먹이를 모은다.',0.84,0.94,0.001,78,'rare','fish/rare/starflower-feather-duster_sprite.png','fish/rare/starflower-feather-duster_thumbnail.png',165,null,'fixed',false,'both','right',true),
('amethyst-king-shrimp','fish','자수정 왕새우','자수정빛 갑각에 은빛 수염이 길게 흐르는 새우. 단단한 마디 사이로 부드러운 보랏빛이 번진다.',0.84,0.94,0.017,72,'rare','fish/rare/amethyst-king-shrimp_sprite.png','fish/rare/amethyst-king-shrimp_thumbnail.png',190,null,'crawl',true,'both','right',false),
('halfmoon-seal','fish','반달 물범','은회색 몸에 반달 모양 무늬가 박힌 물범. 짧은 지느러미로 자세를 잡으며 느긋하게 물살을 가른다.',0.2,0.8,0.03,82,'rare','fish/rare/halfmoon-seal_sprite.png','fish/rare/halfmoon-seal_thumbnail.png',200,null,'swim',true,'both','right',false),
('blue-dolphin','fish','푸른 돌고래','푸른 회색 등과 밝은 배를 가진 돌고래. 웃는 듯한 주둥이를 내밀고 바다 친구들 곁을 경쾌하게 지난다.',0.2,0.8,0.03,86,'rare','fish/rare/blue-dolphin_sprite.png','fish/rare/blue-dolphin_thumbnail.png',200,null,'swim',true,'both','right',false),
('jetblack-orca','fish','칠흑 범고래','칠흑빛 등과 선명한 흰 무늬를 가진 범고래. 커다란 꼬리를 느긋하게 저으며 넓은 바다를 여행한다.',0.2,0.8,0.03,108,'rare','fish/rare/jetblack-orca_sprite.png','fish/rare/jetblack-orca_thumbnail.png',220,null,'swim',true,'both','right',false),
('waterdrop-comb-jelly','fish','물방울 빗해파리','물방울처럼 투명한 몸에 가는 빛의 띠가 흐른다. 빗살 같은 줄을 따라 무지갯빛이 은근하게 번진다.',0.3,0.7,0.022,60,'rare','fish/rare/waterdrop-comb-jelly_sprite.png','fish/rare/waterdrop-comb-jelly_thumbnail.png',170,null,'pulse',true,'both','right',false),
('sandbutton-ray','fish','모래단추 가오리','모래빛 둥근 몸에 작은 갈색 점이 흩어진 가오리. 날개 가장자리를 팔랑이며 바닥 가까이 미끄러진다.',0.2,0.8,0.03,84,'rare','fish/rare/sandbutton-ray_sprite.png','fish/rare/sandbutton-ray_thumbnail.png',175,null,'swim',true,'both','right',false),
('giant-walrus','fish','대왕 바다코끼리','긴 상아와 풍성한 수염을 가진 커다란 바다코끼리. 묵직한 몸을 지느러미로 밀며 바닥을 천천히 누빈다.',0.84,0.94,0.017,100,'rare','fish/rare/giant-walrus_sprite.png','fish/rare/giant-walrus_thumbnail.png',230,null,'crawl',true,'both','right',false),
('sunken-windmill','fish','침수된 풍차','물속에 잠긴 오래된 돌풍차. 자개빛 날개가 물살을 받아 천천히 돌고 지붕 틈에서는 가는 해초가 흔들린다.',0.84,0.94,0.001,98,'epic','fish/epic/sunken-windmill_sprite.png','fish/epic/sunken-windmill_thumbnail.png',740,null,'fixed',false,'both','right',true),
('twilight-striped-dolphin','fish','황혼 줄무늬돌고래','짙푸른 등과 살구빛 배 사이로 청금색 줄무늬가 흐른다. 유려한 꼬리를 펼치면 저녁 바다의 빛이 따라온다.',0.2,0.8,0.03,100,'epic','fish/epic/twilight-striped-dolphin_sprite.png','fish/epic/twilight-striped-dolphin_thumbnail.png',760,null,'swim',true,'both','right',false),
('dawn-narwhal','fish','새벽을 여는 일각고래','길게 꼬인 수정빛 엄니를 가진 진주빛 일각고래. 지느러미를 펼칠 때마다 몸을 따라 옅은 새벽빛이 번진다.',0.2,0.8,0.03,118,'mythic','fish/mythic/dawn-narwhal_sprite.png','fish/mythic/dawn-narwhal_thumbnail.png',1850,null,'swim',true,'both','right',false),
('hourglass-bottle','trash','모래시계 병','모래가 밑바닥에 쌓인 모래시계 모양 유리병. 닳은 마개와 희미한 소금 자국에 오래 떠돈 시간이 남아 있다.',0.2,0.8,0.03,48,'rare',null,'trash/rare/hourglass-bottle_thumbnail.png',80,null,'swim',true,'both','right',false)
on conflict(id) do update set kind=excluded.kind,name=excluded.name,description=excluded.description,
swim_y_min=excluded.swim_y_min,swim_y_max=excluded.swim_y_max,speed=excluded.speed,size=excluded.size,
rarity=excluded.rarity,sprite_sheet_path=excluded.sprite_sheet_path,thumbnail_path=excluded.thumbnail_path,
sell_price=excluded.sell_price,native_region_id=excluded.native_region_id,movement_type=excluded.movement_type,
flip_with_direction=excluded.flip_with_direction,travel_direction=excluded.travel_direction,facing_direction=excluded.facing_direction,idle_animated=excluded.idle_animated;
insert into public.collectible_habitats(species_id,region_id)
select s.id,r.id from public.collectible_species s cross join public.regions r
where s.id in ('rainbow-mantis-shrimp','pea-sponge','tiny-sardine','peeking-conger-eel','starflower-feather-duster','amethyst-king-shrimp','halfmoon-seal','blue-dolphin','jetblack-orca','waterdrop-comb-jelly','sandbutton-ray','giant-walrus','sunken-windmill','twilight-striped-dolphin','dawn-narwhal','hourglass-bottle')
on conflict(species_id,region_id) do nothing;
notify pgrst,'reload schema';
commit;
select s.id,s.name,s.kind,s.rarity,s.is_native,s.movement_type,s.idle_animated,array_agg(h.region_id order by h.region_id) habitats
from public.collectible_species s join public.collectible_habitats h on h.species_id=s.id
where s.id in ('rainbow-mantis-shrimp','pea-sponge','tiny-sardine','peeking-conger-eel','starflower-feather-duster','amethyst-king-shrimp','halfmoon-seal','blue-dolphin','jetblack-orca','waterdrop-comb-jelly','sandbutton-ray','giant-walrus','sunken-windmill','twilight-striped-dolphin','dawn-narwhal','hourglass-bottle') group by s.id order by s.rarity,s.kind,s.id;
