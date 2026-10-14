-- Requires 16/17 catalog schema. Upload ten PNGs to collectibles/fish/rare/ first.
-- Repeatable seed; preserves existing species and all player progress.
begin;
insert into public.collectible_species
  (id,kind,name,description,swim_y_min,swim_y_max,speed,size,rarity,sprite_sheet_path,thumbnail_path,sell_price)
values
  ('blue-sailfish','fish','푸른 돛새치','긴 주둥이와 커다란 돛 모양 등지느러미를 가진 물고기. 푸른 몸을 펼치며 바닷속을 시원하게 가로지른다.',.20,.70,0.065,112,'common','fish/rare/blue-sailfish_sprite.png','fish/rare/blue-sailfish_thumbnail.png',220),
  ('coral-seabream','fish','산호빛 참돔','통통하고 넓은 몸에 산호빛 비늘이 반짝이는 물고기. 큼직한 지느러미를 살랑이며 여유롭게 헤엄친다.',.20,.70,0.045,96,'common','fish/rare/coral-seabream_sprite.png','fish/rare/coral-seabream_thumbnail.png',180),
  ('spotted-giant-grouper','fish','얼룩 왕그루퍼','두툼한 몸과 큰 입, 둥근 꼬리를 가진 물고기. 연갈색 몸의 초콜릿빛 얼룩과 느긋한 움직임이 듬직하다.',.55,.85,0.03,120,'common','fish/rare/spotted-giant-grouper_sprite.png','fish/rare/spotted-giant-grouper_thumbnail.png',260),
  ('silver-yellowtail','fish','은빛 방어','굵고 길쭉한 은빛 몸에 노란 옆줄이 빛나는 물고기. 힘찬 꼬리로 물살을 가르며 묵직하게 나아간다.',.20,.70,0.06,108,'common','fish/rare/silver-yellowtail_sprite.png','fish/rare/silver-yellowtail_thumbnail.png',200),
  ('mint-mahi-mahi','fish','민트 만새기','높고 둥근 이마와 길게 이어진 등지느러미를 가진 물고기. 민트빛 몸과 연노란 지느러미가 물결 속에서 반짝인다.',.20,.70,0.055,116,'common','fish/rare/mint-mahi-mahi_sprite.png','fish/rare/mint-mahi-mahi_thumbnail.png',240)
on conflict(id) do update set
  kind=excluded.kind,name=excluded.name,description=excluded.description,
  swim_y_min=excluded.swim_y_min,swim_y_max=excluded.swim_y_max,
  speed=excluded.speed,size=excluded.size,rarity=excluded.rarity,
  sprite_sheet_path=excluded.sprite_sheet_path,thumbnail_path=excluded.thumbnail_path,
  sell_price=excluded.sell_price;
insert into public.collectible_habitats(species_id,region_id)
select s.id,r.id from public.collectible_species s cross join public.regions r
where s.id in ('blue-sailfish','coral-seabream','spotted-giant-grouper','silver-yellowtail','mint-mahi-mahi')
  and r.id in ('pongdang','coral','mistmoon','starruins','dreamabyss')
on conflict(species_id,region_id) do nothing;
commit;
-- Expect five common species, each with five habitats.
select s.id,s.name,s.rarity,s.size,s.sprite_sheet_path,s.thumbnail_path,
  array_agg(h.region_id order by h.region_id) as habitats
from public.collectible_species s left join public.collectible_habitats h on h.species_id=s.id
where s.id in ('blue-sailfish','coral-seabream','spotted-giant-grouper','silver-yellowtail','mint-mahi-mahi')
group by s.id order by s.id;
