-- Generated from supabase/catalog/catalog.json. Review before migration deployment.
begin;
set constraints all deferred;
insert into public.fishing_baits ("id","name","description","price","image_path","sort_order","common_bp","rare_bp","epic_bp","mythic_bp","failure_bp","effect_kind","effect_description","success_chance_bp","fish_only","alternating") values
('bait_breadcrumbs','보슬보슬 빵가루','보슬보슬한 빵가루를 좋아하는 물고기만 찾아와요. 일반 95% · 희귀 5%.',18,'/app-icons/bait.png',99,9500,500,0,0,0,'fish','보슬보슬한 빵가루를 좋아하는 물고기만 찾아와요. 일반 95% · 희귀 5%.',10000,true,false),
('bait_grain_dumpling','노릇노릇 곡물경단','고소하게 구운 곡물 향기로 물고기만 불러요. 일반 90% · 희귀 10%.',25,'/app-icons/bait.png',100,9000,1000,0,0,0,'fish','고소하게 구운 곡물 향기로 물고기만 불러요. 일반 90% · 희귀 10%.',10000,true,false),
('bait_grubby_magnet','꼬질 자석경단','꼬질한 향기로 물밑에 버려진 쓰레기만 끌어모아요.',8,'/items/baits/grubby-magnet-dumpling.png',103,9000,950,50,0,0,'fish','꼬질한 향기로 물밑에 버려진 쓰레기만 끌어모아요.',10000,false,false)
on conflict(id) do update set "name"=excluded."name","description"=excluded."description","price"=excluded."price","image_path"=excluded."image_path","sort_order"=excluded."sort_order","common_bp"=excluded."common_bp","rare_bp"=excluded."rare_bp","epic_bp"=excluded."epic_bp","mythic_bp"=excluded."mythic_bp","failure_bp"=excluded."failure_bp","effect_kind"=excluded."effect_kind","effect_description"=excluded."effect_description","success_chance_bp"=excluded."success_chance_bp","fish_only"=excluded."fish_only","alternating"=excluded."alternating";
insert into app_private.fishing_bait_balance_profiles ("id","name","price","success_chance_bp","common_bp","rare_bp","epic_bp","mythic_bp","wait_min_seconds","wait_max_seconds","target_kinds","effect_kind","native_multiplier","night_common_bp","night_rare_bp","night_wait_min_seconds","night_wait_max_seconds") values
('bait_breadcrumbs','보슬보슬 빵가루',18,10000,9500,500,0,0,12,24,'["fish"]'::jsonb,'standard',1,null,null,null,null),
('bait_grain_dumpling','노릇노릇 곡물경단',25,10000,9000,1000,0,0,12,24,'["fish"]'::jsonb,'standard',1,null,null,null,null),
('bait_grubby_magnet','꼬질 자석경단',8,10000,9000,950,50,0,12,24,'["trash"]'::jsonb,'standard',1,null,null,null,null)
on conflict(id) do update set "name"=excluded."name","price"=excluded."price","success_chance_bp"=excluded."success_chance_bp","common_bp"=excluded."common_bp","rare_bp"=excluded."rare_bp","epic_bp"=excluded."epic_bp","mythic_bp"=excluded."mythic_bp","wait_min_seconds"=excluded."wait_min_seconds","wait_max_seconds"=excluded."wait_max_seconds","target_kinds"=excluded."target_kinds","effect_kind"=excluded."effect_kind","native_multiplier"=excluded."native_multiplier","night_common_bp"=excluded."night_common_bp","night_rare_bp"=excluded."night_rare_bp","night_wait_min_seconds"=excluded."night_wait_min_seconds","night_wait_max_seconds"=excluded."night_wait_max_seconds";
notify pgrst, 'reload schema';
commit;
