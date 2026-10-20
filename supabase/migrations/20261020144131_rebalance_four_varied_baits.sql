-- Generated from supabase/catalog/catalog.json. Review before migration deployment.
begin;
set constraints all deferred;
insert into public.fishing_baits ("id","name","description","price","image_path","sort_order","common_bp","rare_bp","epic_bp","mythic_bp","failure_bp","effect_kind","effect_description","success_chance_bp","fish_only","alternating") values
('bait_cracked_star','금 간 별조각','갈라진 틈으로 별빛이 새어 나오는 조각.',184,'/items/baits/cracked-star.png',115,0,9900,0,100,0,'fish','성공 시 희귀 99% · 신화 1%의 물고기를 포획해요.',5000,true,false),
('bait_firefly_pupa','반딧불 번데기','물속에서도 작은 불빛을 품는 번데기.',20,'/items/baits/firefly-pupa.png',112,9000,0,1000,0,0,'fish','성공 시 일반 90% · 특급 10%의 물고기를 포획해요.',2000,true,false),
('bait_lightning_stardust','벼락 별가루','작은 번개를 머금은 눈부신 별가루.',90,'/items/baits/lightning-stardust.png',114,0,0,10000,0,0,'fish','성공 시 특급 물고기만 포획해요.',500,true,false),
('bait_zigzag_jelly','지그재그 젤리','서로 다른 두 맛이 번갈아 퍼지는 젤리.',88,'/items/baits/zigzag-jelly.png',113,10000,0,0,0,0,'fish','일반 전용 → 희귀 전용으로 매번 교대해요. 실패해도 순서가 진행되며 재접속해도 유지돼요. 통발은 회수 시 순서가 진행돼요.',5000,true,true)
on conflict(id) do update set "name"=excluded."name","description"=excluded."description","price"=excluded."price","image_path"=excluded."image_path","sort_order"=excluded."sort_order","common_bp"=excluded."common_bp","rare_bp"=excluded."rare_bp","epic_bp"=excluded."epic_bp","mythic_bp"=excluded."mythic_bp","failure_bp"=excluded."failure_bp","effect_kind"=excluded."effect_kind","effect_description"=excluded."effect_description","success_chance_bp"=excluded."success_chance_bp","fish_only"=excluded."fish_only","alternating"=excluded."alternating";
notify pgrst, 'reload schema';
commit;
