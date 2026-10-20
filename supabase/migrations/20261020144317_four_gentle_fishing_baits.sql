-- Generated from supabase/catalog/catalog.json. Review before migration deployment.
begin;
set constraints all deferred;
insert into public.fishing_baits ("id","name","description","price","image_path","sort_order","common_bp","rare_bp","epic_bp","mythic_bp","failure_bp","effect_kind","effect_description","success_chance_bp","fish_only","alternating") values
('bait_coral_pollen','산호 꽃가루','산호꽃에서 모은 향긋한 분홍빛 가루.',69,'/items/baits/coral-pollen.png',118,9500,0,500,0,0,'fish','성공 시 일반 95% · 특급 5%의 물고기를 포획해요.',7500,true,false),
('bait_honey_dumpling','햇살 꿀경단','따뜻한 햇살빛 꿀을 머금은 말랑한 경단.',64,'/items/baits/sunny-honey-dumpling.png',116,8500,1500,0,0,0,'fish','성공 시 일반 85% · 희귀 15%의 물고기를 포획해요.',8000,true,false),
('bait_pearl_bubble','진주 거품방울','진주를 감싼 맑은 거품이 물속에서 은은하게 빛나요.',81,'/items/baits/pearl-bubble.png',117,6500,3500,0,0,0,'fish','성공 시 일반 65% · 희귀 35%의 물고기를 포획해요.',6500,true,false),
('bait_starlight_wax','별빛 밀랍','작은 별빛을 품은 부드러운 밀랍 덩어리.',42,'/items/baits/starlight-wax.png',119,9940,0,0,60,0,'fish','성공 시 일반 99.4% · 신화 0.6%의 물고기를 포획해요.',7000,true,false)
on conflict(id) do update set "name"=excluded."name","description"=excluded."description","price"=excluded."price","image_path"=excluded."image_path","sort_order"=excluded."sort_order","common_bp"=excluded."common_bp","rare_bp"=excluded."rare_bp","epic_bp"=excluded."epic_bp","mythic_bp"=excluded."mythic_bp","failure_bp"=excluded."failure_bp","effect_kind"=excluded."effect_kind","effect_description"=excluded."effect_description","success_chance_bp"=excluded."success_chance_bp","fish_only"=excluded."fish_only","alternating"=excluded."alternating";
notify pgrst, 'reload schema';
commit;
