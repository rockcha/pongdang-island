-- Apply after 27 (which enables rare decorations).
-- Upload the five flat PNGs in assets/storage-upload/new/ using the target
-- paths listed in assets/storage-upload/new/coastal-decorations.json.
-- Repeatable; preserves ownership, discoveries and placements.
begin;
insert into public.collectible_species
  (id,kind,name,description,swim_y_min,swim_y_max,speed,size,rarity,sprite_sheet_path,thumbnail_path,sell_price)
values
  ('lost-arrow-sign','decoration','길 잃은 화살표 팻말','파도에 닳은 나무 화살표에 작은 조개가 매달려 있다. 어디를 가리키는지는 잊었지만, 내 바다에서는 새로운 길의 시작이 된다.',null,null,0,56,'common',null,'decorations/normal/lost-arrow-sign_thumbnail.png',40),
  ('seashell-pinwheel','decoration','소라빛 바람개비','소라껍데기처럼 부드러운 빛깔을 두른 작은 바람개비. 바닷바람이 남긴 색을 간직한 채 물속에 아기자기한 쉼터를 꾸며 준다.',null,null,0,56,'common',null,'decorations/normal/seashell-pinwheel_thumbnail.png',40),
  ('pearl-bearing-clam','decoration','진주 품은 조개','살짝 열린 분홍빛 조개 안에 둥근 진주 한 알이 잠들어 있다. 오랜 시간 바다가 품어 온 작은 보물이다.',null,null,0,62,'common',null,'decorations/rare/pearl-bearing-clam_thumbnail.png',45),
  ('sleeping-mini-shipwreck','decoration','잠든 꼬마 난파선','돛을 잃고 바닷속에 내려앉은 작은 나무배. 부서진 선실 사이로 바다 친구들이 드나들며 새로운 이야기를 채워 간다.',null,null,0,90,'rare',null,'decorations/rare/sleeping-mini-shipwreck_thumbnail.png',190),
  ('sunken-mailbox','decoration','잠긴 우체통','미역 줄기가 느슨하게 감기고 작은 따개비가 붙은 오래된 우체통. 전하지 못한 바다의 소식을 조용히 간직하고 있다.',null,null,0,64,'rare',null,'decorations/rare/sunken-mailbox_thumbnail.png',170)
on conflict(id) do update set
  kind=excluded.kind,name=excluded.name,description=excluded.description,
  swim_y_min=excluded.swim_y_min,swim_y_max=excluded.swim_y_max,
  speed=excluded.speed,size=excluded.size,rarity=excluded.rarity,
  sprite_sheet_path=excluded.sprite_sheet_path,thumbnail_path=excluded.thumbnail_path,
  sell_price=excluded.sell_price;

insert into public.collectible_habitats(species_id,region_id)
select s.id,r.id from public.collectible_species s cross join public.regions r
where s.id in ('lost-arrow-sign','seashell-pinwheel','pearl-bearing-clam','sleeping-mini-shipwreck','sunken-mailbox')
  and r.id in ('pongdang','coral','mistmoon','starruins','dreamabyss')
on conflict(species_id,region_id) do nothing;
commit;

select s.id,s.name,s.kind,s.rarity,s.size,s.sell_price,s.thumbnail_path,
  array_agg(h.region_id order by h.region_id) as habitats
from public.collectible_species s left join public.collectible_habitats h on h.species_id=s.id
where s.id in ('lost-arrow-sign','seashell-pinwheel','pearl-bearing-clam','sleeping-mini-shipwreck','sunken-mailbox')
group by s.id order by s.id;
