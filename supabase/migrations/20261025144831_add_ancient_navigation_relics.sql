-- Generated from supabase/catalog/catalog.json. Review before migration deployment.
begin;
set constraints all deferred;
insert into public.fishing_relics ("id","name","description","rarity","thumbnail_path","enabled","effect_kind","effect_value","sell_price") values
('forgotten-route-compass','잊힌 항로의 나침반','장착한 상태로 출항하는 어선의 항해 시간이 3% 줄어들어요. 진행 중인 항해와 통발에는 적용되지 않아요.','rare','https://ewafafphiovbpjwogwzn.supabase.co/storage/v1/object/public/collectibles/relics/rare/forgotten-route-compass_v1_thumbnail.png',true,'harbor_duration_percent',3,200),
('horizon-ark','수평선의 성궤','장착한 상태로 출항하는 어선의 항해 시간이 10% 줄어들어요. 진행 중인 항해와 통발에는 적용되지 않아요.','mythic','https://ewafafphiovbpjwogwzn.supabase.co/storage/v1/object/public/collectibles/relics/mythic/horizon-ark_v1_thumbnail.png',true,'harbor_duration_percent',10,3000),
('sealed-fairwind-reliquary','순풍을 봉인한 성유물','장착한 상태로 출항하는 어선의 항해 시간이 6% 줄어들어요. 진행 중인 항해와 통발에는 적용되지 않아요.','epic','https://ewafafphiovbpjwogwzn.supabase.co/storage/v1/object/public/collectibles/relics/epic/sealed-fairwind-reliquary_v1_thumbnail.png',true,'harbor_duration_percent',6,1300)
on conflict(id) do update set "name"=excluded."name","description"=excluded."description","rarity"=excluded."rarity","thumbnail_path"=excluded."thumbnail_path","enabled"=excluded."enabled","effect_kind"=excluded."effect_kind","effect_value"=excluded."effect_value","sell_price"=excluded."sell_price";
notify pgrst, 'reload schema';
commit;
