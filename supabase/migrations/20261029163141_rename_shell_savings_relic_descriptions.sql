-- Generated from supabase/catalog/catalog.json. Review before migration deployment.
begin;
set constraints all deferred;
insert into public.fishing_relics ("id","name","description","rarity","thumbnail_path","enabled","effect_kind","effect_value","sell_price") values
('coin-cradling-clam','동전을 품은 조개','조개 적금 이자 +2%','rare','https://ewafafphiovbpjwogwzn.supabase.co/storage/v1/object/public/collectibles/relics/rare/coin-cradling-clam_v1_thumbnail.png',true,'savings_interest_bonus_percent',2,200),
('sea-king-golden-vault','해왕의 황금 금고','조개 적금 이자 +10%','mythic','https://ewafafphiovbpjwogwzn.supabase.co/storage/v1/object/public/collectibles/relics/mythic/sea-king-golden-vault_v1_thumbnail.png',true,'savings_interest_bonus_percent',10,2800),
('sea-merchant-pearl-vault','바다상인의 진주 금고','조개 적금 이자 +5%','epic','https://ewafafphiovbpjwogwzn.supabase.co/storage/v1/object/public/collectibles/relics/epic/sea-merchant-pearl-vault_v1_thumbnail.png',true,'savings_interest_bonus_percent',5,1300)
on conflict(id) do update set "name"=excluded."name","description"=excluded."description","rarity"=excluded."rarity","thumbnail_path"=excluded."thumbnail_path","enabled"=excluded."enabled","effect_kind"=excluded."effect_kind","effect_value"=excluded."effect_value","sell_price"=excluded."sell_price";
notify pgrst, 'reload schema';
commit;
