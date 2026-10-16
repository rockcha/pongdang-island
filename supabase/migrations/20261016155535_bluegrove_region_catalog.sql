-- Reviewed catalog diff: add Bluegrove only; preserve existing species, habitats and player data.
begin;
set constraints all deferred;
insert into public.regions (id,name,description,rarity,sort_order,image_path,requires_map_fragment) values
('bluegrove','푸른골 해역','맑은 청록빛 바다 아래로 푸른 골짜기가 이어져요. 완만한 암반 사이에서 새로운 물길을 따라 낚시해 보세요.','common',7,'bluegrove.png',true)
on conflict(id) do update set name=excluded.name,description=excluded.description,rarity=excluded.rarity,sort_order=excluded.sort_order,image_path=excluded.image_path,requires_map_fragment=excluded.requires_map_fragment;
insert into public.collectible_species (id,kind,name,description,swim_y_min,swim_y_max,speed,size,rarity,thumbnail_path,sell_price,sprite_sheet_path,native_region_id,movement_type,flip_with_direction,travel_direction) values
('map-bluegrove','map','푸른골 해역 지도 조각','얕은 바다 사이로 이어지는 푸른 수중 골짜기와 항로가 그려진 일반 지도 조각.',null,null,'0',60,'common','map/normal/map-bluegrove_thumbnail.png',0,null,null,'fixed',false,'both')
on conflict(id) do update set kind=excluded.kind,name=excluded.name,description=excluded.description,swim_y_min=excluded.swim_y_min,swim_y_max=excluded.swim_y_max,speed=excluded.speed,size=excluded.size,rarity=excluded.rarity,thumbnail_path=excluded.thumbnail_path,sell_price=excluded.sell_price,sprite_sheet_path=excluded.sprite_sheet_path,native_region_id=excluded.native_region_id,movement_type=excluded.movement_type,flip_with_direction=excluded.flip_with_direction,travel_direction=excluded.travel_direction;
-- Respect the target database's native species assignments (which may differ
-- from the local catalog). Never add a second habitat to another region's native.
insert into public.collectible_habitats(species_id,region_id)
select candidate.species_id,candidate.region_id
from (values
('apricot-starfish','bluegrove'),
('aurora-eel','bluegrove'),
('bean-pufferfish','bluegrove'),
('blue-bronze-horseshoe-crab','bluegrove'),
('blue-great-white','bluegrove'),
('blue-sailfish','bluegrove'),
('butter-starfish','bluegrove'),
('button-urchin','bluegrove'),
('cloud-humpback','bluegrove'),
('coral-covered-treasure-chest','bluegrove'),
('coral-house','bluegrove'),
('coral-seabream','bluegrove'),
('dawn-arowana','bluegrove'),
('dreaming-dumbo-octopus','bluegrove'),
('glass-bottle','bluegrove'),
('glassfin-lionfish','bluegrove'),
('lavender-starfish','bluegrove'),
('lost-arrow-sign','bluegrove'),
('map-bluegrove','bluegrove'),
('mint-mahi-mahi','bluegrove'),
('mint-starfish','bluegrove'),
('moon-angelfish','bluegrove'),
('moonlit-jellyfish-lantern','bluegrove'),
('night-orca','bluegrove'),
('opal-nautilus','bluegrove'),
('orange-clownfish','bluegrove'),
('peach-octopus','bluegrove'),
('peach-umbrella-jellyfish','bluegrove'),
('pearl-bearing-clam','bluegrove'),
('pearl-parrotfish','bluegrove'),
('pebble-hermit-crab','bluegrove'),
('petal-nudibranch','bluegrove'),
('pink-scallop','bluegrove'),
('plump-horse-mackerel','bluegrove'),
('pongi-statue','bluegrove'),
('pongul','bluegrove'),
('ribbon-eel','bluegrove'),
('ripple-coral-fragment','bluegrove'),
('round-barnacle-cluster','bluegrove'),
('round-filefish','bluegrove'),
('rusty-mini-anchor','bluegrove'),
('sand-goby','bluegrove'),
('sand-hammerhead','bluegrove'),
('sea-crocodile','bluegrove'),
('seashell-pinwheel','bluegrove'),
('silver-anchovy','bluegrove'),
('silver-yellowtail','bluegrove'),
('sleeping-mini-shipwreck','bluegrove'),
('sleeping-seahorse-statue','bluegrove'),
('soft-sea-cucumber','bluegrove'),
('spotted-giant-grouper','bluegrove'),
('star-ray','bluegrove'),
('star-spotted-whale-shark','bluegrove'),
('starpattern-manta','bluegrove'),
('striped-mackerel','bluegrove'),
('sunken-mailbox','bluegrove'),
('threadtail-shrimp','bluegrove'),
('tiny-cuttlefish','bluegrove'),
('tiny-wooden-sign','bluegrove')
) as candidate(species_id,region_id)
join public.collectible_species species on species.id=candidate.species_id
where species.native_region_id is null or species.native_region_id=candidate.region_id
on conflict do nothing;
insert into public.fishing_rods (id,name,price,region_id,failure_reduction_bp,native_bonus_bp) values
('bluegrove','푸른골 물길 낚싯대',1500,'bluegrove',200,200)
on conflict(id) do update set name=excluded.name,price=excluded.price,region_id=excluded.region_id,failure_reduction_bp=excluded.failure_reduction_bp,native_bonus_bp=excluded.native_bonus_bp;
notify pgrst,'reload schema';
commit;
