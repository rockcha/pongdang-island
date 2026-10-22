-- Generated from supabase/catalog/catalog.json. Review before migration deployment.
begin;
set constraints all deferred;
insert into public.fishing_baits ("id","name","description","price","image_path","sort_order","common_bp","rare_bp","epic_bp","mythic_bp","failure_bp","effect_kind","effect_description","success_chance_bp","fish_only","alternating") values
('bait_deep_sleep_sachet','깊은잠 향낭','아주 긴 기다림 끝에 깊은 곳의 손님을 만나요. 바다를 바라보며 충분히 여유를 가져 주세요.',380,'https://ewafafphiovbpjwogwzn.supabase.co/storage/v1/object/public/collectibles/items/baits/deep-sleep-sachet-v1.png',305,0,8400,1500,100,0,'fish','물고기·쓰레기·장식물 포획 미끼 확률로 인한 강제 실패 없이 마지막 게이지 조작으로 포획해요.',10000,false,false),
('bait_moonshade_dumpling','달그늘 경단','햇살 아래서는 차분하게, 밤에는 조금 더 오래 기다려 주세요. 달그늘이 짙어지면 희귀한 손님이 더 자주 찾아와요.',130,'https://ewafafphiovbpjwogwzn.supabase.co/storage/v1/object/public/collectibles/items/baits/moonshade-dumpling-v1.png',317,5500,4500,0,0,0,'fish','낮에는 일반 55%·희귀 45%, 밤에는 일반 45%·희귀 55%예요. 물고기·쓰레기·장식물 포획 미끼 확률로 인한 강제 실패 없이 마지막 게이지 조작으로 포획해요.',10000,false,false)
on conflict(id) do update set "name"=excluded."name","description"=excluded."description","price"=excluded."price","image_path"=excluded."image_path","sort_order"=excluded."sort_order","common_bp"=excluded."common_bp","rare_bp"=excluded."rare_bp","epic_bp"=excluded."epic_bp","mythic_bp"=excluded."mythic_bp","failure_bp"=excluded."failure_bp","effect_kind"=excluded."effect_kind","effect_description"=excluded."effect_description","success_chance_bp"=excluded."success_chance_bp","fish_only"=excluded."fish_only","alternating"=excluded."alternating";
notify pgrst, 'reload schema';
commit;
