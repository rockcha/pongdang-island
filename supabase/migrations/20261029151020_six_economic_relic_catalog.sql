-- Generated from supabase/catalog/catalog.json. Review before migration deployment.
begin;
set constraints all deferred;
insert into public.fishing_relics ("id","name","description","rarity","thumbnail_path","enabled","effect_kind","effect_value","sell_price") values
('coin-cradling-clam','동전을 품은 조개','만기 이자 +2%','rare','https://ewafafphiovbpjwogwzn.supabase.co/storage/v1/object/public/collectibles/relics/rare/coin-cradling-clam_v1_thumbnail.png',true,'savings_interest_bonus_percent',2,200),
('returning-bait-pouch','돌아오는 미끼 주머니','직접 낚시 성공 시 미끼 반환 확률 1%','rare','https://ewafafphiovbpjwogwzn.supabase.co/storage/v1/object/public/collectibles/relics/rare/returning-bait-pouch_v1_thumbnail.png',true,'bait_refund_percent',1,200),
('sea-king-endless-bait-pot','해왕의 끝없는 미끼 항아리','직접 낚시 성공 시 미끼 반환 확률 5%','mythic','https://ewafafphiovbpjwogwzn.supabase.co/storage/v1/object/public/collectibles/relics/mythic/sea-king-endless-bait-pot_v1_thumbnail.png',true,'bait_refund_percent',5,2800),
('sea-king-golden-vault','해왕의 황금 금고','만기 이자 +10%','mythic','https://ewafafphiovbpjwogwzn.supabase.co/storage/v1/object/public/collectibles/relics/mythic/sea-king-golden-vault_v1_thumbnail.png',true,'savings_interest_bonus_percent',10,2800),
('sea-merchant-pearl-vault','바다상인의 진주 금고','만기 이자 +5%','epic','https://ewafafphiovbpjwogwzn.supabase.co/storage/v1/object/public/collectibles/relics/epic/sea-merchant-pearl-vault_v1_thumbnail.png',true,'savings_interest_bonus_percent',5,1300),
('tide-return-bait-box','밀물이 돌려준 미끼함','직접 낚시 성공 시 미끼 반환 확률 3%','epic','https://ewafafphiovbpjwogwzn.supabase.co/storage/v1/object/public/collectibles/relics/epic/tide-return-bait-box_v1_thumbnail.png',true,'bait_refund_percent',3,1300)
on conflict(id) do update set "name"=excluded."name","description"=excluded."description","rarity"=excluded."rarity","thumbnail_path"=excluded."thumbnail_path","enabled"=excluded."enabled","effect_kind"=excluded."effect_kind","effect_value"=excluded."effect_value","sell_price"=excluded."sell_price";
notify pgrst, 'reload schema';
commit;
