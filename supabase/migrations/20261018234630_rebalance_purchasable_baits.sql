-- Generated from supabase/catalog/catalog.json; scoped to the changed bait catalog.
-- Disjoint sort keys avoid collisions with the previous unique ordering.
begin;
insert into public.fishing_baits ("id","name","description","price","image_path","sort_order","common_bp","rare_bp","epic_bp","mythic_bp","failure_bp","effect_kind","effect_description") values
('bait','퐁당 지렁이','퐁당섬의 촉촉한 모래와 풀숲에서만 서식하는 선홍빛 지렁이. 물속에서도 꼬물꼬물 움직여 물고기의 호기심을 자극한다. 매우 흔하고 구하기 쉬워, 섬의 초보 낚시꾼들이 가장 먼저 챙기는 미끼다.',30,'/items/baits/pongdang-worm.png',101,7700,2000,270,30,0,'fish','미끼별 등급 확률은 모든 해역에서 같아요. 주 서식지에서는 개체의 추첨 가중치가 높아져요.'),
('bait_epic','별잠의 유혹','별잠 유적의 틈에 맺힌 별가루를 자수정 조각에 봉인한 미끼. 물결에 닿으면 보랏빛 잔광이 길게 번져, 깊은 바다에 몸을 숨긴 비범한 생명까지 잠에서 깨운다고 전해진다.',null,'/items/baits/starlit-allure.png',108,0,0,9970,30,0,'fish','미끼별 등급 확률은 모든 해역에서 같아요. 주 서식지에서는 개체의 추첨 가중치가 높아져요.'),
('bait_first_greeting','소라의 첫인사','진주빛 소라에 맺힌 민트색 물방울. 아직 도감에 기록하지 못한 새로운 만남을 이끌어요.',null,'/items/baits/conch-first-greeting.png',109,7700,2000,270,30,0,'fish','낚시 성공 시 미발견 개체 확정 · 모두 발견했으면 소모되지 않아요.'),
('bait_forbidden_star','금단의 별사탕','보랏빛 별사탕의 금빛 균열에서 달콤한 별가루가 흘러나와 깊은 바다의 특별한 생물을 불러 모아요.',80,'/items/baits/forbidden-star-candy.png',105,7223,1876,760,141,0,'fish','특급·신화 추첨 가중치 증가 · 게이지 난도는 그대로예요.'),
('bait_grubby_magnet','꼬질 자석경단','해초와 작은 자석을 꾹꾹 뭉친 꼬질한 경단. 물고기 대신 바닷속 버려진 물건들이 달라붙어요.',40,'/items/baits/grubby-magnet-dumpling.png',103,7700,2000,270,30,0,'fish','낚시 성공 시 쓰레기 확정.'),
('bait_magnet','심해 인력석','깊은 해구에서 건져 올린 푸른 자철석을 다듬어 만든 인양용 미끼. 물고기 대신 바다 아래 잠든 장식물에 반응하며, 오래전에 가라앉은 보물의 흔적을 조용히 끌어당긴다.',170,'/items/baits/abyss-lodestone.png',106,0,0,0,10000,0,'decoration','모든 해역의 장식물을 만날 수 있어요. 주 서식지에서는 추첨 가중치가 높아져요.'),
('bait_safe','이슬잎 경단','새벽 이슬을 머금은 어린 잎에 향긋한 해초 반죽을 감싼 수제 미끼. 작은 쇠바늘에 단단히 붙어 쉽게 흩어지지 않고, 잎 사이로 퍼지는 순한 향이 경계심 많은 물고기를 안심시킨다.',35,'/items/baits/dewleaf-dumpling.png',102,7700,2000,270,30,0,'fish','미끼별 등급 확률은 모든 해역에서 같아요. 주 서식지에서는 개체의 추첨 가중치가 높아져요.'),
('bait_sea_memory','바다기억 조개알','파도 무늬 조개에 담긴 푸른 진주알. 지금 머무는 바다의 친구들이 기억하는 향기를 내요.',60,'/items/baits/sea-memory-clam-pearl.png',104,7700,2000,270,30,0,'fish','현재 해역 고유종 추첨 가중치 추가 3배 · 등급 확률은 그대로예요.'),
('bait_special','달빛 진주새우','달빛이 스며드는 얕은 바다에서 자라는 작은 진주새우. 반투명한 껍질 속 푸른 진주가 은은하게 빛나며, 평범한 먹이에는 다가오지 않던 진귀한 물고기까지 불러 모은다고 한다.',null,'/items/baits/special.png',107,0,9870,100,30,0,'fish','미끼별 등급 확률은 모든 해역에서 같아요. 주 서식지에서는 개체의 추첨 가중치가 높아져요.')
on conflict(id) do update set "name"=excluded."name","description"=excluded."description","price"=excluded."price","image_path"=excluded."image_path","sort_order"=excluded."sort_order","common_bp"=excluded."common_bp","rare_bp"=excluded."rare_bp","epic_bp"=excluded."epic_bp","mythic_bp"=excluded."mythic_bp","failure_bp"=excluded."failure_bp","effect_kind"=excluded."effect_kind","effect_description"=excluded."effect_description";
notify pgrst, 'reload schema';
commit;
