-- Generated from supabase/catalog/catalog.json. Review before migration deployment.
begin;
set constraints all deferred;
insert into public.collectible_species ("id","kind","name","description","swim_y_min","swim_y_max","speed","size","rarity","thumbnail_path","sell_price","sprite_sheet_path","native_region_id","movement_type","flip_with_direction","travel_direction") values
('cloud-forest-path-white-wolf','fish','숲길의 흰 늑대','흰 털과 긴 꼬리를 물살에 흩날리며 조용히 나아가는 숲의 늑대.','0.18','0.8','0.028',70,'rare','fish/rare/cloud-forest-path-white-wolf_thumbnail.png',352,'fish/rare/cloud-forest-path-white-wolf-swim-v2_sprite.png','cloudferry','swim',true,'both'),
('starpattern-manta','fish','별무늬 만타','짙푸른 날개 위에 은빛 별자리가 이어진다. 금빛 가장자리와 작은 진주 같은 빛이 넓은 지느러미를 따라 흐른다.','0.18','0.8','0.045',101,'epic','fish/epic/starpattern-manta_thumbnail.png',800,'fish/epic/starpattern-manta-swim-v2_sprite.png',null,'swim',true,'both')
on conflict(id) do update set "kind"=excluded."kind","name"=excluded."name","description"=excluded."description","swim_y_min"=excluded."swim_y_min","swim_y_max"=excluded."swim_y_max","speed"=excluded."speed","size"=excluded."size","rarity"=excluded."rarity","thumbnail_path"=excluded."thumbnail_path","sell_price"=excluded."sell_price","sprite_sheet_path"=excluded."sprite_sheet_path","native_region_id"=excluded."native_region_id","movement_type"=excluded."movement_type","flip_with_direction"=excluded."flip_with_direction","travel_direction"=excluded."travel_direction";
delete from public.collectible_habitats where species_id in ('cloud-forest-path-white-wolf','starpattern-manta');
insert into public.collectible_habitats(species_id,region_id) values
('cloud-forest-path-white-wolf','cloudferry'),
('starpattern-manta','bluegrove'),
('starpattern-manta','cloudferry'),
('starpattern-manta','coral'),
('starpattern-manta','dreamabyss'),
('starpattern-manta','mistmoon'),
('starpattern-manta','mukhyang'),
('starpattern-manta','pongdang'),
('starpattern-manta','siren'),
('starpattern-manta','starruins'),
('starpattern-manta','whitenight');
notify pgrst, 'reload schema';
commit;
