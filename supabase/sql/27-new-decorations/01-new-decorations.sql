-- Apply after 25/26. Upload assets/storage-upload/new/decorations/ to
-- the collectibles bucket's decorations/ prefix before running this seed.
-- Repeatable; preserves ownership, discoveries and placements.
begin;

-- 16 restricted every non-fish item to common. Decorations now have rarities;
-- trash and base map catalog entries retain their existing common-only rule.
alter table public.collectible_species drop constraint if exists collectible_nonfish_common;
alter table public.collectible_species add constraint collectible_nonfish_common
  check (kind in ('fish','decoration') or rarity='common');

insert into public.collectible_species
  (id,kind,name,description,swim_y_min,swim_y_max,speed,size,rarity,sprite_sheet_path,thumbnail_path,sell_price)
values
  ('lavender-starfish','decoration','라벤더 불가사리','연보랏빛 다섯 팔에 작은 진주 같은 돌기가 돋아 있다. 어항 벽에 붙어 조용히 바다를 바라본다.',null,null,0,52,'common',null,'decorations/normal/lavender-starfish_thumbnail.png',35),
  ('mint-starfish','decoration','민트 불가사리','짧고 통통한 팔을 펼친 민트빛 불가사리. 작은 크림색 돌기가 시원한 바다 색과 어우러진다.',null,null,0,50,'common',null,'decorations/normal/mint-starfish_thumbnail.png',35),
  ('tiny-wooden-sign','decoration','꼬마 나무 팻말','파도에 닳은 작은 나무판에 물고기 모양이 새겨져 있다. 내 작은 바다에 아늑한 길잡이가 되어 준다.',null,null,0,54,'common',null,'decorations/normal/tiny-wooden-sign_thumbnail.png',40),
  ('ripple-coral-fragment','decoration','물결 산호 조각','살구빛과 분홍빛이 겹겹이 번지는 작은 부채 모양 산호. 물결처럼 굽은 가장자리에 바다의 시간이 남아 있다.',null,null,0,62,'rare',null,'decorations/rare/ripple-coral-fragment_thumbnail.png',150),
  ('butter-starfish','decoration','버터 불가사리','부드러운 버터빛 몸에 주황색 점이 콕콕 박힌 불가사리. 둥근 팔을 펼치면 작은 햇살을 붙여 둔 듯하다.',null,null,0,54,'rare',null,'decorations/rare/butter-starfish_thumbnail.png',140)
on conflict(id) do update set
  kind=excluded.kind,name=excluded.name,description=excluded.description,
  swim_y_min=excluded.swim_y_min,swim_y_max=excluded.swim_y_max,
  speed=excluded.speed,size=excluded.size,rarity=excluded.rarity,
  sprite_sheet_path=excluded.sprite_sheet_path,thumbnail_path=excluded.thumbnail_path,
  sell_price=excluded.sell_price;

insert into public.collectible_habitats(species_id,region_id)
select s.id,r.id from public.collectible_species s cross join public.regions r
where s.id in ('lavender-starfish','mint-starfish','tiny-wooden-sign','ripple-coral-fragment','butter-starfish')
  and r.id in ('pongdang','coral','mistmoon','starruins','dreamabyss')
on conflict(species_id,region_id) do nothing;
commit;

select s.id,s.name,s.kind,s.rarity,s.size,s.sell_price,s.thumbnail_path,
  array_agg(h.region_id order by h.region_id) as habitats
from public.collectible_species s left join public.collectible_habitats h on h.species_id=s.id
where s.id in ('lavender-starfish','mint-starfish','tiny-wooden-sign','ripple-coral-fragment','butter-starfish')
group by s.id order by s.id;
