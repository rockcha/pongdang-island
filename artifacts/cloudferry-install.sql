-- Reviewed catalog diff: add Cloud Ferry route, map, rod and shared habitats only. Safe to rerun.
begin;
insert into public.regions (id,name,description,rarity,sort_order,image_path,requires_map_fragment) values ('cloudferry','지브리의 구름나루','낮은 구름 사이로 초록 섬과 작은 나루가 이어져요. 먼 물가의 붉은 목욕탕과 언덕 위 움직이는 성을 바라보며 낚시해 보세요.','common',9,'cloudferry.png',true)
on conflict(id) do update set name=excluded.name,description=excluded.description,rarity=excluded.rarity,sort_order=excluded.sort_order,image_path=excluded.image_path,requires_map_fragment=excluded.requires_map_fragment;
insert into public.region_maps (region_id,price,thumbnail_path) values ('cloudferry',2500,'map/routes/map-cloudferry_thumbnail.png')
on conflict(region_id) do update set price=excluded.price,thumbnail_path=excluded.thumbnail_path;
insert into public.fishing_rods (id,name,price,region_id,failure_reduction_bp,native_bonus_bp) values ('cloudferry','구름나루 바람 낚싯대',1500,'cloudferry',200,200)
on conflict(id) do update set name=excluded.name,price=excluded.price,region_id=excluded.region_id,failure_reduction_bp=excluded.failure_reduction_bp,native_bonus_bp=excluded.native_bonus_bp;
-- Respect remote-native differences: never import another region's exclusive species.
insert into public.collectible_habitats(species_id,region_id)
select id,'cloudferry' from public.collectible_species where id in ('apricot-starfish','aurora-eel','bean-pufferfish','billowsail-sailfish','blue-bronze-horseshoe-crab','blue-great-white','blue-sailfish','butter-starfish','button-urchin','cloud-humpback','coral-covered-treasure-chest','coral-house','coral-seabream','dreaming-dumbo-octopus','giant-seabass','glass-bottle','glassfin-lionfish','goldstripe-amberjack','lavender-starfish','lost-arrow-sign','mint-mahi-mahi','mint-starfish','moon-angelfish','moonlit-jellyfish-lantern','night-orca','opal-nautilus','orange-clownfish','peach-octopus','peach-umbrella-jellyfish','pearl-bearing-clam','pearl-parrotfish','pebble-hermit-crab','petal-nudibranch','pink-scallop','plump-horse-mackerel','pongi-statue','pongul','ribbon-eel','ripple-coral-fragment','round-barnacle-cluster','round-filefish','rusty-mini-anchor','sand-goby','sand-hammerhead','scale-armored-barracuda','sea-crocodile','seashell-pinwheel','seawing-giant-manta','silver-anchovy','silver-yellowtail','silverblade-swordfish','sleeping-mini-shipwreck','sleeping-seahorse-statue','soft-sea-cucumber','spotted-giant-grouper','star-ray','star-spotted-whale-shark','starpattern-manta','steelback-bluefin-tuna','striped-mackerel','sunken-mailbox','threadtail-shrimp','tiny-cuttlefish','tiny-wooden-sign') and native_region_id is null and kind<>'map'
on conflict do nothing;
-- Keep existing odds in every other region. Cloud Ferry temporarily rolls epic instead of a missing mythic.
create or replace function app_private.regional_bait_odds(p_bait_id text,p_region_id text) returns jsonb
language plpgsql stable set search_path='' as $$
declare b public.fishing_baits;v_rank integer;v_success integer;v_c integer;v_r integer;v_e integer;v_m integer;
begin
 select * into b from public.fishing_baits where id=p_bait_id;
 if not found then raise exception 'INVALID_BAIT';end if;
 select case rarity when 'common' then 0 when 'rare' then 1 when 'epic' then 2 else 3 end into v_rank from public.regions where id=p_region_id;
 if not found then raise exception 'REGION_NOT_FOUND';end if;
 if b.effect_kind='decoration' then return jsonb_build_object('common_bp',0,'rare_bp',0,'epic_bp',0,'mythic_bp',0,'failure_bp',0);end if;
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
 if p_region_id in('whitenight','cloudferry') and not exists(
  select 1 from public.collectible_species s join public.collectible_habitats h on h.species_id=s.id
  where h.region_id=p_region_id and s.kind='fish' and s.rarity='mythic'
 ) then v_e:=v_e+v_m;v_m:=0;end if;
 return jsonb_build_object('common_bp',v_c,'rare_bp',v_r,'epic_bp',v_e,'mythic_bp',v_m,'failure_bp',b.failure_bp);
end $$;

notify pgrst,'reload schema';
commit;
