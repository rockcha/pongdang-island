-- Apply after 36. Upload the 36 PNGs from assets/storage-upload/new/20261015-124837/ first.
-- Repeatable; preserves ownership, discoveries and placements.
begin;
insert into public.collectible_species
 (id,kind,name,description,swim_y_min,swim_y_max,speed,size,rarity,sprite_sheet_path,thumbnail_path,sell_price,native_region_id,movement_type,flip_with_direction,travel_direction)
values
 ('bean-pufferfish','fish','콩알 복어','작은 콩처럼 동그란 몸에 짧은 가시가 돋아 있다. 노란 지느러미를 파닥이며 바다 친구들 사이를 오간다.',0.18,0.8,0.045,52,'common','fish/normal/bean-pufferfish_sprite.png','fish/normal/bean-pufferfish_thumbnail.png',35,null,'swim',true,'both'),
 ('orange-clownfish','fish','흰동가리','선명한 주황빛 몸에 하얀 띠가 둘러져 있다. 작은 지느러미를 부지런히 움직이며 느긋하게 헤엄친다.',0.18,0.8,0.045,54,'common','fish/normal/orange-clownfish_sprite.png','fish/normal/orange-clownfish_thumbnail.png',35,null,'swim',true,'both'),
 ('threadtail-shrimp','fish','실꼬리 새우','반투명한 몸 앞에서 실처럼 가는 수염이 살랑인다. 바닥을 종종 걸으며 모래 사이 작은 먹이를 찾는다.',0.86,0.95,0.022,48,'common','fish/normal/threadtail-shrimp_sprite.png','fish/normal/threadtail-shrimp_thumbnail.png',30,null,'crawl',true,'both'),
 ('button-urchin','fish','단추 성게','단추처럼 둥근 몸에 짧은 밤색 가시가 촘촘하다. 눈에 띄지 않을 만큼 천천히 바닥을 돌아다닌다.',0.86,0.95,0.022,46,'common','fish/normal/button-urchin_sprite.png','fish/normal/button-urchin_thumbnail.png',30,null,'crawl',false,'both'),
 ('soft-sea-cucumber','fish','말랑 해삼','말랑한 연갈색 몸에 작은 돌기가 오돌토돌 솟아 있다. 모래 위를 느릿느릿 지나며 바닥을 깨끗이 한다.',0.86,0.95,0.022,54,'common','fish/normal/soft-sea-cucumber_sprite.png','fish/normal/soft-sea-cucumber_thumbnail.png',30,null,'crawl',true,'both'),
 ('ribbon-eel','fish','리본 장어','가느다란 푸른 몸을 따라 노란 지느러미가 이어진다. 리본을 풀어 놓은 듯 부드럽게 몸을 굽히며 헤엄친다.',0.18,0.8,0.045,74,'common','fish/normal/ribbon-eel_sprite.png','fish/normal/ribbon-eel_thumbnail.png',45,null,'swim',true,'both'),
 ('pink-scallop','fish','분홍 가리비','분홍빛 부채 모양 껍데기를 살짝 열었다 닫는다. 물을 밀어 내며 작은 박자로 바닷속을 떠다닌다.',0.22,0.78,0.03,52,'common','fish/normal/pink-scallop_sprite.png','fish/normal/pink-scallop_thumbnail.png',35,null,'pulse',false,'both'),
 ('tiny-cuttlefish','fish','꼬마 갑오징어','둥근 몸 양옆에 물결 같은 지느러미가 달려 있다. 짧은 팔을 모으고 몸을 오므리며 통통 떠오른다.',0.22,0.78,0.03,56,'common','fish/normal/tiny-cuttlefish_sprite.png','fish/normal/tiny-cuttlefish_thumbnail.png',40,null,'pulse',false,'both'),
 ('peach-octopus','fish','복숭아 문어','복숭앗빛 둥근 머리 아래 통통한 여덟 팔이 모여 있다. 팔을 오므렸다 펼치며 물결에 몸을 맡긴다.',0.22,0.78,0.03,60,'common','fish/normal/peach-octopus_sprite.png','fish/normal/peach-octopus_thumbnail.png',45,null,'pulse',false,'both'),
 ('pearl-parrotfish','fish','진주 비늘돔','민트빛과 분홍빛 비늘에 진주 같은 윤기가 흐른다. 둥근 입으로 바위 표면을 살피며 잔잔한 바다를 누빈다.',0.18,0.8,0.045,70,'rare','fish/rare/pearl-parrotfish_sprite.png','fish/rare/pearl-parrotfish_thumbnail.png',170,null,'swim',true,'both'),
 ('blue-bronze-horseshoe-crab','fish','청금 투구게','오래된 청동을 닮은 등껍질 가장자리에 푸른빛이 돈다. 가느다란 꼬리를 끌며 바닥의 오래된 길을 더듬는다.',0.86,0.95,0.022,66,'rare','fish/rare/blue-bronze-horseshoe-crab_sprite.png','fish/rare/blue-bronze-horseshoe-crab_thumbnail.png',170,null,'crawl',false,'both'),
 ('glassfin-lionfish','fish','유리 지느러미 쏠배감펭','붉은 줄무늬 사이로 유리 같은 지느러미가 펼쳐진다. 가는 지느러미살마다 물빛이 맺혀 작은 부채처럼 반짝인다.',0.18,0.8,0.045,76,'rare','fish/rare/glassfin-lionfish_sprite.png','fish/rare/glassfin-lionfish_thumbnail.png',190,null,'swim',true,'both'),
 ('opal-nautilus','fish','오팔 앵무조개','크림색 나선 껍데기 안쪽으로 오팔빛이 은근히 번진다. 가느다란 촉수를 모으며 오래된 바다의 박자로 떠오른다.',0.22,0.78,0.03,64,'rare','fish/rare/opal-nautilus_sprite.png','fish/rare/opal-nautilus_thumbnail.png',180,null,'pulse',false,'both'),
 ('petal-nudibranch','fish','꽃잎 갯민숭달팽이','우윳빛 몸 위에 분홍 꽃잎 같은 아가미가 피어 있다. 작은 더듬이를 세우고 바닥에 부드러운 발자국을 남긴다.',0.86,0.95,0.022,58,'rare','fish/rare/petal-nudibranch_sprite.png','fish/rare/petal-nudibranch_thumbnail.png',160,null,'crawl',true,'both'),
 ('sea-crocodile','fish','바다악어','단단한 비늘과 긴 꼬리를 가진 바다의 여행자. 짧은 다리를 몸에 붙이고 물결 아래를 조용히 가로지른다.',0.18,0.8,0.045,88,'rare','fish/rare/sea-crocodile_sprite.png','fish/rare/sea-crocodile_thumbnail.png',210,null,'swim',true,'both'),
 ('starpattern-manta','fish','별무늬 만타','짙푸른 날개 위에 은빛 별자리가 이어진다. 금빛 가장자리와 작은 진주 같은 빛이 넓은 지느러미를 따라 흐른다.',0.18,0.8,0.045,104,'epic','fish/epic/starpattern-manta_sprite.png','fish/epic/starpattern-manta_thumbnail.png',680,null,'swim',false,'both'),
 ('aurora-eel','fish','오로라장어','길게 휘어진 몸 안으로 분홍빛과 보랏빛 오로라가 흐른다. 겹겹의 지느러미를 펼칠 때마다 은빛 비늘이 별처럼 빛난다.',0.18,0.8,0.045,102,'epic','fish/epic/aurora-eel_sprite.png','fish/epic/aurora-eel_thumbnail.png',700,null,'swim',true,'both'),
 ('dreaming-dumbo-octopus','fish','꿈꾸는 덤보문어','라벤더빛 몸에 은빛 꿈무늬가 수놓아져 있다. 귀 같은 지느러미와 진주빛 팔을 펼치며 달콤한 잠결에 바다를 떠돈다.',0.22,0.78,0.03,88,'epic','fish/epic/dreaming-dumbo-octopus_sprite.png','fish/epic/dreaming-dumbo-octopus_thumbnail.png',650,null,'pulse',false,'both')
on conflict(id) do update set
 kind=excluded.kind,name=excluded.name,description=excluded.description,
 swim_y_min=excluded.swim_y_min,swim_y_max=excluded.swim_y_max,speed=excluded.speed,size=excluded.size,rarity=excluded.rarity,
 sprite_sheet_path=excluded.sprite_sheet_path,thumbnail_path=excluded.thumbnail_path,sell_price=excluded.sell_price,
 native_region_id=excluded.native_region_id,movement_type=excluded.movement_type,
 flip_with_direction=excluded.flip_with_direction,travel_direction=excluded.travel_direction;

insert into public.collectible_habitats(species_id,region_id)
select s.id,r.id from public.collectible_species s cross join public.regions r
where s.id in ('bean-pufferfish','orange-clownfish','threadtail-shrimp','button-urchin','soft-sea-cucumber','ribbon-eel','pink-scallop','tiny-cuttlefish','peach-octopus','pearl-parrotfish','blue-bronze-horseshoe-crab','glassfin-lionfish','opal-nautilus','petal-nudibranch','sea-crocodile','starpattern-manta','aurora-eel','dreaming-dumbo-octopus')
 and r.id in ('pongdang','coral','mistmoon','starruins','dreamabyss')
on conflict(species_id,region_id) do nothing;
commit;

select s.id,s.name,s.rarity,s.is_native,s.movement_type,s.flip_with_direction,
 s.thumbnail_path,s.sprite_sheet_path,array_agg(h.region_id order by h.region_id) as habitats
from public.collectible_species s join public.collectible_habitats h on h.species_id=s.id
where s.id in ('bean-pufferfish','orange-clownfish','threadtail-shrimp','button-urchin','soft-sea-cucumber','ribbon-eel','pink-scallop','tiny-cuttlefish','peach-octopus','pearl-parrotfish','blue-bronze-horseshoe-crab','glassfin-lionfish','opal-nautilus','petal-nudibranch','sea-crocodile','starpattern-manta','aurora-eel','dreaming-dumbo-octopus')
group by s.id order by s.rarity,s.id;
