-- Generated from supabase/catalog/catalog.json. Review before migration deployment.
begin;
set constraints all deferred;
insert into public.fishing_relics ("id","name","description","rarity","thumbnail_path","enabled","effect_kind","effect_value","sell_price") values
('sleepless-harvest-bell','잠들지 않는 수확종','장착 중 연료·미끼 생산소의 완성물을 자동 수령해요. 미접속 중에도 작동하며, 이미 상했거나 보유 한도를 넘는 생산물은 제외돼요.','epic','https://ewafafphiovbpjwogwzn.supabase.co/storage/v1/object/public/collectibles/relics/epic/sleepless-harvest-bell_v1_thumbnail.png',true,'production_auto_claim',1,1300)
on conflict(id) do update set "name"=excluded."name","description"=excluded."description","rarity"=excluded."rarity","thumbnail_path"=excluded."thumbnail_path","enabled"=excluded."enabled","effect_kind"=excluded."effect_kind","effect_value"=excluded."effect_value","sell_price"=excluded."sell_price";
notify pgrst, 'reload schema';
commit;
