-- Generated from supabase/catalog/catalog.json. Review before migration deployment.
begin;
set constraints all deferred;
insert into app_private.fishing_bait_balance_profiles ("id","name","price","success_chance_bp","common_bp","rare_bp","epic_bp","mythic_bp","wait_min_seconds","wait_max_seconds","target_kinds","effect_kind","native_multiplier","night_common_bp","night_rare_bp","night_wait_min_seconds","night_wait_max_seconds","map_chance_bp") values
('bait_map_compass_jelly','나침반 꿀젤리',160,10000,6700,3000,300,0,13,25,'["fish","trash","decoration"]'::jsonb,'standard',1,null,null,null,null,1300),
('bait_map_lantern_berry','길잡이 등불열매',280,10000,3200,6500,300,0,13,25,'["fish","trash","decoration"]'::jsonb,'standard',1,null,null,null,null,1500),
('bait_map_star_chart_pearl','별지도를 품은 진주',680,10000,1500,5000,3500,0,13,25,'["fish","trash","decoration"]'::jsonb,'standard',1,null,null,null,null,2500)
on conflict(id) do update set "name"=excluded."name","price"=excluded."price","success_chance_bp"=excluded."success_chance_bp","common_bp"=excluded."common_bp","rare_bp"=excluded."rare_bp","epic_bp"=excluded."epic_bp","mythic_bp"=excluded."mythic_bp","wait_min_seconds"=excluded."wait_min_seconds","wait_max_seconds"=excluded."wait_max_seconds","target_kinds"=excluded."target_kinds","effect_kind"=excluded."effect_kind","native_multiplier"=excluded."native_multiplier","night_common_bp"=excluded."night_common_bp","night_rare_bp"=excluded."night_rare_bp","night_wait_min_seconds"=excluded."night_wait_min_seconds","night_wait_max_seconds"=excluded."night_wait_max_seconds","map_chance_bp"=excluded."map_chance_bp";
notify pgrst, 'reload schema';
commit;
