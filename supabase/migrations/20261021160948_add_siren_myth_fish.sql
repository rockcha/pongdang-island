-- Generated from supabase/catalog/catalog.json. Review before migration deployment.
begin;
set constraints all deferred;
insert into public.collectible_species ("id","kind","name","description","swim_y_min","swim_y_max","speed","size","rarity","thumbnail_path","sell_price","sprite_sheet_path","native_region_id","movement_type","flip_with_direction","travel_direction") values
('siren-ariadne-threadtail','fish','아리아드네 실꼬리','붉은 실 같은 꼬리로 돌아갈 길을 남기는 물고기. 미궁에서도 길을 찾지만 낚싯줄과 엉키면 잠깐 생각에 잠겨요.','0.16','0.78','0.04',76,'rare','fish/rare/siren-ariadne-threadtail_thumbnail.png',350,'fish/rare/siren-ariadne-threadtail_sprite.png','siren','swim',true,'both'),
('siren-coin-scale-carp','fish','동전비늘 붕어','낡은 청동 동전 같은 비늘이 반짝이는 붕어. 카론의 뱃삯으로 내밀었지만 승선은 거절당했어요.','0.16','0.78','0.04',60,'common','fish/normal/siren-coin-scale-carp_thumbnail.png',90,'fish/normal/siren-coin-scale-carp_sprite.png','siren','swim',true,'both'),
('siren-temple-column-seahorse','fish','신전기둥 해마','대리석 기둥처럼 홈이 파인 몸을 가진 해마. 가만히 서 있으면 유적 관람객이 사진을 찍어요.','0.16','0.78','0.04',62,'common','fish/normal/siren-temple-column-seahorse_thumbnail.png',80,'fish/normal/siren-temple-column-seahorse_sprite.png','siren','swim',true,'both')
on conflict(id) do update set "kind"=excluded."kind","name"=excluded."name","description"=excluded."description","swim_y_min"=excluded."swim_y_min","swim_y_max"=excluded."swim_y_max","speed"=excluded."speed","size"=excluded."size","rarity"=excluded."rarity","thumbnail_path"=excluded."thumbnail_path","sell_price"=excluded."sell_price","sprite_sheet_path"=excluded."sprite_sheet_path","native_region_id"=excluded."native_region_id","movement_type"=excluded."movement_type","flip_with_direction"=excluded."flip_with_direction","travel_direction"=excluded."travel_direction";
delete from public.collectible_habitats where species_id in ('siren-ariadne-threadtail','siren-coin-scale-carp','siren-temple-column-seahorse');
insert into public.collectible_habitats(species_id,region_id) values
('siren-ariadne-threadtail','siren'),
('siren-coin-scale-carp','siren'),
('siren-temple-column-seahorse','siren');
notify pgrst, 'reload schema';
commit;
