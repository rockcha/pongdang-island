-- Generated from supabase/catalog/catalog.json. Review before migration deployment.
begin;
set constraints all deferred;
insert into public.fishing_relics ("id","name","description","rarity","thumbnail_path","enabled","effect_kind","effect_value","sell_price") values
('forgotten-era-compass','잊힌 시대의 나침반','직접 낚시 유물 발견 확률 +3%p · 장착한 상태로 새로 시작하는 직접 낚시에만 적용돼요.','epic','https://ewafafphiovbpjwogwzn.supabase.co/storage/v1/object/public/collectibles/relics/epic/forgotten-era-compass_v1_thumbnail.png',true,'direct_relic_chance_percent',3,1300),
('hidden-route-lens','숨은 항로의 렌즈','직접 낚시 지도 조각 발견 확률 +2%p · 장착한 상태로 새로 시작하는 직접 낚시에만 적용돼요.','epic','https://ewafafphiovbpjwogwzn.supabase.co/storage/v1/object/public/collectibles/relics/epic/hidden-route-lens_v1_thumbnail.png',true,'direct_map_chance_percent',2,1300),
('ocean-memory-compass','바다의 기억을 가리키는 나침반','직접 낚시 유물 발견 확률 +6%p · 장착한 상태로 새로 시작하는 직접 낚시에만 적용돼요.','mythic','https://ewafafphiovbpjwogwzn.supabase.co/storage/v1/object/public/collectibles/relics/mythic/ocean-memory-compass_v1_thumbnail.png',true,'direct_relic_chance_percent',6,3000),
('trace-seeking-compass','흔적을 찾는 나침반','직접 낚시 유물 발견 확률 +1%p · 장착한 상태로 새로 시작하는 직접 낚시에만 적용돼요.','rare','https://ewafafphiovbpjwogwzn.supabase.co/storage/v1/object/public/collectibles/relics/rare/trace-seeking-compass_v1_thumbnail.png',true,'direct_relic_chance_percent',1,200),
('waterway-reading-lens','물길을 읽는 렌즈','직접 낚시 지도 조각 발견 확률 +0.5%p · 장착한 상태로 새로 시작하는 직접 낚시에만 적용돼요.','rare','https://ewafafphiovbpjwogwzn.supabase.co/storage/v1/object/public/collectibles/relics/rare/waterway-reading-lens_v1_thumbnail.png',true,'direct_map_chance_percent',0.5,200),
('worlds-end-lens','세상 끝을 비추는 렌즈','직접 낚시 지도 조각 발견 확률 +5%p · 장착한 상태로 새로 시작하는 직접 낚시에만 적용돼요.','mythic','https://ewafafphiovbpjwogwzn.supabase.co/storage/v1/object/public/collectibles/relics/mythic/worlds-end-lens_v1_thumbnail.png',true,'direct_map_chance_percent',5,3000)
on conflict(id) do update set "name"=excluded."name","description"=excluded."description","rarity"=excluded."rarity","thumbnail_path"=excluded."thumbnail_path","enabled"=excluded."enabled","effect_kind"=excluded."effect_kind","effect_value"=excluded."effect_value","sell_price"=excluded."sell_price";
notify pgrst, 'reload schema';
commit;
