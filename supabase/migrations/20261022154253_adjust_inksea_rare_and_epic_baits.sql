-- Generated from supabase/catalog/catalog.json. Review before migration deployment.
begin;
set constraints all deferred;
update public.collectible_species s set sell_price=p.sell_price from (values
('muk-bleeding-octopus',279),
('muk-brush-whisker-catfish',279),
('muk-inkstone-home-octopus',279),
('muk-inkwashing-sea-otter',279),
('muk-lotus-jellyfish',279),
('muk-orchid-fin-betta',279),
('muk-plum-branch-seahorse',279),
('muk-seal-turtle',279)) as p(id,sell_price) where s.id=p.id;
insert into public.fishing_baits ("id","name","description","price","image_path","sort_order","common_bp","rare_bp","epic_bp","mythic_bp","failure_bp","effect_kind","effect_description","success_chance_bp","fish_only","alternating") values
('bait_firefly_pupa','반딧불 번데기','깊은 곳까지 번지는 작은 불빛이 특급 물고기를 유혹해요.',70,'/items/baits/firefly-pupa.png',112,9550,0,450,0,0,'fish','깊은 곳까지 번지는 작은 불빛이 특급 물고기를 유혹해요.',10000,true,false),
('bait_lightning_stardust','벼락 별가루','강렬한 번개빛이 희귀·특급 물고기를 끌어당겨요.',280,'/items/baits/lightning-stardust.png',114,0,9450,550,0,0,'fish','강렬한 번개빛이 희귀·특급 물고기를 끌어당겨요.',10000,true,false)
on conflict(id) do update set "name"=excluded."name","description"=excluded."description","price"=excluded."price","image_path"=excluded."image_path","sort_order"=excluded."sort_order","common_bp"=excluded."common_bp","rare_bp"=excluded."rare_bp","epic_bp"=excluded."epic_bp","mythic_bp"=excluded."mythic_bp","failure_bp"=excluded."failure_bp","effect_kind"=excluded."effect_kind","effect_description"=excluded."effect_description","success_chance_bp"=excluded."success_chance_bp","fish_only"=excluded."fish_only","alternating"=excluded."alternating";
insert into app_private.fishing_bait_balance_profiles ("id","name","price","success_chance_bp","common_bp","rare_bp","epic_bp","mythic_bp","wait_min_seconds","wait_max_seconds","target_kinds","effect_kind","native_multiplier","night_common_bp","night_rare_bp","night_wait_min_seconds","night_wait_max_seconds") values
('bait_firefly_pupa','반딧불 번데기',70,10000,9550,0,450,0,12,24,'["fish"]'::jsonb,'standard',1,null,null,null,null),
('bait_lightning_stardust','벼락 별가루',280,10000,0,9450,550,0,12,24,'["fish"]'::jsonb,'standard',1,null,null,null,null)
on conflict(id) do update set "name"=excluded."name","price"=excluded."price","success_chance_bp"=excluded."success_chance_bp","common_bp"=excluded."common_bp","rare_bp"=excluded."rare_bp","epic_bp"=excluded."epic_bp","mythic_bp"=excluded."mythic_bp","wait_min_seconds"=excluded."wait_min_seconds","wait_max_seconds"=excluded."wait_max_seconds","target_kinds"=excluded."target_kinds","effect_kind"=excluded."effect_kind","native_multiplier"=excluded."native_multiplier","night_common_bp"=excluded."night_common_bp","night_rare_bp"=excluded."night_rare_bp","night_wait_min_seconds"=excluded."night_wait_min_seconds","night_wait_max_seconds"=excluded."night_wait_max_seconds";
notify pgrst, 'reload schema';
commit;
