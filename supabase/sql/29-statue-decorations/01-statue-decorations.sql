-- Apply after 28. Upload the four new flat PNGs in assets/storage-upload/new/
-- using statue-decorations.json's Storage paths. Existing clam image stays put.
-- Repeatable; preserves owned individuals, discoveries and placements.
begin;

update public.collectible_species set rarity='common',sell_price=45
where id='pearl-bearing-clam' and kind='decoration';

insert into public.collectible_species
  (id,kind,name,description,swim_y_min,swim_y_max,speed,size,rarity,sprite_sheet_path,thumbnail_path,sell_price)
values
  ('moonlit-jellyfish-lantern','decoration','달빛 해파리 풍등','해파리를 닮은 작은 풍등. 은은한 달빛을 머금고 바닷속 길을 밝혀 준다.',null,null,0,62,'rare',null,'decorations/rare/moonlit-jellyfish-lantern_thumbnail.png',160),
  ('coral-covered-treasure-chest','decoration','산호 덮인 보물상자','오래된 상자 위에 산호가 작은 정원을 만들었다. 뚜껑 사이에는 누군가의 반짝이는 기억이 남아 있다.',null,null,0,72,'rare',null,'decorations/rare/coral-covered-treasure-chest_thumbnail.png',190),
  ('sleeping-seahorse-statue','decoration','잠든 해마 석상','둥근 꼬리를 감고 잠든 작은 해마 석상. 오랫동안 같은 자리에서 바다 친구들의 꿈을 지켜 왔다.',null,null,0,68,'rare',null,'decorations/rare/sleeping-seahorse-statue_thumbnail.png',170),
  ('pongi-statue','decoration','퐁이 석상','작은 조개를 품고 앉은 퐁이의 모습을 돌에 새겼다. 머리 위 불가사리와 다정한 미소가 오래도록 내 작은 바다를 지켜 준다.',null,null,0,86,'epic',null,'decorations/epic/pongi-statue_thumbnail.png',600)
on conflict(id) do update set
  kind=excluded.kind,name=excluded.name,description=excluded.description,
  swim_y_min=excluded.swim_y_min,swim_y_max=excluded.swim_y_max,
  speed=excluded.speed,size=excluded.size,rarity=excluded.rarity,
  sprite_sheet_path=excluded.sprite_sheet_path,thumbnail_path=excluded.thumbnail_path,
  sell_price=excluded.sell_price;

insert into public.collectible_habitats(species_id,region_id)
select s.id,r.id from public.collectible_species s cross join public.regions r
where s.id in ('moonlit-jellyfish-lantern','coral-covered-treasure-chest','sleeping-seahorse-statue','pongi-statue')
  and r.id in ('pongdang','coral','mistmoon','starruins','dreamabyss')
on conflict(species_id,region_id) do nothing;
commit;

select s.id,s.name,s.kind,s.rarity,s.size,s.sell_price,s.thumbnail_path,
  array_agg(h.region_id order by h.region_id) as habitats
from public.collectible_species s left join public.collectible_habitats h on h.species_id=s.id
where s.id in ('pearl-bearing-clam','moonlit-jellyfish-lantern','coral-covered-treasure-chest','sleeping-seahorse-statue','pongi-statue')
group by s.id order by s.id;
