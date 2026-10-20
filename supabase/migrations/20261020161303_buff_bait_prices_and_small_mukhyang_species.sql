-- Generated from supabase/catalog/catalog.json. Review before migration deployment.
begin;
set constraints all deferred;
insert into public.fishing_baits ("id","name","description","price","image_path","sort_order","common_bp","rare_bp","epic_bp","mythic_bp","failure_bp","effect_kind","effect_description","success_chance_bp","fish_only","alternating") values
('bait','퐁당 지렁이','퐁당섬의 촉촉한 모래와 풀숲에서만 서식하는 선홍빛 지렁이. 물속에서도 꼬물꼬물 움직여 물고기의 호기심을 자극한다. 매우 흔하고 구하기 쉬워, 섬의 초보 낚시꾼들이 가장 먼저 챙기는 미끼다.',25,'/items/baits/pongdang-worm.png',101,8320,1500,150,30,0,'fish','기본 낚시 미끼 · 일반 개체를 주로 만나며, 희귀한 개체도 만날 수 있어요.',null,false,false),
('bait_cloud_dough','솜구름 반죽','폭신한 구름을 빚어 만든 반죽.',35,'/items/baits/cloud-dough.png',110,10000,0,0,0,0,'fish','일반 물고기만 포획해요.',10000,true,false),
('bait_coral_pollen','산호 꽃가루','산호꽃에서 모은 향긋한 분홍빛 가루.',60,'/items/baits/coral-pollen.png',118,9500,0,500,0,0,'fish','성공 시 일반 95% · 특급 5%의 물고기를 포획해요.',7500,true,false),
('bait_cracked_star','금 간 별조각','갈라진 틈으로 별빛이 새어 나오는 조각.',178,'/items/baits/cracked-star.png',115,0,9900,0,100,0,'fish','성공 시 희귀 99% · 신화 1%의 물고기를 포획해요.',5000,true,false),
('bait_firefly_pupa','반딧불 번데기','물속에서도 작은 불빛을 품는 번데기.',15,'/items/baits/firefly-pupa.png',112,9000,0,1000,0,0,'fish','성공 시 일반 90% · 특급 10%의 물고기를 포획해요.',2000,true,false),
('bait_forbidden_star','금단의 별사탕','보랏빛 별사탕의 금빛 균열에서 달콤한 별가루가 흘러나와 깊은 바다의 특별한 생물을 불러 모아요.',120,'/items/baits/forbidden-star-candy.png',105,7223,1876,760,141,0,'fish','성공 확률 소폭 증가 · 특급·신화 개체를 만날 확률 증가',null,false,false),
('bait_grubby_magnet','꼬질 자석경단','해초와 작은 자석을 꾹꾹 뭉친 꼬질한 경단. 물고기 대신 바닷속 버려진 물건들이 달라붙어요.',20,'/items/baits/grubby-magnet-dumpling.png',103,8320,1500,150,30,0,'fish','성공 확률 소폭 증가 · 낚시 성공 시 쓰레기 포획 100%',null,false,false),
('bait_lightning_stardust','벼락 별가루','작은 번개를 머금은 눈부신 별가루.',80,'/items/baits/lightning-stardust.png',114,0,0,10000,0,0,'fish','성공 시 특급 물고기만 포획해요.',500,true,false),
('bait_pearl_bubble','진주 거품방울','진주를 감싼 맑은 거품이 물속에서 은은하게 빛나요.',70,'/items/baits/pearl-bubble.png',117,6500,3500,0,0,0,'fish','성공 시 일반 65% · 희귀 35%의 물고기를 포획해요.',6500,true,false),
('bait_safe','이슬잎 경단','새벽 이슬을 머금은 어린 잎에 향긋한 해초 반죽을 감싼 수제 미끼. 작은 쇠바늘에 단단히 붙어 쉽게 흩어지지 않고, 잎 사이로 퍼지는 순한 향이 경계심 많은 물고기를 안심시킨다.',65,'/items/baits/dewleaf-dumpling.png',102,8320,1500,150,30,0,'fish','무조건 낚시에 성공해요. 단, 게이지 조작은 직접 해야 해요.',null,false,false),
('bait_shell_crumbs','조개 부스러기','잘게 부순 조개의 은은한 바다 향.',10,'/items/baits/shell-crumbs.png',111,8000,2000,0,0,0,'fish','성공 시 일반 80% · 희귀 20%의 물고기를 포획해요.',2000,true,false),
('bait_starlight_wax','별빛 밀랍','작은 별빛을 품은 부드러운 밀랍 덩어리.',38,'/items/baits/starlight-wax.png',119,9940,0,0,60,0,'fish','성공 시 일반 99.4% · 신화 0.6%의 물고기를 포획해요.',7000,true,false),
('bait_zigzag_jelly','지그재그 젤리','서로 다른 두 맛이 번갈아 퍼지는 젤리.',78,'/items/baits/zigzag-jelly.png',113,10000,0,0,0,0,'fish','일반 전용 → 희귀 전용으로 매번 교대해요. 실패해도 순서가 진행되며 재접속해도 유지돼요. 통발은 회수 시 순서가 진행돼요.',5000,true,true)
on conflict(id) do update set "name"=excluded."name","description"=excluded."description","price"=excluded."price","image_path"=excluded."image_path","sort_order"=excluded."sort_order","common_bp"=excluded."common_bp","rare_bp"=excluded."rare_bp","epic_bp"=excluded."epic_bp","mythic_bp"=excluded."mythic_bp","failure_bp"=excluded."failure_bp","effect_kind"=excluded."effect_kind","effect_description"=excluded."effect_description","success_chance_bp"=excluded."success_chance_bp","fish_only"=excluded."fish_only","alternating"=excluded."alternating";
insert into public.collectible_species ("id","kind","name","description","swim_y_min","swim_y_max","speed","size","rarity","thumbnail_path","sell_price","sprite_sheet_path","native_region_id","movement_type","flip_with_direction","travel_direction") values
('muk-bleeding-octopus','fish','번짐 문어','둥근 먹 얼룩에서 여덟 갈래 촉수가 번져 나온 문어.','0.18','0.78','0.022',57,'rare','fish/rare/muk-bleeding-octopus_thumbnail.png',352,'fish/rare/muk-bleeding-octopus_sprite.png','mukhyang','pulse',true,'both'),
('muk-bleeding-tail-goldfish','fish','번짐꼬리 금붕어','흰 몸 뒤로 긴 먹빛 꼬리가 번지는 금붕어. 꼬리 끝은 물에 스며들 듯 옅어진다.','0.18','0.78','0.035',56,'common','fish/normal/muk-bleeding-tail-goldfish_thumbnail.png',68,'fish/normal/muk-bleeding-tail-goldfish_sprite.png','mukhyang','swim',true,'both'),
('muk-brush-tail-shrimp','fish','붓꼬리 새우','옅은 먹으로 그린 몸 뒤로 붓끝 같은 꼬리가 이어진 새우.','0.84','0.94','0.012',45,'common','fish/normal/muk-brush-tail-shrimp_thumbnail.png',68,'fish/normal/muk-brush-tail-shrimp_sprite.png','mukhyang','crawl',true,'both'),
('muk-inkbean-whelk','fish','먹콩 우렁이','먹콩처럼 둥근 검은 껍데기에 흰 나선 한 줄이 남은 우렁이.','0.84','0.94','0.012',45,'common','fish/normal/muk-inkbean-whelk_thumbnail.png',68,'fish/normal/muk-inkbean-whelk_sprite.png','mukhyang','crawl',true,'both'),
('muk-inkdrop-puffer','fish','먹방울 복어','둥근 먹방울에서 짧은 붓결 가시가 돋은 복어. 작은 지느러미로 먹빛 물결을 가른다.','0.18','0.78','0.035',48,'common','fish/normal/muk-inkdrop-puffer_thumbnail.png',68,'fish/normal/muk-inkdrop-puffer_sprite.png','mukhyang','swim',true,'both'),
('muk-inkdrop-snail','fish','먹물방울 달팽이','투명한 껍데기 속 먹물 한 방울을 품고 느릿하게 바닥을 걷는 달팽이.','0.84','0.94','0.012',45,'common','fish/normal/muk-inkdrop-snail_thumbnail.png',68,'fish/normal/muk-inkdrop-snail_sprite.png','mukhyang','crawl',true,'both'),
('muk-inkstone-clam','fish','벼루 조개','벼루처럼 납작한 껍데기 속 먹빛 진주를 품은 조개.','0.84','0.94','0.012',45,'common','fish/normal/muk-inkstone-clam_thumbnail.png',67,'fish/normal/muk-inkstone-clam_sprite.png','mukhyang','fixed',true,'both'),
('muk-inkstone-home-octopus','fish','벼루집 문어','작은 벼루를 집 삼아 먹 묻은 촉수를 내미는 문어.','0.84','0.94','0.012',64,'rare','fish/rare/muk-inkstone-home-octopus_thumbnail.png',352,'fish/rare/muk-inkstone-home-octopus_sprite.png','mukhyang','fixed',true,'both'),
('muk-lotus-jellyfish','fish','수묵 연꽃해파리','흰 연꽃 같은 갓 아래로 가느다란 먹빛 촉수가 흐르는 해파리.','0.18','0.78','0.022',57,'rare','fish/rare/muk-lotus-jellyfish_thumbnail.png',352,'fish/rare/muk-lotus-jellyfish_sprite.png','mukhyang','pulse',true,'both'),
('muk-orchid-fin-betta','fish','난초지느러미 베타','난초 잎 같은 검은 지느러미가 유려하게 휘어지는 베타.','0.18','0.78','0.022',62,'rare','fish/rare/muk-orchid-fin-betta_thumbnail.png',352,'fish/rare/muk-orchid-fin-betta_sprite.png','mukhyang','swim',true,'both'),
('muk-paperboat-hermit','fish','종이배 소라게','접힌 한지 종이배를 집 삼아 먹빛 다리로 바닥을 종종 걷는 소라게.','0.84','0.94','0.012',48,'common','fish/normal/muk-paperboat-hermit_thumbnail.png',67,'fish/normal/muk-paperboat-hermit_sprite.png','mukhyang','crawl',true,'both'),
('muk-plum-branch-seahorse','fish','매화가지 해마','먹빛 가지 같은 몸에 붉은 매화 몇 송이가 피어난 해마.','0.18','0.78','0.022',57,'rare','fish/rare/muk-plum-branch-seahorse_thumbnail.png',352,'fish/rare/muk-plum-branch-seahorse_sprite.png','mukhyang','pulse',true,'both'),
('muk-single-stroke-minnow','fish','한 획 송사리','짧게 그은 먹선 한 획에서 태어난 송사리. 가느다란 꼬리를 빠르게 흔든다.','0.18','0.78','0.035',42,'common','fish/normal/muk-single-stroke-minnow_thumbnail.png',67,'fish/normal/muk-single-stroke-minnow_sprite.png','mukhyang','swim',true,'both')
on conflict(id) do update set "kind"=excluded."kind","name"=excluded."name","description"=excluded."description","swim_y_min"=excluded."swim_y_min","swim_y_max"=excluded."swim_y_max","speed"=excluded."speed","size"=excluded."size","rarity"=excluded."rarity","thumbnail_path"=excluded."thumbnail_path","sell_price"=excluded."sell_price","sprite_sheet_path"=excluded."sprite_sheet_path","native_region_id"=excluded."native_region_id","movement_type"=excluded."movement_type","flip_with_direction"=excluded."flip_with_direction","travel_direction"=excluded."travel_direction";
delete from public.collectible_habitats where species_id in ('muk-bleeding-octopus','muk-bleeding-tail-goldfish','muk-brush-tail-shrimp','muk-inkbean-whelk','muk-inkdrop-puffer','muk-inkdrop-snail','muk-inkstone-clam','muk-inkstone-home-octopus','muk-lotus-jellyfish','muk-orchid-fin-betta','muk-paperboat-hermit','muk-plum-branch-seahorse','muk-single-stroke-minnow');
insert into public.collectible_habitats(species_id,region_id) values
('muk-bleeding-octopus','mukhyang'),
('muk-bleeding-tail-goldfish','mukhyang'),
('muk-brush-tail-shrimp','mukhyang'),
('muk-inkbean-whelk','mukhyang'),
('muk-inkdrop-puffer','mukhyang'),
('muk-inkdrop-snail','mukhyang'),
('muk-inkstone-clam','mukhyang'),
('muk-inkstone-home-octopus','mukhyang'),
('muk-lotus-jellyfish','mukhyang'),
('muk-orchid-fin-betta','mukhyang'),
('muk-paperboat-hermit','mukhyang'),
('muk-plum-branch-seahorse','mukhyang'),
('muk-single-stroke-minnow','mukhyang');
notify pgrst, 'reload schema';
commit;
