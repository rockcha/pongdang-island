-- Generated from supabase/catalog/catalog.json. Review before migration deployment.
begin;
set constraints all deferred;
insert into public.fishing_baits ("id","name","description","price","image_path","sort_order","common_bp","rare_bp","epic_bp","mythic_bp","failure_bp","effect_kind","effect_description","success_chance_bp","fish_only","alternating") values
('bait_breadcrumbs','보슬보슬 빵가루','보슬보슬한 빵가루로 물고기부터 물밑의 작은 물건까지 두루 만나요.',18,'https://ewafafphiovbpjwogwzn.supabase.co/storage/v1/object/public/collectibles/items/baits/soft-breadcrumbs.png',99,9500,500,0,0,0,'fish','보슬보슬한 빵가루로 물고기부터 물밑의 작은 물건까지 두루 만나요.',10000,false,false),
('bait_grain_dumpling','노릇노릇 곡물경단','노릇하게 구운 곡물 향기로 다양한 바다 친구들과 물밑의 물건을 불러요.',25,'https://ewafafphiovbpjwogwzn.supabase.co/storage/v1/object/public/collectibles/items/baits/toasted-grain-dumpling.png',100,9000,1000,0,0,0,'fish','노릇하게 구운 곡물 향기로 다양한 바다 친구들과 물밑의 물건을 불러요.',10000,false,false)
on conflict(id) do update set "name"=excluded."name","description"=excluded."description","price"=excluded."price","image_path"=excluded."image_path","sort_order"=excluded."sort_order","common_bp"=excluded."common_bp","rare_bp"=excluded."rare_bp","epic_bp"=excluded."epic_bp","mythic_bp"=excluded."mythic_bp","failure_bp"=excluded."failure_bp","effect_kind"=excluded."effect_kind","effect_description"=excluded."effect_description","success_chance_bp"=excluded."success_chance_bp","fish_only"=excluded."fish_only","alternating"=excluded."alternating";
notify pgrst, 'reload schema';
commit;
