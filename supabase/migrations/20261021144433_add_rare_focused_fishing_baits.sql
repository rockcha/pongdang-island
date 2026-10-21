-- Generated from supabase/catalog/catalog.json. Review before migration deployment.
begin;
set constraints all deferred;
insert into public.fishing_baits ("id","name","description","price","image_path","sort_order","common_bp","rare_bp","epic_bp","mythic_bp","failure_bp","effect_kind","effect_description","success_chance_bp","fish_only","alternating") values
('bait_goblin_bell_cherry','도깨비 방울체리','물고기에게만 들리는 장난스러운 방울 소리를 내는 도깨비 체리.',165,'https://ewafafphiovbpjwogwzn.supabase.co/storage/v1/object/public/collectibles/items/baits/goblin-bell-cherry.png',123,0,9000,1000,0,0,'fish','성공 시 희귀 90% · 특급 10%의 물고기를 포획해요.',7000,true,false),
('bait_aurora_clockwork_bug','오로라 태엽벌레','태엽이 풀리면 오색 오로라 빛을 흘리는 작은 기계 벌레.',210,'https://ewafafphiovbpjwogwzn.supabase.co/storage/v1/object/public/collectibles/items/baits/aurora-clockwork-bug.png',124,2400,7500,0,100,0,'fish','성공 시 일반 24% · 희귀 75% · 신화 1%의 물고기를 포획해요.',7500,true,false),
('bait_mermaid_whisper_candy','인어의 귓속말 캔디','물속에서 녹을 때마다 인어의 작은 노랫소리가 퍼지는 캔디.',150,'https://ewafafphiovbpjwogwzn.supabase.co/storage/v1/object/public/collectibles/items/baits/mermaid-whisper-candy.png',125,3500,6500,0,0,0,'fish','성공 시 일반 35% · 희귀 65%의 물고기를 포획해요.',9000,true,false)
on conflict(id) do update set "name"=excluded."name","description"=excluded."description","price"=excluded."price","image_path"=excluded."image_path","sort_order"=excluded."sort_order","common_bp"=excluded."common_bp","rare_bp"=excluded."rare_bp","epic_bp"=excluded."epic_bp","mythic_bp"=excluded."mythic_bp","failure_bp"=excluded."failure_bp","effect_kind"=excluded."effect_kind","effect_description"=excluded."effect_description","success_chance_bp"=excluded."success_chance_bp","fish_only"=excluded."fish_only","alternating"=excluded."alternating";
notify pgrst, 'reload schema';
commit;
