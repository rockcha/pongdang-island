-- Generated from supabase/catalog/catalog.json. Review before migration deployment.
begin;
set constraints all deferred;
insert into app_private.fishing_bait_balance_profiles ("id","name","price","success_chance_bp","common_bp","rare_bp","epic_bp","mythic_bp","wait_min_seconds","wait_max_seconds","target_kinds","effect_kind","native_multiplier","night_common_bp","night_rare_bp","night_wait_min_seconds","night_wait_max_seconds") values
('bait','퐁당 지렁이',50,10000,8320,1500,150,30,16,20,'["fish","trash"]'::jsonb,'standard',1,null,null,null,null),
('bait_aurora_clockwork_bug','오로라 태엽벌레',280,10000,2400,7500,0,100,18,23,'["fish","decoration"]'::jsonb,'standard',1,null,null,null,null),
('bait_cloud_dough','솜구름 반죽',43,10000,10000,0,0,0,13,15,'["fish"]'::jsonb,'standard',1,null,null,null,null),
('bait_coral_pollen','산호 꽃가루',75,10000,9500,0,500,0,14,17,'["fish"]'::jsonb,'standard',1,null,null,null,null),
('bait_cracked_star','금 간 별조각',350,10000,0,9900,0,100,20,26,'["fish"]'::jsonb,'standard',1,null,null,null,null),
('bait_deep_sleep_sachet','깊은잠 향낭',380,10000,0,8400,1500,100,70,90,'["fish","trash","decoration"]'::jsonb,'standard',1,null,null,null,null),
('bait_epic','별잠의 유혹',null,10000,0,0,9970,30,16,20,'["fish","trash"]'::jsonb,'standard',1,null,null,null,null),
('bait_firefly_pupa','반딧불 번데기',55,10000,9200,0,800,0,20,26,'["fish"]'::jsonb,'standard',1,null,null,null,null),
('bait_first_greeting','소라의 첫인사',null,10000,8320,1500,150,30,15,18,'["fish","trash","decoration"]'::jsonb,'undiscovered',1,null,null,null,null),
('bait_forbidden_star','금단의 별사탕',165,10000,7223,1876,760,141,19,25,'["fish","trash"]'::jsonb,'standard',1,null,null,null,null),
('bait_goblin_bell_cherry','도깨비 방울체리',235,10000,0,9000,1000,0,19,24,'["fish"]'::jsonb,'standard',1,null,null,null,null),
('bait_grubby_magnet','꼬질 자석경단',23,10000,8320,1500,150,30,15,18,'["trash"]'::jsonb,'standard',1,null,null,null,null),
('bait_halfmoon_honey','반달 꿀젤리',130,10000,5000,5000,0,0,16,20,'["fish"]'::jsonb,'standard',1,null,null,null,null),
('bait_honey_dumpling','햇살 꿀경단',75,10000,8500,1500,0,0,14,16,'["fish"]'::jsonb,'standard',1,null,null,null,null),
('bait_lightning_stardust','벼락 별가루',300,10000,0,8000,2000,0,22,28,'["fish"]'::jsonb,'standard',1,null,null,null,null),
('bait_magnet','심해 인력석',65,10000,8320,1500,150,30,18,22,'["decoration"]'::jsonb,'standard',1,null,null,null,null),
('bait_mermaid_whisper_candy','인어의 귓속말 캔디',165,10000,3500,6500,0,0,15,18,'["fish"]'::jsonb,'standard',1,null,null,null,null),
('bait_moonshade_dumpling','달그늘 경단',130,10000,5500,4500,0,0,18,22,'["fish","trash","decoration"]'::jsonb,'day_night',1,4500,5500,22,26),
('bait_pearl_bubble','진주 거품방울',100,10000,6500,3500,0,0,16,20,'["fish"]'::jsonb,'standard',1,null,null,null,null),
('bait_safe','이슬잎 경단',69,10000,8320,1500,150,30,13,15,'["fish","trash"]'::jsonb,'standard',1,null,null,null,null),
('bait_sea_memory','바다기억 조개알',100,10000,8320,1500,150,30,18,22,'["fish","trash"]'::jsonb,'native_boost',3,null,null,null,null),
('bait_shell_crumbs','조개 부스러기',40,10000,8200,1800,0,0,18,22,'["fish"]'::jsonb,'standard',1,null,null,null,null),
('bait_shooting_star_tail','별똥별 꼬리젤리',50,10000,9900,0,0,100,18,22,'["fish","trash","decoration"]'::jsonb,'shooting_star',1,null,null,null,null),
('bait_snowflake_salt','눈꽃 소금사탕',70,10000,8320,1500,150,30,16,20,'["fish","trash"]'::jsonb,'common_only',1,null,null,null,null),
('bait_special','달빛 진주새우',null,10000,0,9870,100,30,14,17,'["fish","trash"]'::jsonb,'standard',1,null,null,null,null),
('bait_starlight_wax','별빛 밀랍',45,10000,9940,0,0,60,18,22,'["fish"]'::jsonb,'standard',1,null,null,null,null),
('bait_zigzag_jelly','지그재그 젤리',140,10000,10000,0,0,0,17,21,'["fish"]'::jsonb,'alternating',1,null,null,null,null)
on conflict(id) do update set "name"=excluded."name","price"=excluded."price","success_chance_bp"=excluded."success_chance_bp","common_bp"=excluded."common_bp","rare_bp"=excluded."rare_bp","epic_bp"=excluded."epic_bp","mythic_bp"=excluded."mythic_bp","wait_min_seconds"=excluded."wait_min_seconds","wait_max_seconds"=excluded."wait_max_seconds","target_kinds"=excluded."target_kinds","effect_kind"=excluded."effect_kind","native_multiplier"=excluded."native_multiplier","night_common_bp"=excluded."night_common_bp","night_rare_bp"=excluded."night_rare_bp","night_wait_min_seconds"=excluded."night_wait_min_seconds","night_wait_max_seconds"=excluded."night_wait_max_seconds";
notify pgrst, 'reload schema';
commit;
