-- Requires 16/17 schema. Upload ten PNGs to collectibles/fish/rare/ first.
-- Sharks and whales use game kind fish (aquarium swimmer), not biological classification.
-- Repeatable seed; preserves existing species and all player progress.
begin;
insert into public.collectible_species
  (id,kind,name,description,swim_y_min,swim_y_max,speed,size,rarity,sprite_sheet_path,thumbnail_path,sell_price)
values
  ('blue-great-white','fish','푸른 백상아리','묵직한 몸과 뾰족한 등지느러미를 가진 상어. 푸른 회색 등 아래 크림빛 배가 드러나고, 작은 이빨 사이로 장난스러운 미소가 보인다.',0.15,0.80,0.055,136,'rare','fish/rare/blue-great-white_sprite.png','fish/rare/blue-great-white_thumbnail.png',380),
  ('sand-hammerhead','fish','모래 귀상어','양옆으로 넓게 펼쳐진 머리가 특징인 상어. 모래빛 몸과 민트빛 지느러미로 물살을 가르며 주변을 천천히 살핀다.',0.15,0.80,0.05,128,'rare','fish/rare/sand-hammerhead_sprite.png','fish/rare/sand-hammerhead_thumbnail.png',340),
  ('star-spotted-whale-shark','fish','별점 고래상어','넓고 둥근 머리와 거대한 몸을 가진 상어. 남색 등에 작은 흰 점들이 별처럼 빛나며 느긋하게 바다를 누빈다.',0.15,0.80,0.035,160,'rare','fish/rare/star-spotted-whale-shark_sprite.png','fish/rare/star-spotted-whale-shark_thumbnail.png',480),
  ('night-orca','fish','밤빛 범고래','짙은 보랏빛 몸에 하얀 눈 옆 무늬와 높은 등지느러미가 돋보이는 고래. 넓은 꼬리로 물살을 밀며 힘차게 헤엄친다.',0.15,0.80,0.045,148,'rare','fish/rare/night-orca_sprite.png','fish/rare/night-orca_thumbnail.png',450),
  ('cloud-humpback','fish','구름 혹등고래','둥근 청회색 몸과 긴 가슴지느러미를 가진 고래. 하얀 배와 넓은 꼬리를 펼쳐 구름처럼 느긋하게 물속을 지나간다.',0.15,0.80,0.03,172,'rare','fish/rare/cloud-humpback_sprite.png','fish/rare/cloud-humpback_thumbnail.png',520)
on conflict(id) do update set
  kind=excluded.kind,name=excluded.name,description=excluded.description,
  swim_y_min=excluded.swim_y_min,swim_y_max=excluded.swim_y_max,
  speed=excluded.speed,size=excluded.size,rarity=excluded.rarity,
  sprite_sheet_path=excluded.sprite_sheet_path,thumbnail_path=excluded.thumbnail_path,
  sell_price=excluded.sell_price;
insert into public.collectible_habitats(species_id,region_id)
select s.id,r.id from public.collectible_species s cross join public.regions r
where s.id in ('blue-great-white','sand-hammerhead','star-spotted-whale-shark','night-orca','cloud-humpback')
  and r.id in ('pongdang','coral','mistmoon','starruins','dreamabyss')
on conflict(species_id,region_id) do nothing;
commit;
-- Expect five rare species with five habitats each.
select s.id,s.name,s.rarity,s.size,s.sell_price,s.sprite_sheet_path,s.thumbnail_path,
  array_agg(h.region_id order by h.region_id) as habitats
from public.collectible_species s left join public.collectible_habitats h on h.species_id=s.id
where s.id in ('blue-great-white','sand-hammerhead','star-spotted-whale-shark','night-orca','cloud-humpback')
group by s.id order by s.id;
