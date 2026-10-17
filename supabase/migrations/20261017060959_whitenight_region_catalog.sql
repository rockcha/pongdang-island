-- Reviewed catalog diff: add White-night route, map product, rod and shared habitats only.
begin;
insert into public.regions (id,name,description,rarity,sort_order,image_path,requires_map_fragment) values
('whitenight','백야의 빙해','해가 지지 않는 옅은 금빛 하늘 아래, 푸른 빙벽과 유빙 사이로 맑은 물길이 이어져요.','common',8,'whitenight.png',true)
on conflict(id) do update set name=excluded.name,description=excluded.description,rarity=excluded.rarity,sort_order=excluded.sort_order,image_path=excluded.image_path,requires_map_fragment=excluded.requires_map_fragment;
insert into public.region_maps (region_id,price,thumbnail_path) values
('whitenight',3500,'map/routes/map-whitenight_thumbnail.png')
on conflict(region_id) do update set price=excluded.price,thumbnail_path=excluded.thumbnail_path;
insert into public.fishing_rods (id,name,price,region_id,failure_reduction_bp,native_bonus_bp) values
('whitenight','백야 서리 낚싯대',1500,'whitenight',200,200)
on conflict(id) do update set name=excluded.name,price=excluded.price,region_id=excluded.region_id,failure_reduction_bp=excluded.failure_reduction_bp,native_bonus_bp=excluded.native_bonus_bp;
insert into public.collectible_habitats(species_id,region_id) values
('apricot-starfish','whitenight'),
('aurora-eel','whitenight'),
('bean-pufferfish','whitenight'),
('billowsail-sailfish','whitenight'),
('blue-bronze-horseshoe-crab','whitenight'),
('blue-great-white','whitenight'),
('blue-sailfish','whitenight'),
('butter-starfish','whitenight'),
('button-urchin','whitenight'),
('cloud-humpback','whitenight'),
('coral-covered-treasure-chest','whitenight'),
('coral-house','whitenight'),
('coral-seabream','whitenight'),
('dreaming-dumbo-octopus','whitenight'),
('giant-seabass','whitenight'),
('glass-bottle','whitenight'),
('glassfin-lionfish','whitenight'),
('goldstripe-amberjack','whitenight'),
('lavender-starfish','whitenight'),
('lost-arrow-sign','whitenight'),
('mint-mahi-mahi','whitenight'),
('mint-starfish','whitenight'),
('moon-angelfish','whitenight'),
('moonlit-jellyfish-lantern','whitenight'),
('night-orca','whitenight'),
('opal-nautilus','whitenight'),
('orange-clownfish','whitenight'),
('peach-octopus','whitenight'),
('peach-umbrella-jellyfish','whitenight'),
('pearl-bearing-clam','whitenight'),
('pearl-parrotfish','whitenight'),
('pebble-hermit-crab','whitenight'),
('petal-nudibranch','whitenight'),
('pink-scallop','whitenight'),
('plump-horse-mackerel','whitenight'),
('pongi-statue','whitenight'),
('pongul','whitenight'),
('ribbon-eel','whitenight'),
('ripple-coral-fragment','whitenight'),
('round-barnacle-cluster','whitenight'),
('round-filefish','whitenight'),
('rusty-mini-anchor','whitenight'),
('sand-goby','whitenight'),
('sand-hammerhead','whitenight'),
('scale-armored-barracuda','whitenight'),
('sea-crocodile','whitenight'),
('seashell-pinwheel','whitenight'),
('seawing-giant-manta','whitenight'),
('silver-anchovy','whitenight'),
('silver-yellowtail','whitenight'),
('silverblade-swordfish','whitenight'),
('sleeping-mini-shipwreck','whitenight'),
('sleeping-seahorse-statue','whitenight'),
('soft-sea-cucumber','whitenight'),
('spotted-giant-grouper','whitenight'),
('star-ray','whitenight'),
('star-spotted-whale-shark','whitenight'),
('starpattern-manta','whitenight'),
('steelback-bluefin-tuna','whitenight'),
('striped-mackerel','whitenight'),
('sunken-mailbox','whitenight'),
('threadtail-shrimp','whitenight'),
('tiny-cuttlefish','whitenight'),
('tiny-wooden-sign','whitenight')
on conflict do nothing;
-- Until a White-night mythic is registered, move its probability to epic.
-- The original odds remain unchanged in every other region.
create or replace function app_private.regional_bait_odds(p_bait_id text,p_region_id text) returns jsonb
language plpgsql stable set search_path='' as $$
declare b public.fishing_baits;v_rank integer;v_success integer;v_c integer;v_r integer;v_e integer;v_m integer;
begin
 select * into b from public.fishing_baits where id=p_bait_id;
 if not found then raise exception 'INVALID_BAIT'; end if;
 select case rarity when 'common' then 0 when 'rare' then 1 when 'epic' then 2 else 3 end into v_rank from public.regions where id=p_region_id;
 if not found then raise exception 'REGION_NOT_FOUND'; end if;
 if b.effect_kind='decoration' then return jsonb_build_object('common_bp',0,'rare_bp',0,'epic_bp',0,'mythic_bp',0,'failure_bp',0); end if;
 v_success:=10000-b.failure_bp;
 if b.common_bp>0 then
  v_r:=1300+300*v_rank;v_e:=180+80*v_rank;v_m:=20+20*v_rank;
 elsif b.rare_bp>0 then
  v_r:=9870-50*v_rank;v_e:=100+40*v_rank;v_m:=30+10*v_rank;
 elsif b.epic_bp>0 then
  v_r:=0;v_e:=9970-20*v_rank;v_m:=30+20*v_rank;
 else v_r:=0;v_e:=0;v_m:=10000;end if;
 v_m:=floor(v_success::numeric*v_m/10000);v_e:=floor(v_success::numeric*v_e/10000);
 if b.common_bp>0 then v_r:=floor(v_success::numeric*v_r/10000);v_c:=v_success-v_r-v_e-v_m;
 elsif b.rare_bp>0 then v_c:=0;v_r:=v_success-v_e-v_m;
 elsif b.epic_bp>0 then v_c:=0;v_r:=0;v_e:=v_success-v_m;
 else v_c:=0;v_r:=0;v_e:=0;v_m:=v_success;end if;
 if p_region_id='whitenight' and not exists(
  select 1 from public.collectible_species s join public.collectible_habitats h on h.species_id=s.id
  where h.region_id=p_region_id and s.kind='fish' and s.rarity='mythic'
 ) then v_e:=v_e+v_m;v_m:=0;end if;
 return jsonb_build_object('common_bp',v_c,'rare_bp',v_r,'epic_bp',v_e,'mythic_bp',v_m,'failure_bp',b.failure_bp);
end $$;

notify pgrst,'reload schema';
commit;
