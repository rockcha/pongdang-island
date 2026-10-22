-- Generated from supabase/catalog/catalog.json. Review before migration deployment.
begin;
set constraints all deferred;
insert into public.fishing_baits ("id","name","description","price","image_path","sort_order","common_bp","rare_bp","epic_bp","mythic_bp","failure_bp","effect_kind","effect_description","success_chance_bp","fish_only","alternating") values
('bait_firefly_pupa','반딧불 번데기','물속에서도 작은 불빛을 품는 번데기.',11,'/items/baits/firefly-pupa.png',112,9200,0,800,0,0,'fish','성공 시 일반 92% · 특급 8%의 물고기를 포획해요.',2000,true,false),
('bait_grubby_magnet','꼬질 자석경단','해초와 작은 자석을 꾹꾹 뭉친 꼬질한 경단. 물고기 대신 바닷속 버려진 물건들이 달라붙어요.',12,'/items/baits/grubby-magnet-dumpling.png',103,8320,1500,150,30,0,'fish','성공 확률 소폭 증가 · 낚시 성공 시 쓰레기 포획 100%',null,false,false),
('bait_halfmoon_honey','반달 꿀젤리','달콤한 꿀을 반달 모양으로 굳힌 황금빛 젤리. 부드러운 향기가 평범한 친구와 희귀한 친구를 반반씩 불러 모아요.',100,'https://ewafafphiovbpjwogwzn.supabase.co/storage/v1/object/public/collectibles/items/baits/halfmoon-honey-jelly.png',120,5000,5000,0,0,0,'fish','성공 시 일반 50% · 희귀 50%의 물고기를 포획해요.',7500,true,false),
('bait_shell_crumbs','조개 부스러기','잘게 부순 조개의 은은한 바다 향.',8,'/items/baits/shell-crumbs.png',111,8200,1800,0,0,0,'fish','성공 시 일반 82% · 희귀 18%의 물고기를 포획해요.',2000,true,false)
on conflict(id) do update set "name"=excluded."name","description"=excluded."description","price"=excluded."price","image_path"=excluded."image_path","sort_order"=excluded."sort_order","common_bp"=excluded."common_bp","rare_bp"=excluded."rare_bp","epic_bp"=excluded."epic_bp","mythic_bp"=excluded."mythic_bp","failure_bp"=excluded."failure_bp","effect_kind"=excluded."effect_kind","effect_description"=excluded."effect_description","success_chance_bp"=excluded."success_chance_bp","fish_only"=excluded."fish_only","alternating"=excluded."alternating";
notify pgrst, 'reload schema';
commit;
