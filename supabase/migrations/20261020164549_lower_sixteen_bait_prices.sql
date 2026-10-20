-- Generated from supabase/catalog/catalog.json. Review before migration deployment.
begin;
set constraints all deferred;
insert into public.fishing_baits ("id","name","description","price","image_path","sort_order","common_bp","rare_bp","epic_bp","mythic_bp","failure_bp","effect_kind","effect_description","success_chance_bp","fish_only","alternating") values
('bait','퐁당 지렁이','퐁당섬의 촉촉한 모래와 풀숲에서만 서식하는 선홍빛 지렁이. 물속에서도 꼬물꼬물 움직여 물고기의 호기심을 자극한다. 매우 흔하고 구하기 쉬워, 섬의 초보 낚시꾼들이 가장 먼저 챙기는 미끼다.',20,'/items/baits/pongdang-worm.png',101,8320,1500,150,30,0,'fish','기본 낚시 미끼 · 일반 개체를 주로 만나며, 희귀한 개체도 만날 수 있어요.',null,false,false),
('bait_cloud_dough','솜구름 반죽','폭신한 구름을 빚어 만든 반죽.',33,'/items/baits/cloud-dough.png',110,10000,0,0,0,0,'fish','일반 물고기만 포획해요.',10000,true,false),
('bait_coral_pollen','산호 꽃가루','산호꽃에서 모은 향긋한 분홍빛 가루.',55,'/items/baits/coral-pollen.png',118,9500,0,500,0,0,'fish','성공 시 일반 95% · 특급 5%의 물고기를 포획해요.',7500,true,false),
('bait_cracked_star','금 간 별조각','갈라진 틈으로 별빛이 새어 나오는 조각.',175,'/items/baits/cracked-star.png',115,0,9900,0,100,0,'fish','성공 시 희귀 99% · 신화 1%의 물고기를 포획해요.',5000,true,false),
('bait_firefly_pupa','반딧불 번데기','물속에서도 작은 불빛을 품는 번데기.',11,'/items/baits/firefly-pupa.png',112,9000,0,1000,0,0,'fish','성공 시 일반 90% · 특급 10%의 물고기를 포획해요.',2000,true,false),
('bait_forbidden_star','금단의 별사탕','보랏빛 별사탕의 금빛 균열에서 달콤한 별가루가 흘러나와 깊은 바다의 특별한 생물을 불러 모아요.',115,'/items/baits/forbidden-star-candy.png',105,7223,1876,760,141,0,'fish','성공 확률 소폭 증가 · 특급·신화 개체를 만날 확률 증가',null,false,false),
('bait_grubby_magnet','꼬질 자석경단','해초와 작은 자석을 꾹꾹 뭉친 꼬질한 경단. 물고기 대신 바닷속 버려진 물건들이 달라붙어요.',10,'/items/baits/grubby-magnet-dumpling.png',103,8320,1500,150,30,0,'fish','성공 확률 소폭 증가 · 낚시 성공 시 쓰레기 포획 100%',null,false,false),
('bait_honey_dumpling','햇살 꿀경단','따뜻한 햇살빛 꿀을 머금은 말랑한 경단.',60,'/items/baits/sunny-honey-dumpling.png',116,8500,1500,0,0,0,'fish','성공 시 일반 85% · 희귀 15%의 물고기를 포획해요.',8000,true,false),
('bait_lightning_stardust','벼락 별가루','작은 번개를 머금은 눈부신 별가루.',78,'/items/baits/lightning-stardust.png',114,0,0,10000,0,0,'fish','성공 시 특급 물고기만 포획해요.',500,true,false),
('bait_magnet','심해 인력석','깊은 해구에서 건져 올린 푸른 자철석을 다듬어 만든 인양용 미끼. 물고기 대신 바다 아래 잠든 장식물에 반응하며, 오래전에 가라앉은 보물의 흔적을 조용히 끌어당긴다.',45,'/items/baits/abyss-lodestone.png',106,8320,1500,150,30,0,'decoration','등급을 먼저 추첨한 뒤 해당 등급의 장식물만 인양해요.',null,false,false),
('bait_pearl_bubble','진주 거품방울','진주를 감싼 맑은 거품이 물속에서 은은하게 빛나요.',65,'/items/baits/pearl-bubble.png',117,6500,3500,0,0,0,'fish','성공 시 일반 65% · 희귀 35%의 물고기를 포획해요.',6500,true,false),
('bait_safe','이슬잎 경단','새벽 이슬을 머금은 어린 잎에 향긋한 해초 반죽을 감싼 수제 미끼. 작은 쇠바늘에 단단히 붙어 쉽게 흩어지지 않고, 잎 사이로 퍼지는 순한 향이 경계심 많은 물고기를 안심시킨다.',60,'/items/baits/dewleaf-dumpling.png',102,8320,1500,150,30,0,'fish','무조건 낚시에 성공해요. 단, 게이지 조작은 직접 해야 해요.',null,false,false),
('bait_sea_memory','바다기억 조개알','파도 무늬 조개에 담긴 푸른 진주알. 지금 머무는 바다의 친구들이 기억하는 향기를 내요.',50,'/items/baits/sea-memory-clam-pearl.png',104,8320,1500,150,30,0,'fish','현재 해역의 고유종을 만날 확률 증가',null,false,false),
('bait_shell_crumbs','조개 부스러기','잘게 부순 조개의 은은한 바다 향.',8,'/items/baits/shell-crumbs.png',111,8000,2000,0,0,0,'fish','성공 시 일반 80% · 희귀 20%의 물고기를 포획해요.',2000,true,false),
('bait_starlight_wax','별빛 밀랍','작은 별빛을 품은 부드러운 밀랍 덩어리.',33,'/items/baits/starlight-wax.png',119,9940,0,0,60,0,'fish','성공 시 일반 99.4% · 신화 0.6%의 물고기를 포획해요.',7000,true,false),
('bait_zigzag_jelly','지그재그 젤리','서로 다른 두 맛이 번갈아 퍼지는 젤리.',74,'/items/baits/zigzag-jelly.png',113,10000,0,0,0,0,'fish','일반 전용 → 희귀 전용으로 매번 교대해요. 실패해도 순서가 진행되며 재접속해도 유지돼요. 통발은 회수 시 순서가 진행돼요.',5000,true,true)
on conflict(id) do update set "name"=excluded."name","description"=excluded."description","price"=excluded."price","image_path"=excluded."image_path","sort_order"=excluded."sort_order","common_bp"=excluded."common_bp","rare_bp"=excluded."rare_bp","epic_bp"=excluded."epic_bp","mythic_bp"=excluded."mythic_bp","failure_bp"=excluded."failure_bp","effect_kind"=excluded."effect_kind","effect_description"=excluded."effect_description","success_chance_bp"=excluded."success_chance_bp","fish_only"=excluded."fish_only","alternating"=excluded."alternating";
notify pgrst, 'reload schema';
commit;
