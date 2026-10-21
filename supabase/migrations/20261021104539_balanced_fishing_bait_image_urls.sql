-- Generated from supabase/catalog/catalog.json. Review before migration deployment.
begin;
set constraints all deferred;
insert into public.fishing_baits ("id","name","description","price","image_path","sort_order","common_bp","rare_bp","epic_bp","mythic_bp","failure_bp","effect_kind","effect_description","success_chance_bp","fish_only","alternating") values
('bait_halfmoon_honey','반달 꿀젤리','달콤한 꿀을 반달 모양으로 굳힌 황금빛 젤리. 부드러운 향기가 평범한 친구와 희귀한 친구를 반반씩 불러 모아요.',100,'https://ewafafphiovbpjwogwzn.supabase.co/storage/v1/object/public/collectibles/items/baits/halfmoon-honey-jelly.png',120,5000,5000,0,0,0,'fish','성공 시 일반 50% · 희귀 50%의 물고기를 포획해요.',8000,true,false),
('bait_shooting_star_tail','별똥별 꼬리젤리','보랏빛 별에 황금빛 꼬리가 흐르는 말랑한 젤리. 대부분 버려진 물건이 달라붙지만, 아주 가끔 신화 속 존재가 별빛을 따라와요.',40,'https://ewafafphiovbpjwogwzn.supabase.co/storage/v1/object/public/collectibles/items/baits/shooting-star-tail-jelly.png',122,9900,0,0,100,0,'fish','성공 시 일반 쓰레기 99% · 신화 등급 개체 1%를 포획해요. 신화는 물고기·쓰레기·장식물이 대상이에요.',8000,false,false),
('bait_snowflake_salt','눈꽃 소금사탕','맑은 바다 소금 속에 하얀 눈꽃을 품은 하늘빛 사탕. 어느 바다에서나 익숙한 향기로 공통종 친구들을 불러요.',35,'https://ewafafphiovbpjwogwzn.supabase.co/storage/v1/object/public/collectibles/items/baits/snowflake-salt-candy.png',121,8320,1500,150,30,0,'fish','성공 시 공통종 물고기·쓰레기만 포획해요. 토착종·외지종과 장식물은 제외해요.',5000,false,false)
on conflict(id) do update set "name"=excluded."name","description"=excluded."description","price"=excluded."price","image_path"=excluded."image_path","sort_order"=excluded."sort_order","common_bp"=excluded."common_bp","rare_bp"=excluded."rare_bp","epic_bp"=excluded."epic_bp","mythic_bp"=excluded."mythic_bp","failure_bp"=excluded."failure_bp","effect_kind"=excluded."effect_kind","effect_description"=excluded."effect_description","success_chance_bp"=excluded."success_chance_bp","fish_only"=excluded."fish_only","alternating"=excluded."alternating";
notify pgrst, 'reload schema';
commit;
