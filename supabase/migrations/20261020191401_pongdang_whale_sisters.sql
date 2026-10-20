-- Generated from supabase/catalog/catalog.json. Review before migration deployment.
begin;
set constraints all deferred;
insert into public.collectible_species ("id","kind","name","description","swim_y_min","swim_y_max","speed","size","rarity","thumbnail_path","sell_price","sprite_sheet_path","native_region_id","movement_type","flip_with_direction","travel_direction") values
('pongdang-whale','fish','퐁당 고래 동생','퐁당섬 앞바다를 지키는 고래 자매의 동생. 둥근 크림빛 몸과 살구빛 지느러미를 살랑이며 언니 뒤를 졸졸 따른다. 머리 위 작은 불가사리는 언니와 나눠 가진 자매의 표식이다.','0.18','0.78','0.035',108,'epic','fish/epic/pongdang-whale-starfish-v1_thumbnail.png',700,'fish/epic/pongdang-whale-starfish-v1_sprite.png','pongdang','swim',true,'both')
on conflict(id) do update set "kind"=excluded."kind","name"=excluded."name","description"=excluded."description","swim_y_min"=excluded."swim_y_min","swim_y_max"=excluded."swim_y_max","speed"=excluded."speed","size"=excluded."size","rarity"=excluded."rarity","thumbnail_path"=excluded."thumbnail_path","sell_price"=excluded."sell_price","sprite_sheet_path"=excluded."sprite_sheet_path","native_region_id"=excluded."native_region_id","movement_type"=excluded."movement_type","flip_with_direction"=excluded."flip_with_direction","travel_direction"=excluded."travel_direction";
update public.collectible_species s set name=p.name,description=p.description from (values
('pongdang-native-whale','퐁당 고래 언니','퐁당섬 앞바다를 지키는 고래 자매의 언니. 주황빛 등과 포근한 크림색 배를 가진 듬직한 고래로, 동생이 물살에 밀리지 않도록 먼저 길을 내준다. 머리 위 불가사리를 반짝이며 동생의 속도에 맞춰 느긋하게 헤엄친다.')) as p(id,name,description) where s.id=p.id;
delete from public.collectible_habitats where species_id in ('pongdang-whale');
insert into public.collectible_habitats(species_id,region_id) values
('pongdang-whale','pongdang');
notify pgrst, 'reload schema';
commit;
