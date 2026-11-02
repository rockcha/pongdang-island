-- Generated from supabase/catalog/catalog.json. Review before migration deployment.
begin;
set constraints all deferred;
insert into public.collectible_species ("id","kind","name","description","swim_y_min","swim_y_max","speed","size","rarity","thumbnail_path","sell_price","sprite_sheet_path","native_region_id","movement_type","flip_with_direction","travel_direction") values
('hangang-haetae-guardian','fish','서울의 수호신 · 해태','옳고 그름을 살피는 해태가 서울의 밤과 물길을 든든하게 지켜요.','0.2','0.78','0.02',115,'epic','fish/epic/hangang-haetae-guardian_v1_thumbnail.png',1400,'fish/epic/hangang-haetae-guardian_v2_sprite.png','hangang','swim',true,'right'),
('hangang-iron-eater-bulgasari','fish','철을 먹고 자라난 재앙 · 불가사리','쇠를 먹을수록 단단해진다는 전설의 짐승이에요. 바다의 별 불가사리와는 다른 존재예요.','0.2','0.78','0.02',115,'epic','fish/epic/hangang-iron-eater-bulgasari_v1_thumbnail.png',1440,'fish/epic/hangang-iron-eater-bulgasari_v2_sprite.png','hangang','swim',true,'right'),
('hangang-mago-creator','fish','천지를 빚은 태초의 손 · 마고','산과 강을 빚었다는 마고가 두 손에 작은 산하를 품고 한강을 바라봐요.','0.28','0.75','0.007',170,'mythic','fish/mythic/hangang-mago-creator_v2_thumbnail.png',3800,'fish/mythic/hangang-mago-creator_compat_v2_sprite.png','hangang','pulse',true,'right'),
('hangang-millennial-gumiho','fish','천년구미호','천 년의 달빛을 아홉 꼬리에 모은 구미호가 여우구슬을 품고 나타나요.','0.2','0.78','0.02',115,'epic','fish/epic/hangang-millennial-gumiho_v1_thumbnail.png',1420,'fish/epic/hangang-millennial-gumiho_v2_sprite.png','hangang','swim',true,'right'),
('hangang-red-cheer-incarnation','fish','붉은 함성의 화신 · 붉은악마','붉은 응원의 불꽃과 북소리가 모여 탄생한 거대한 정령이에요. 북을 두드릴 때마다 함성의 물결이 퍼져요.','0.28','0.75','0.007',170,'mythic','fish/mythic/hangang-red-cheer-incarnation_v1_thumbnail.png',3800,'fish/mythic/hangang-red-cheer-incarnation_compat_v2_sprite.png','hangang','pulse',true,'right')
on conflict(id) do update set "kind"=excluded."kind","name"=excluded."name","description"=excluded."description","swim_y_min"=excluded."swim_y_min","swim_y_max"=excluded."swim_y_max","speed"=excluded."speed","size"=excluded."size","rarity"=excluded."rarity","thumbnail_path"=excluded."thumbnail_path","sell_price"=excluded."sell_price","sprite_sheet_path"=excluded."sprite_sheet_path","native_region_id"=excluded."native_region_id","movement_type"=excluded."movement_type","flip_with_direction"=excluded."flip_with_direction","travel_direction"=excluded."travel_direction";
delete from public.collectible_habitats where species_id in ('hangang-haetae-guardian','hangang-iron-eater-bulgasari','hangang-mago-creator','hangang-millennial-gumiho','hangang-red-cheer-incarnation');
insert into public.collectible_habitats(species_id,region_id) values
('hangang-haetae-guardian','hangang'),
('hangang-iron-eater-bulgasari','hangang'),
('hangang-mago-creator','hangang'),
('hangang-millennial-gumiho','hangang'),
('hangang-red-cheer-incarnation','hangang');
notify pgrst, 'reload schema';
commit;
