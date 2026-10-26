-- Generated from supabase/catalog/catalog.json. Review before migration deployment.
begin;
set constraints all deferred;
insert into public.fishing_relics ("id","name","description","rarity","thumbnail_path","enabled","effect_kind","effect_value","sell_price") values
('golden-parade-crown','황금 행진의 왕관','미니게임 "퐁이 잡기" 황금 퐁이 10마리 등장','mythic','https://ewafafphiovbpjwogwzn.supabase.co/storage/v1/object/public/collectibles/relics/mythic/golden-parade-crown_thumbnail.png',true,'pongi_whack_golden_count',10,3000),
('golden-pongi-invitation-bell','황금 퐁이의 초대종','미니게임 "퐁이 잡기" 황금 퐁이 4마리 등장','epic','https://ewafafphiovbpjwogwzn.supabase.co/storage/v1/object/public/collectibles/relics/epic/golden-pongi-invitation-bell_thumbnail.png',true,'pongi_whack_golden_count',4,1300),
('golden-pongi-whistle','금빛 퐁이 호루라기','미니게임 "퐁이 잡기" 황금 퐁이 2마리 등장','rare','https://ewafafphiovbpjwogwzn.supabase.co/storage/v1/object/public/collectibles/relics/rare/golden-pongi-whistle_thumbnail.png',true,'pongi_whack_golden_count',2,200)
on conflict(id) do update set "name"=excluded."name","description"=excluded."description","rarity"=excluded."rarity","thumbnail_path"=excluded."thumbnail_path","enabled"=excluded."enabled","effect_kind"=excluded."effect_kind","effect_value"=excluded."effect_value","sell_price"=excluded."sell_price";
notify pgrst, 'reload schema';
commit;
