-- Apply after 55. Upload assets/storage-upload/new/20261015-213344/ first.
-- Repeatable; preserves existing ownership, discoveries and placed individuals.
begin;
insert into public.collectible_species
(id,kind,name,description,swim_y_min,swim_y_max,speed,size,rarity,sprite_sheet_path,thumbnail_path,sell_price,native_region_id,movement_type,flip_with_direction,travel_direction,facing_direction,idle_animated)
values
('green-sea-turtle','fish','초록등 바다거북','초록빛 등껍질과 밝은 배를 가진 바다거북. 넓은 지느러미를 느긋하게 저으며 여러 바다를 여행한다.',0.2,0.8,0.03,78,'common','fish/normal/green-sea-turtle_sprite.png','fish/normal/green-sea-turtle_thumbnail.png',40,null,'swim',true,'both','right',false),
('coral-covered-shipwreck','decoration','산호에 덮인 난파선','오래된 선체 위에 살구빛 산호와 해초가 작은 숲을 이루었다. 찢어진 돛 끝이 산호빛 여울의 물살에 조용히 흔들린다.',null,null,0,132,'epic','decorations/epic/coral-covered-shipwreck_sprite.png','decorations/epic/coral-covered-shipwreck_thumbnail.png',780,'coral','fixed',false,'both','right',true),
('tile-fitting-crab','fish','타일맞춤 게','청록빛 타일 한 장을 등에 얹은 작은 게. 가만히 멈춰 있으면 별잠 유적의 모자이크 바닥과 구분하기 어렵다.',0.84,0.94,0.017,54,'common','fish/normal/tile-fitting-crab_sprite.png','fish/normal/tile-fitting-crab_thumbnail.png',35,'starruins','crawl',true,'both','right',false),
('teacup-nest-blenny','fish','찻잔둥지 블레니','금 간 왕실 찻잔을 보금자리로 삼은 블레니. 삼지창 문양 옆에서 고개를 내밀고 잠든 왕국을 구경한다.',0.84,0.94,0.001,62,'common','fish/normal/teacup-nest-blenny_sprite.png','fish/normal/teacup-nest-blenny_thumbnail.png',40,'starruins','fixed',false,'both','right',true),
('cracked-perfume-vial','trash','금 간 향유병','작은 손잡이가 달린 청록색 향유병. 금 간 유리와 닳은 왕국 문양 사이로 옛 궁정의 향기가 남아 있는 듯하다.',0.2,0.8,0.03,42,'common',null,'trash/normal/cracked-perfume-vial_thumbnail.png',15,'starruins','swim',true,'both','right',false),
('lost-atlantean-crown','trash','잃어버린 왕관','보석 하나가 빠진 작은 청동 왕관. 물결과 삼지창 문양 위에 가는 해초가 감겨 있다.',0.2,0.8,0.03,48,'common',null,'trash/normal/lost-atlantean-crown_thumbnail.png',20,'starruins','swim',true,'both','right',false),
('amphora-home-octopus','fish','항아리집 문어','왕국 문양이 남은 항아리를 머리에 쓴 작은 문어. 짧은 팔을 모았다 펼치며 별잠 유적의 기둥 사이를 떠다닌다.',0.3,0.7,0.022,62,'common','fish/normal/amphora-home-octopus_sprite.png','fish/normal/amphora-home-octopus_thumbnail.png',40,'starruins','pulse',true,'both','right',false),
('broken-kingdom-tile','trash','깨진 왕국 타일','깨진 타일 위에 청록빛 모자이크와 삼지창 인장이 남아 있다. 닳은 가장자리에 가라앉은 왕국의 시간이 겹친다.',0.2,0.8,0.03,46,'rare',null,'trash/rare/broken-kingdom-tile_thumbnail.png',85,'starruins','swim',true,'both','right',false),
('sunken-kingdom-fountain','decoration','잠긴 왕국 분수','조개와 대리석으로 만든 오래된 분수. 삼지창 물받이 아래 진주 같은 물방울이 오르내리며 작은 파문을 남긴다.',null,null,0,90,'rare','decorations/rare/sunken-kingdom-fountain_sprite.png','decorations/rare/sunken-kingdom-fountain_thumbnail.png',210,'starruins','fixed',false,'both','right',true),
('azure-armored-sea-turtle','fish','청금갑옷 바다거북','대리석빛 등껍질을 청금색 갑판이 감싼 거북. 물결과 삼지창 문양을 품고 잠든 궁전의 길을 느긋하게 지난다.',0.2,0.8,0.03,90,'rare','fish/rare/azure-armored-sea-turtle_sprite.png','fish/rare/azure-armored-sea-turtle_thumbnail.png',200,'starruins','swim',true,'both','right',false),
('templekeeper-moray','fish','신전지기 곰치','긴 흰 몸을 따라 금빛 기둥 홈 같은 선이 이어진다. 청록 문양을 두른 채 오래된 신전의 그늘을 살핀다.',0.2,0.8,0.03,96,'rare','fish/rare/templekeeper-moray_sprite.png','fish/rare/templekeeper-moray_thumbnail.png',210,'starruins','swim',true,'both','right',false),
('mask-changing-octopus','fish','가면바꿔 문어','작은 고대 가면을 소중히 들고 다니는 문어. 팔을 펼칠 때마다 가면을 기울이며 옛 궁정의 표정을 흉내 낸다.',0.3,0.7,0.022,76,'rare','fish/rare/mask-changing-octopus_sprite.png','fish/rare/mask-changing-octopus_thumbnail.png',195,'starruins','pulse',true,'both','right',false),
('letter-carrier-ray','fish','편지배달 가오리','배 아래 조개 편지통을 달고 다니는 가오리. 삼지창 봉인이 남은 편지를 품고 오래전에 잠든 왕국의 길을 돈다.',0.2,0.8,0.03,88,'rare','fish/rare/letter-carrier-ray_sprite.png','fish/rare/letter-carrier-ray_thumbnail.png',205,'starruins','swim',true,'both','right',false),
('atlantean-guard-shark','fish','아틀란티스 근위상어','청동빛 갑주와 청록 지느러미를 두른 상어. 왕국의 인장을 새긴 단단한 몸으로 별잠 유적의 경계를 순찰한다.',0.2,0.8,0.03,114,'epic','fish/epic/atlantean-guard-shark_sprite.png','fish/epic/atlantean-guard-shark_thumbnail.png',780,'starruins','swim',true,'both','right',false),
('living-mosaic-ray','fish','살아 있는 모자이크 가오리','자개와 청록 타일 조각이 살아 있는 날개를 이룬 가오리. 유영할 때마다 타일 틈으로 오래된 왕국의 빛이 흐른다.',0.2,0.8,0.03,108,'epic','fish/epic/living-mosaic-ray_sprite.png','fish/epic/living-mosaic-ray_thumbnail.png',760,'starruins','swim',true,'both','right',false),
('palace-lantern-anglerfish','fish','궁전등불 아귀','머리 위 작은 샹들리에로 바닷길을 밝히는 아귀. 유영에 맞춰 수정 장식들이 흔들리며 궁전의 불빛을 되살린다.',0.2,0.8,0.03,104,'epic','fish/epic/palace-lantern-anglerfish_sprite.png','fish/epic/palace-lantern-anglerfish_thumbnail.png',750,'starruins','swim',true,'both','right',false),
('atlantean-giant-squid','fish','아틀란티스 거대오징어','긴 팔과 금빛 가장자리의 지느러미를 펼친 거대오징어. 청록 몸에 새겨진 왕국 문양이 물살을 따라 은은하게 빛난다.',0.3,0.7,0.022,120,'epic','fish/epic/atlantean-giant-squid_sprite.png','fish/epic/atlantean-giant-squid_thumbnail.png',800,'starruins','pulse',true,'both','right',false),
('atlantean-sentinel','fish','아틀란티스 수호병','대리석 갑주와 청동 관절로 만들어진 고대 수호병. 한자리를 지키는 동안에도 망토와 갑주 고리가 흐르고 수정 심장이 천천히 빛난다.',0.84,0.94,0.001,150,'mythic','fish/mythic/atlantean-sentinel_sprite.png','fish/mythic/atlantean-sentinel_thumbnail.png',1950,'starruins','fixed',false,'both','right',true)
on conflict(id) do update set kind=excluded.kind,name=excluded.name,description=excluded.description,
swim_y_min=excluded.swim_y_min,swim_y_max=excluded.swim_y_max,speed=excluded.speed,size=excluded.size,
rarity=excluded.rarity,sprite_sheet_path=excluded.sprite_sheet_path,thumbnail_path=excluded.thumbnail_path,
sell_price=excluded.sell_price,native_region_id=excluded.native_region_id,movement_type=excluded.movement_type,
flip_with_direction=excluded.flip_with_direction,travel_direction=excluded.travel_direction,facing_direction=excluded.facing_direction,idle_animated=excluded.idle_animated;
-- Native species keep exactly their one region; the common turtle gets all current regions.
delete from public.collectible_habitats h using public.collectible_species s
where h.species_id=s.id and s.id in ('green-sea-turtle','coral-covered-shipwreck','tile-fitting-crab','teacup-nest-blenny','cracked-perfume-vial','lost-atlantean-crown','amphora-home-octopus','broken-kingdom-tile','sunken-kingdom-fountain','azure-armored-sea-turtle','templekeeper-moray','mask-changing-octopus','letter-carrier-ray','atlantean-guard-shark','living-mosaic-ray','palace-lantern-anglerfish','atlantean-giant-squid','atlantean-sentinel') and s.native_region_id is not null and h.region_id<>s.native_region_id;
insert into public.collectible_habitats(species_id,region_id)
select s.id,r.id from public.collectible_species s cross join public.regions r
where s.id in ('green-sea-turtle','coral-covered-shipwreck','tile-fitting-crab','teacup-nest-blenny','cracked-perfume-vial','lost-atlantean-crown','amphora-home-octopus','broken-kingdom-tile','sunken-kingdom-fountain','azure-armored-sea-turtle','templekeeper-moray','mask-changing-octopus','letter-carrier-ray','atlantean-guard-shark','living-mosaic-ray','palace-lantern-anglerfish','atlantean-giant-squid','atlantean-sentinel') and (s.native_region_id is null or r.id=s.native_region_id)
on conflict(species_id,region_id) do nothing;
notify pgrst,'reload schema';
commit;
select s.id,s.name,s.kind,s.rarity,s.is_native,s.native_region_id,s.movement_type,s.idle_animated,array_agg(h.region_id order by h.region_id) habitats
from public.collectible_species s join public.collectible_habitats h on h.species_id=s.id
where s.id in ('green-sea-turtle','coral-covered-shipwreck','tile-fitting-crab','teacup-nest-blenny','cracked-perfume-vial','lost-atlantean-crown','amphora-home-octopus','broken-kingdom-tile','sunken-kingdom-fountain','azure-armored-sea-turtle','templekeeper-moray','mask-changing-octopus','letter-carrier-ray','atlantean-guard-shark','living-mosaic-ray','palace-lantern-anglerfish','atlantean-giant-squid','atlantean-sentinel') group by s.id order by s.rarity,s.id;
