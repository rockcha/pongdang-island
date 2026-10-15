-- Requires renamed decoration kind. Existing DB: run 25 first, then this seed.
-- Upload the three transparent PNGs to collectibles/decorations/normal/ first.
-- Repeatable catalog seed; existing player progress is preserved.
begin;
insert into public.collectible_species
  (id,kind,name,description,swim_y_min,swim_y_max,speed,size,rarity,sprite_sheet_path,thumbnail_path,sell_price)
values
  ('apricot-starfish','decoration','살구 불가사리','통통한 다섯 팔을 펼친 살구색 불가사리. 수조 벽에 착 붙어 느긋하게 바다를 구경한다.',null,null,0,52,'common',null,'decorations/normal/apricot-starfish_thumbnail.png',35),
  ('round-barnacle-cluster','decoration','동글 따개비 무리','작고 동그란 따개비들이 옹기종기 모여 있다. 벽 한쪽에 붙이면 소박한 바다 풍경이 된다.',null,null,0,46,'common',null,'decorations/normal/round-barnacle-cluster_thumbnail.png',25),
  ('rusty-mini-anchor','decoration','녹슨 꼬마 닻','붉은 녹이 슬고 고리에 짧은 밧줄이 남은 작은 닻. 작은 배가 남기고 간 작은 흔적이다.',null,null,0,58,'common',null,'decorations/normal/rusty-mini-anchor_thumbnail.png',45)
on conflict(id) do update set
  kind=excluded.kind,name=excluded.name,description=excluded.description,
  swim_y_min=excluded.swim_y_min,swim_y_max=excluded.swim_y_max,
  speed=excluded.speed,size=excluded.size,rarity=excluded.rarity,
  sprite_sheet_path=excluded.sprite_sheet_path,thumbnail_path=excluded.thumbnail_path,
  sell_price=excluded.sell_price;

insert into public.collectible_habitats(species_id,region_id)
select s.id,r.id from public.collectible_species s cross join public.regions r
where s.id in ('apricot-starfish','round-barnacle-cluster','rusty-mini-anchor')
  and r.id in ('pongdang','coral','mistmoon','starruins','dreamabyss')
on conflict(species_id,region_id) do nothing;
commit;

-- Expect three common decorations, each with five habitats.
select s.id,s.name,s.kind,s.rarity,s.size,s.sell_price,s.thumbnail_path,
  array_agg(h.region_id order by h.region_id) as habitats
from public.collectible_species s left join public.collectible_habitats h on h.species_id=s.id
where s.id in ('apricot-starfish','round-barnacle-cluster','rusty-mini-anchor')
group by s.id order by s.id;
