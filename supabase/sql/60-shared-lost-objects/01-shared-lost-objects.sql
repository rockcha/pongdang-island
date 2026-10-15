-- Apply after 59. Upload assets/storage-upload/new/20261015-232647/ first.
-- Repeatable; preserves ownership, discoveries and placements.
begin;
insert into public.collectible_species
(id,kind,name,description,swim_y_min,swim_y_max,speed,size,rarity,sprite_sheet_path,thumbnail_path,sell_price,native_region_id,movement_type,flip_with_direction,travel_direction,facing_direction,idle_animated)
values
('empty-film-canister','trash','빈 필름통','빛을 담던 필름은 사라지고 빈 통만 남았다. 닳은 뚜껑 안쪽에 작은 모래알이 굴러다닌다.',0.5,0.9,0.01,40,'common',null,'trash/normal/empty-film-canister_thumbnail.png',12,null,'swim',false,'both','front',false),
('tangled-kite-spool','trash','엉킨 연실 얼레','나무 얼레에 빛바랜 연실이 어지럽게 감겨 있다. 하늘로 향하던 실 끝이 이제 물결을 따라 흔들린다.',0.5,0.9,0.01,48,'common',null,'trash/normal/tangled-kite-spool_thumbnail.png',16,null,'swim',false,'both','front',false),
('chipped-lucky-die','trash','이 빠진 주사위','모서리 하나가 닳아 없어진 작은 주사위. 파란 눈금 사이로 누군가의 오래된 놀이가 남아 있다.',0.5,0.9,0.01,36,'common',null,'trash/normal/chipped-lucky-die_thumbnail.png',10,null,'swim',false,'both','front',false),
('bent-magnifying-glass','trash','휘어진 돋보기','테두리가 살짝 휘어진 낡은 돋보기. 금 간 유리 너머로 보면 평범한 모래알도 낯선 보물처럼 보인다.',0.5,0.9,0.01,46,'common',null,'trash/normal/bent-magnifying-glass_thumbnail.png',18,null,'swim',false,'both','front',false),
('wandering-pocket-compass','trash','길 잃은 회중나침반','바늘이 한 방향에 멈춰 버린 회중나침반. 돌아갈 길은 잊었지만 손때 묻은 황동빛은 아직 남아 있다.',0.5,0.9,0.01,50,'rare',null,'trash/rare/wandering-pocket-compass_thumbnail.png',85,null,'swim',false,'both','front',false)
on conflict(id) do update set kind=excluded.kind,name=excluded.name,description=excluded.description,
swim_y_min=excluded.swim_y_min,swim_y_max=excluded.swim_y_max,speed=excluded.speed,size=excluded.size,
rarity=excluded.rarity,sprite_sheet_path=excluded.sprite_sheet_path,thumbnail_path=excluded.thumbnail_path,
sell_price=excluded.sell_price,native_region_id=excluded.native_region_id,movement_type=excluded.movement_type,
flip_with_direction=excluded.flip_with_direction,travel_direction=excluded.travel_direction,facing_direction=excluded.facing_direction,idle_animated=excluded.idle_animated;
insert into public.collectible_habitats(species_id,region_id)
select s.id,r.id from public.collectible_species s cross join public.regions r where s.id in ('empty-film-canister','tangled-kite-spool','chipped-lucky-die','bent-magnifying-glass','wandering-pocket-compass')
on conflict(species_id,region_id) do nothing;
notify pgrst,'reload schema';
commit;
select s.id,s.name,s.kind,s.rarity,s.sell_price,s.is_native,s.thumbnail_path,array_agg(h.region_id order by h.region_id) habitats
from public.collectible_species s join public.collectible_habitats h on h.species_id=s.id
where s.id in ('empty-film-canister','tangled-kite-spool','chipped-lucky-die','bent-magnifying-glass','wandering-pocket-compass') group by s.id order by s.rarity,s.id;
