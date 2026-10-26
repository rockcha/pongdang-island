-- Generated from supabase/catalog/catalog.json. Review before migration deployment.
begin;
set constraints all deferred;
insert into public.fishing_relics ("id","name","description","rarity","thumbnail_path","enabled","effect_kind","effect_value","sell_price") values
('golden-anchor-seal','황금 닻 인장','배 구매 가격 150골드 할인 · 버그로 일시 중단되어 획득·장착할 수 없어요. 보유자는 건의함에 접수하면 확인 후 보상해 드려요.','epic','relics/epic/golden-anchor-seal_thumbnail.png',false,'boat_discount_gold',150,1300),
('sea-king-shipwright-edict','해왕의 조선 칙서','배 구매 가격 400골드 할인 · 버그로 일시 중단되어 획득·장착할 수 없어요. 보유자는 건의함에 접수하면 확인 후 보상해 드려요.','mythic','relics/mythic/sea-king-shipwright-edict_thumbnail.png',false,'boat_discount_gold',400,3000)
on conflict(id) do update set "name"=excluded."name","description"=excluded."description","rarity"=excluded."rarity","thumbnail_path"=excluded."thumbnail_path","enabled"=excluded."enabled","effect_kind"=excluded."effect_kind","effect_value"=excluded."effect_value","sell_price"=excluded."sell_price";
-- Disable only the affected loadouts; preserve ownership and discovery for compensation.
delete from app_private.player_relic_loadouts where relic_id in ('golden-anchor-seal','sea-king-shipwright-edict');
notify pgrst, 'reload schema';
commit;
