-- Generated from supabase/catalog/catalog.json. Review before migration deployment.
-- Purchase ranks use the 2026-10-29 03:51 to 2026-11-03 03:51 UTC snapshot.
-- Existing rows only update price; preserve all other remote catalog fields.
begin;
set constraints all deferred;
insert into public.fishing_baits ("id","name","description","price","image_path","sort_order","common_bp","rare_bp","epic_bp","mythic_bp","failure_bp","effect_kind","effect_description","success_chance_bp","fish_only","alternating") values
('bait_aurora_clockwork_bug','오로라 태엽벌레','오색으로 빛나는 태엽이 물고기와 장식물을 끌어당겨요.',188,'https://ewafafphiovbpjwogwzn.supabase.co/storage/v1/object/public/collectibles/items/baits/aurora-clockwork-bug.png',124,2420,7500,0,80,0,'fish','오색으로 빛나는 태엽이 물고기와 장식물을 끌어당겨요.',10000,false,false),
('bait_cloud_dough','솜구름 반죽','폭신한 구름 향기로 일반 등급 물고기를 불러요.',31,'/items/baits/cloud-dough.png',110,10000,0,0,0,0,'fish','폭신한 구름 향기로 일반 등급 물고기를 불러요.',10000,true,false),
('bait_coral_pollen','산호 꽃가루','은은한 산호꽃 향기로 물고기와 장식물을 모으며 특급도 만나요.',60,'/items/baits/coral-pollen.png',118,9600,0,400,0,0,'fish','은은한 산호꽃 향기로 물고기와 장식물을 모으며 특급도 만나요.',10000,false,false),
('bait_cracked_star','금 간 별조각','갈라진 별빛으로 희귀 물고기를 부르며, 드물게 신화 물고기도 만나요.',245,'/items/baits/cracked-star.png',115,0,9930,0,70,0,'fish','갈라진 별빛으로 희귀 물고기를 부르며, 드물게 신화 물고기도 만나요.',10000,true,false),
('bait_firefly_pupa','반딧불 번데기','깊은 곳까지 번지는 작은 불빛이 특급 물고기를 유혹해요.',65,'/items/baits/firefly-pupa.png',112,9550,0,450,0,0,'fish','깊은 곳까지 번지는 작은 불빛이 특급 물고기를 유혹해요.',10000,true,false),
('bait_goblin_bell_cherry','도깨비 방울체리','신비로운 방울 소리에 주로 희귀 물고기가 모이고, 가끔 특급 물고기도 찾아와요.',207,'https://ewafafphiovbpjwogwzn.supabase.co/storage/v1/object/public/collectibles/items/baits/goblin-bell-cherry.png',123,2100,7500,400,0,0,'fish','신비로운 방울 소리에 주로 희귀 물고기가 모이고, 가끔 특급 물고기도 찾아와요.',10000,true,false),
('bait_grain_dumpling','노릇노릇 곡물경단','노릇하게 구운 곡물 향기로 다양한 바다 친구들과 물밑의 물건을 불러요.',24,'https://ewafafphiovbpjwogwzn.supabase.co/storage/v1/object/public/collectibles/items/baits/toasted-grain-dumpling.png',100,9000,1000,0,0,0,'fish','노릇하게 구운 곡물 향기로 다양한 바다 친구들과 물밑의 물건을 불러요.',10000,false,false),
('bait_halfmoon_honey','반달 꿀젤리','반달 모양 꿀젤리에 일반·희귀 물고기가 고르게 모여요.',122,'https://ewafafphiovbpjwogwzn.supabase.co/storage/v1/object/public/collectibles/items/baits/halfmoon-honey-jelly.png',120,5000,5000,0,0,0,'fish','반달 모양 꿀젤리에 일반·희귀 물고기가 고르게 모여요.',10000,true,false),
('bait_honey_dumpling','햇살 꿀경단','달콤한 꿀 향기로 일반·희귀 물고기와 쓰레기를 모아요.',50,'/items/baits/sunny-honey-dumpling.png',116,8200,1800,0,0,0,'fish','달콤한 꿀 향기로 일반·희귀 물고기와 쓰레기를 모아요.',10000,false,false),
('bait_lightning_stardust','벼락 별가루','강렬한 번개빛이 희귀·특급 물고기를 끌어당겨요.',264,'/items/baits/lightning-stardust.png',114,0,9450,550,0,0,'fish','강렬한 번개빛이 희귀·특급 물고기를 끌어당겨요.',10000,true,false),
('bait_magnet','심해 인력석','바닷속에 잠든 장식물만 끌어올리는 인양 미끼예요.',46,'/items/baits/abyss-lodestone.png',106,8700,1200,100,0,0,'decoration','바닷속에 잠든 장식물만 끌어올리는 인양 미끼예요.',10000,false,false),
('bait_mermaid_whisper_candy','인어의 귓속말 캔디','인어의 달콤한 노래가 희귀 물고기를 유혹해요.',155,'https://ewafafphiovbpjwogwzn.supabase.co/storage/v1/object/public/collectibles/items/baits/mermaid-whisper-candy.png',125,4000,6000,0,0,0,'fish','인어의 달콤한 노래가 희귀 물고기를 유혹해요.',10000,true,false),
('bait_moonshade_dumpling','달그늘 경단','낮에는 일반, 밤에는 희귀 등급을 조금 더 자주 만나요.',107,'https://ewafafphiovbpjwogwzn.supabase.co/storage/v1/object/public/collectibles/items/baits/moonshade-dumpling-v1.png',317,5500,4500,0,0,0,'fish','낮에는 일반, 밤에는 희귀 등급을 조금 더 자주 만나요.',10000,false,false),
('bait_pearl_bubble','진주 거품방울','반짝이는 거품이 희귀 장식물과 쓰레기를 끌어당겨요.',60,'/items/baits/pearl-bubble.png',117,6500,3500,0,0,0,'fish','반짝이는 거품이 희귀 장식물과 쓰레기를 끌어당겨요.',10000,false,false),
('bait_sea_memory','바다기억 조개알','익숙한 바다의 향기로 현재 해역의 토착종을 더 자주 만나요.',84,'/items/baits/sea-memory-clam-pearl.png',104,8650,1200,130,20,0,'fish','익숙한 바다의 향기로 현재 해역의 토착종을 더 자주 만나요.',10000,false,false),
('bait_shell_crumbs','조개 부스러기','고소한 조개 향기를 좋아하는 일반·희귀 물고기가 찾아와요.',46,'/items/baits/shell-crumbs.png',111,8600,1400,0,0,0,'fish','고소한 조개 향기를 좋아하는 일반·희귀 물고기가 찾아와요.',10000,true,false),
('bait_shooting_star_tail','별똥별 꼬리젤리','대부분 일반 쓰레기를 건지지만, 가끔 신화 등급의 뜻밖의 발견을 만나요.',46,'https://ewafafphiovbpjwogwzn.supabase.co/storage/v1/object/public/collectibles/items/baits/shooting-star-tail-jelly-teal.png',122,9920,0,0,80,0,'fish','대부분 일반 쓰레기를 건지지만, 가끔 신화 등급의 뜻밖의 발견을 만나요.',10000,false,false),
('bait_starlight_wax','별빛 밀랍','은은하게 번지는 별빛에 드물게 신화 물고기가 이끌려 와요.',41,'/items/baits/starlight-wax.png',119,9950,0,0,50,0,'fish','은은하게 번지는 별빛에 드물게 신화 물고기가 이끌려 와요.',10000,true,false),
('bait_zigzag_jelly','지그재그 젤리','두 가지 맛으로 일반·희귀 물고기를 번갈아 불러요.',126,'/items/baits/zigzag-jelly.png',113,10000,0,0,0,0,'fish','두 가지 맛으로 일반·희귀 물고기를 번갈아 불러요.',10000,true,true)
on conflict(id) do update set "price"=excluded."price";
insert into app_private.fishing_bait_balance_profiles ("id","name","price","success_chance_bp","common_bp","rare_bp","epic_bp","mythic_bp","wait_min_seconds","wait_max_seconds","target_kinds","effect_kind","native_multiplier","night_common_bp","night_rare_bp","night_wait_min_seconds","night_wait_max_seconds") values
('bait_aurora_clockwork_bug','오로라 태엽벌레',188,10000,2420,7500,0,80,13,25,'["fish","decoration"]'::jsonb,'standard',1,null,null,null,null),
('bait_cloud_dough','솜구름 반죽',31,10000,10000,0,0,0,13,25,'["fish"]'::jsonb,'standard',1,null,null,null,null),
('bait_coral_pollen','산호 꽃가루',60,10000,9600,0,400,0,13,25,'["fish","decoration"]'::jsonb,'standard',1,null,null,null,null),
('bait_cracked_star','금 간 별조각',245,10000,0,9930,0,70,13,25,'["fish"]'::jsonb,'standard',1,null,null,null,null),
('bait_firefly_pupa','반딧불 번데기',65,10000,9550,0,450,0,13,25,'["fish"]'::jsonb,'standard',1,null,null,null,null),
('bait_goblin_bell_cherry','도깨비 방울체리',207,10000,2100,7500,400,0,13,25,'["fish"]'::jsonb,'standard',1,null,null,null,null),
('bait_grain_dumpling','노릇노릇 곡물경단',24,10000,9000,1000,0,0,13,25,'["fish","trash","decoration"]'::jsonb,'standard',1,null,null,null,null),
('bait_halfmoon_honey','반달 꿀젤리',122,10000,5000,5000,0,0,13,25,'["fish"]'::jsonb,'standard',1,null,null,null,null),
('bait_honey_dumpling','햇살 꿀경단',50,10000,8200,1800,0,0,13,25,'["fish","trash"]'::jsonb,'standard',1,null,null,null,null),
('bait_lightning_stardust','벼락 별가루',264,10000,0,9450,550,0,13,25,'["fish"]'::jsonb,'standard',1,null,null,null,null),
('bait_magnet','심해 인력석',46,10000,8700,1200,100,0,13,25,'["decoration"]'::jsonb,'standard',1,null,null,null,null),
('bait_mermaid_whisper_candy','인어의 귓속말 캔디',155,10000,4000,6000,0,0,13,25,'["fish"]'::jsonb,'standard',1,null,null,null,null),
('bait_moonshade_dumpling','달그늘 경단',107,10000,5500,4500,0,0,13,25,'["fish","trash","decoration"]'::jsonb,'day_night',1,4500,5500,13,25),
('bait_pearl_bubble','진주 거품방울',60,10000,6500,3500,0,0,13,25,'["decoration","trash"]'::jsonb,'standard',1,null,null,null,null),
('bait_sea_memory','바다기억 조개알',84,10000,8650,1200,130,20,13,25,'["fish","trash","decoration"]'::jsonb,'native_boost',2.5,null,null,null,null),
('bait_shell_crumbs','조개 부스러기',46,10000,8600,1400,0,0,13,25,'["fish"]'::jsonb,'standard',1,null,null,null,null),
('bait_shooting_star_tail','별똥별 꼬리젤리',46,10000,9920,0,0,80,13,25,'["fish","trash","decoration"]'::jsonb,'shooting_star',1,null,null,null,null),
('bait_starlight_wax','별빛 밀랍',41,10000,9950,0,0,50,13,25,'["fish"]'::jsonb,'standard',1,null,null,null,null),
('bait_zigzag_jelly','지그재그 젤리',126,10000,10000,0,0,0,13,25,'["fish"]'::jsonb,'alternating',1,null,null,null,null)
on conflict(id) do update set "price"=excluded."price";
notify pgrst, 'reload schema';
commit;
