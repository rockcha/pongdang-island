-- Generated from supabase/catalog/catalog.json. Review before migration deployment.
begin;
set constraints all deferred;
insert into public.collectible_species ("id","kind","name","description","swim_y_min","swim_y_max","speed","size","rarity","thumbnail_path","sell_price","sprite_sheet_path","native_region_id","movement_type","flip_with_direction","travel_direction") values
('pongi-subsea-drilling-platform','decoration','퐁이 해저 시추 플랫폼','깊은 바다에서도 퐁이들의 작업등은 꺼지지 않는다. 안전모를 쓴 여섯 퐁이가 크레인과 시추기를 움직이며 해저의 비밀을 조금씩 끌어올린다.',null,null,'0',200,'mythic','decorations/mythic/pongi-subsea-drilling-platform_v1_thumbnail.png',3500,'decorations/mythic/pongi-subsea-drilling-platform_compat_v1_sprite.png',null,'fixed',false,'both')
on conflict(id) do update set "kind"=excluded."kind","name"=excluded."name","description"=excluded."description","swim_y_min"=excluded."swim_y_min","swim_y_max"=excluded."swim_y_max","speed"=excluded."speed","size"=excluded."size","rarity"=excluded."rarity","thumbnail_path"=excluded."thumbnail_path","sell_price"=excluded."sell_price","sprite_sheet_path"=excluded."sprite_sheet_path","native_region_id"=excluded."native_region_id","movement_type"=excluded."movement_type","flip_with_direction"=excluded."flip_with_direction","travel_direction"=excluded."travel_direction";
delete from public.collectible_habitats where species_id in ('pongi-subsea-drilling-platform');
insert into public.collectible_habitats(species_id,region_id) values
('pongi-subsea-drilling-platform','bluegrove'),
('pongi-subsea-drilling-platform','cloudferry'),
('pongi-subsea-drilling-platform','coral'),
('pongi-subsea-drilling-platform','dreamabyss'),
('pongi-subsea-drilling-platform','mistmoon'),
('pongi-subsea-drilling-platform','mukhyang'),
('pongi-subsea-drilling-platform','nyamnyam'),
('pongi-subsea-drilling-platform','pongdang'),
('pongi-subsea-drilling-platform','primal'),
('pongi-subsea-drilling-platform','scrapisle'),
('pongi-subsea-drilling-platform','siren'),
('pongi-subsea-drilling-platform','starruins'),
('pongi-subsea-drilling-platform','whitenight');
notify pgrst, 'reload schema';
commit;
