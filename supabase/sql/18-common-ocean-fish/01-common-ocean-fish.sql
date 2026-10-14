-- Apply after 16/17, after uploading the ten PNGs to collectibles/fish/normal/.
-- Repeatable content seed. Existing ownership and progress are preserved.
begin;

insert into public.collectible_species
  (id,kind,name,description,swim_y_min,swim_y_max,speed,size,rarity,sprite_sheet_path,thumbnail_path,sell_price)
values
  ('silver-anchovy','fish','은빛 멸치','가늘고 작은 몸에 반짝이는 은빛 비늘을 가진 물고기. 꼬리를 부지런히 흔들며 헤엄칠 때마다 작은 빛이 일렁인다.',0.15,0.45,0.085,48,'common','fish/normal/silver-anchovy_sprite.png','fish/normal/silver-anchovy_thumbnail.png',20),
  ('striped-mackerel','fish','줄무늬 고등어','푸른 등에 짙은 물결무늬가 새겨진 물고기. 날렵한 몸으로 바닷속을 빠르게 가로지르는 활발한 개체.',0.25,0.65,0.075,76,'common','fish/normal/striped-mackerel_sprite.png','fish/normal/striped-mackerel_thumbnail.png',40),
  ('plump-horse-mackerel','fish','통통 전갱이','은빛 몸과 연노란 꼬리가 특징인 물고기. 지느러미를 부지런히 움직이며 주변을 호기심 있게 돌아다닌다.',0.30,0.70,0.065,68,'common','fish/normal/plump-horse-mackerel_sprite.png','fish/normal/plump-horse-mackerel_thumbnail.png',35),
  ('sand-goby','fish','모래 망둑어','모래빛 몸에 작은 얼룩이 흩어진 물고기. 바닥 가까이에서 꼬리를 살랑이며 느긋하게 움직이는 모습이 귀엽다.',0.70,0.90,0.030,54,'common','fish/normal/sand-goby_sprite.png','fish/normal/sand-goby_thumbnail.png',25),
  ('round-filefish','fish','동글 쥐치','납작하고 둥근 몸에 작은 입을 가진 물고기. 작은 지느러미를 팔랑이며 헤엄치고, 주변을 콕콕 건드리며 탐색한다.',0.35,0.75,0.040,64,'common','fish/normal/round-filefish_sprite.png','fish/normal/round-filefish_thumbnail.png',30)
on conflict(id) do update set
  kind=excluded.kind,name=excluded.name,description=excluded.description,
  swim_y_min=excluded.swim_y_min,swim_y_max=excluded.swim_y_max,
  speed=excluded.speed,size=excluded.size,rarity=excluded.rarity,
  sprite_sheet_path=excluded.sprite_sheet_path,thumbnail_path=excluded.thumbnail_path,
  sell_price=excluded.sell_price;

insert into public.collectible_habitats(species_id,region_id)
select s.id,r.id
from public.collectible_species s cross join public.regions r
where s.id in ('silver-anchovy','striped-mackerel','plump-horse-mackerel','sand-goby','round-filefish')
  and r.id in ('pongdang','coral','mistmoon')
on conflict(species_id,region_id) do nothing;

commit;

-- Verification: expect five rows, each with the three initial habitats.
select s.id,s.name,s.rarity,s.sprite_sheet_path,s.thumbnail_path,
  array_agg(h.region_id order by h.region_id) as habitats
from public.collectible_species s
left join public.collectible_habitats h on h.species_id=s.id
where s.id in ('silver-anchovy','striped-mackerel','plump-horse-mackerel','sand-goby','round-filefish')
group by s.id order by s.id;
