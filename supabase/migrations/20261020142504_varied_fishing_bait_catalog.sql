-- Generated from supabase/catalog/catalog.json. Review before migration deployment.
begin;
set constraints all deferred;
insert into public.fishing_baits ("id","name","description","price","image_path","sort_order","common_bp","rare_bp","epic_bp","mythic_bp","failure_bp","effect_kind","effect_description","success_chance_bp","fish_only","alternating") values
('bait','퐁당 지렁이','퐁당섬의 촉촉한 모래와 풀숲에서만 서식하는 선홍빛 지렁이. 물속에서도 꼬물꼬물 움직여 물고기의 호기심을 자극한다. 매우 흔하고 구하기 쉬워, 섬의 초보 낚시꾼들이 가장 먼저 챙기는 미끼다.',30,'/items/baits/pongdang-worm.png',101,8320,1500,150,30,0,'fish','기본 낚시 미끼 · 일반 개체를 주로 만나며, 희귀한 개체도 만날 수 있어요.',null,false,false),
('bait_epic','별잠의 유혹','별잠 유적의 틈에 맺힌 별가루를 자수정 조각에 봉인한 미끼. 물결에 닿으면 보랏빛 잔광이 길게 번져, 깊은 바다에 몸을 숨긴 비범한 생명까지 잠에서 깨운다고 전해진다.',null,'/items/baits/starlit-allure.png',108,0,0,9970,30,0,'fish','성공 확률 소폭 증가 · 낚시 성공 시 특급 개체를 주로 만나요.',null,false,false),
('bait_first_greeting','소라의 첫인사','진주빛 소라에 맺힌 민트색 물방울. 아직 도감에 기록하지 못한 새로운 만남을 이끌어요.',null,'/items/baits/conch-first-greeting.png',109,8320,1500,150,30,0,'fish','성공 확률 소폭 증가 · 낚시 성공 시 미발견 개체 확정 · 모두 발견했다면 소모되지 않아요.',null,false,false),
('bait_forbidden_star','금단의 별사탕','보랏빛 별사탕의 금빛 균열에서 달콤한 별가루가 흘러나와 깊은 바다의 특별한 생물을 불러 모아요.',80,'/items/baits/forbidden-star-candy.png',105,7223,1876,760,141,0,'fish','성공 확률 소폭 증가 · 특급·신화 개체를 만날 확률 증가',null,false,false),
('bait_grubby_magnet','꼬질 자석경단','해초와 작은 자석을 꾹꾹 뭉친 꼬질한 경단. 물고기 대신 바닷속 버려진 물건들이 달라붙어요.',40,'/items/baits/grubby-magnet-dumpling.png',103,8320,1500,150,30,0,'fish','성공 확률 소폭 증가 · 낚시 성공 시 쓰레기 포획 100%',null,false,false),
('bait_magnet','심해 인력석','깊은 해구에서 건져 올린 푸른 자철석을 다듬어 만든 인양용 미끼. 물고기 대신 바다 아래 잠든 장식물에 반응하며, 오래전에 가라앉은 보물의 흔적을 조용히 끌어당긴다.',null,'/items/baits/abyss-lodestone.png',106,0,0,0,10000,0,'decoration','성공 확률 소폭 증가 · 낚시 성공 시 장식물 포획 100%',null,false,false),
('bait_safe','이슬잎 경단','새벽 이슬을 머금은 어린 잎에 향긋한 해초 반죽을 감싼 수제 미끼. 작은 쇠바늘에 단단히 붙어 쉽게 흩어지지 않고, 잎 사이로 퍼지는 순한 향이 경계심 많은 물고기를 안심시킨다.',100,'/items/baits/dewleaf-dumpling.png',102,8320,1500,150,30,0,'fish','무조건 낚시에 성공해요. 단, 게이지 조작은 직접 해야 해요.',null,false,false),
('bait_sea_memory','바다기억 조개알','파도 무늬 조개에 담긴 푸른 진주알. 지금 머무는 바다의 친구들이 기억하는 향기를 내요.',60,'/items/baits/sea-memory-clam-pearl.png',104,8320,1500,150,30,0,'fish','현재 해역의 고유종을 만날 확률 증가',null,false,false),
('bait_special','달빛 진주새우','달빛이 스며드는 얕은 바다에서 자라는 작은 진주새우. 반투명한 껍질 속 푸른 진주가 은은하게 빛나며, 평범한 먹이에는 다가오지 않던 진귀한 물고기까지 불러 모은다고 한다.',null,'/items/baits/special.png',107,0,9870,100,30,0,'fish','성공 확률 소폭 증가 · 낚시 성공 시 희귀 개체를 주로 만나요.',null,false,false),
('bait_cloud_dough','솜구름 반죽','폭신한 구름을 빚어 만든 반죽.',48,'/items/baits/cloud-dough.png',110,10000,0,0,0,0,'fish','일반 물고기만 포획해요.',10000,true,false),
('bait_shell_crumbs','조개 부스러기','잘게 부순 조개의 은은한 바다 향.',15,'/items/baits/shell-crumbs.png',111,8000,2000,0,0,0,'fish','성공 시 일반 80% · 희귀 20%의 물고기를 포획해요.',2000,true,false),
('bait_firefly_pupa','반딧불 번데기','물속에서도 작은 불빛을 품는 번데기.',24,'/items/baits/firefly-pupa.png',112,9000,0,1000,0,0,'fish','성공 시 일반 90% · 특급 10%의 물고기를 포획해요.',2000,true,false),
('bait_zigzag_jelly','지그재그 젤리','서로 다른 두 맛이 번갈아 퍼지는 젤리.',78,'/items/baits/zigzag-jelly.png',113,10000,0,0,0,0,'fish','일반 전용 → 희귀 전용으로 매번 교대해요. 실패해도 순서가 진행되며 재접속해도 유지돼요. 통발은 회수 시 순서가 진행돼요.',5000,true,true),
('bait_lightning_stardust','벼락 별가루','작은 번개를 머금은 눈부신 별가루.',90,'/items/baits/lightning-stardust.png',114,0,0,10000,0,0,'fish','성공 시 특급 물고기만 포획해요.',1000,true,false),
('bait_cracked_star','금 간 별조각','갈라진 틈으로 별빛이 새어 나오는 조각.',144,'/items/baits/cracked-star.png',115,0,9900,0,100,0,'fish','성공 시 희귀 99% · 신화 1%의 물고기를 포획해요.',5000,true,false)
on conflict(id) do update set "name"=excluded."name","description"=excluded."description","price"=excluded."price","image_path"=excluded."image_path","sort_order"=excluded."sort_order","common_bp"=excluded."common_bp","rare_bp"=excluded."rare_bp","epic_bp"=excluded."epic_bp","mythic_bp"=excluded."mythic_bp","failure_bp"=excluded."failure_bp","effect_kind"=excluded."effect_kind","effect_description"=excluded."effect_description","success_chance_bp"=excluded."success_chance_bp","fish_only"=excluded."fish_only","alternating"=excluded."alternating";
insert into public.collectible_species ("id","kind","name","description","swim_y_min","swim_y_max","speed","size","rarity","thumbnail_path","sell_price","sprite_sheet_path","native_region_id","movement_type","flip_with_direction","travel_direction") values
('cracked-perfume-vial','decoration','금 간 향유병','작은 손잡이가 달린 청록색 향유병. 금 간 유리와 닳은 왕국 문양 사이로 옛 궁정의 향기가 남아 있는 듯하다.',null,null,'0',42,'common','trash/normal/cracked-perfume-vial_thumbnail.png',10,null,'starruins','fixed',false,'both'),
('siren-cracked-idol','decoration','금이 간 신상','누군가의 소원을 품었던 작은 신상. 깊은 금 사이에 해초가 자랐어요.',null,null,'0',60,'common','trash/normal/siren-cracked-idol_thumbnail.png',15,null,'siren','fixed',false,'both')
on conflict(id) do update set "kind"=excluded."kind","name"=excluded."name","description"=excluded."description","swim_y_min"=excluded."swim_y_min","swim_y_max"=excluded."swim_y_max","speed"=excluded."speed","size"=excluded."size","rarity"=excluded."rarity","thumbnail_path"=excluded."thumbnail_path","sell_price"=excluded."sell_price","sprite_sheet_path"=excluded."sprite_sheet_path","native_region_id"=excluded."native_region_id","movement_type"=excluded."movement_type","flip_with_direction"=excluded."flip_with_direction","travel_direction"=excluded."travel_direction";
delete from public.collectible_habitats where species_id in ('cracked-perfume-vial','siren-cracked-idol');
insert into public.collectible_habitats(species_id,region_id) values
('cracked-perfume-vial','starruins'),
('siren-cracked-idol','siren');
notify pgrst, 'reload schema';
commit;
