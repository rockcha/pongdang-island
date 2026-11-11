-- Generated from supabase/catalog/catalog.json. Review before migration deployment.
begin;
set constraints all deferred;
insert into public.fishing_baits ("id","name","description","price","image_path","sort_order","common_bp","rare_bp","epic_bp","mythic_bp","failure_bp","effect_kind","effect_description","success_chance_bp","fish_only","alternating") values
('bait_pet_biscuit','바삭별 비스킷','별 모양 비스킷의 고소한 향이 작은 친구들을 불러요.',200,'/pets/items/biscuit_v1.webp',318,8500,1200,280,20,0,'fish','펫 3% · 어느 해역에서나 작은 친구를 만날 수 있어요.',10000,false,false),
('bait_pet_macaron','포근꿈 마카롱','포근한 크림과 달콤한 향에 수줍은 친구도 다가와요.',300,'/pets/items/macaron_v1.webp',319,8500,1200,280,20,0,'fish','펫 5% · 어느 해역에서나 작은 친구를 만날 수 있어요.',10000,false,false)
on conflict(id) do update set "name"=excluded."name","description"=excluded."description","price"=excluded."price","image_path"=excluded."image_path","sort_order"=excluded."sort_order","common_bp"=excluded."common_bp","rare_bp"=excluded."rare_bp","epic_bp"=excluded."epic_bp","mythic_bp"=excluded."mythic_bp","failure_bp"=excluded."failure_bp","effect_kind"=excluded."effect_kind","effect_description"=excluded."effect_description","success_chance_bp"=excluded."success_chance_bp","fish_only"=excluded."fish_only","alternating"=excluded."alternating";
notify pgrst, 'reload schema';
commit;
