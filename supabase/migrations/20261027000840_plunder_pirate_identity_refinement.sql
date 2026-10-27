-- Generated from supabase/catalog/catalog.json. Review before migration deployment.
begin;
set constraints all deferred;
insert into public.collectible_species ("id","kind","name","description","swim_y_min","swim_y_max","speed","size","rarity","thumbnail_path","sell_price","sprite_sheet_path","native_region_id","movement_type","flip_with_direction","travel_direction") values
('plunder-anchor-whisker-sealion','fish','닻수염 해적바다사자','커다란 삼각모와 금화 메달을 두르고 닻 모양 수염을 휘날리는 바다사자 선장이에요.','0.22','0.78','0.021',108,'epic','fish/epic/plunder-anchor-whisker-sealion_v2_thumbnail.png',775,'fish/epic/plunder-anchor-whisker-sealion_v2_sprite.png','plunder','swim',true,'both'),
('plunder-barca','fish','저주받은 황금함대','수백 척의 황금 난파선이 하나로 엉킨 저주받은 함대 괴물. 찢어진 검은 돛 아래 포문이 깨어나요.','0.24','0.72','0.014',125,'mythic','fish/mythic/plunder-barca_v2_thumbnail.png',2800,'fish/mythic/plunder-barca_swim8_v2_sprite.png','plunder','swim',true,'both'),
('plunder-bloodsail','fish','탐욕의 황금손','심해의 보물을 끌어모으는 거대한 황금 손. 움켜쥔 금화와 보석은 저주받은 손아귀에서 벗어나지 못해요.','0.24','0.76','0.016',135,'mythic','fish/mythic/plunder-bloodsail_v2_thumbnail.png',2750,'fish/mythic/plunder-bloodsail_swim8_v2_sprite.png','plunder','swim',true,'both'),
('plunder-deck-cleaner-shrimp','fish','갑판청소 새우','붉은 두건을 두르고 갑판 솔과 작은 물통을 챙긴 청소 담당 새우예요.','0.85','0.95','0.012',44,'common','fish/normal/plunder-deck-cleaner-shrimp_v2_thumbnail.png',50,'fish/normal/plunder-deck-cleaner-shrimp_v2_sprite.png','plunder','crawl',true,'both'),
('plunder-lookout-goby','fish','망보기 망둑어','선원 모자를 쓰고 황동 망원경으로 수평선을 지키는 망보기예요.','0.55','0.83','0.028',44,'common','fish/normal/plunder-lookout-goby_v2_thumbnail.png',52,'fish/normal/plunder-lookout-goby_v2_sprite.png','plunder','swim',true,'both'),
('plunder-one-eyed-carp','fish','외눈붕어','검은 안대와 낡은 삼각모를 쓴 애꾸 선장 붕어예요. 붉은 허리띠가 물살에 흔들려요.','0.24','0.78','0.028',48,'common','fish/normal/plunder-one-eyed-carp_v2_thumbnail.png',57,'fish/normal/plunder-one-eyed-carp_v2_sprite.png','plunder','swim',true,'both'),
('plunder-pirate-captain-horseshoe','fish','해적선장 투구게','해골 문장 삼각모와 황동 갑옷을 두르고 짧은 커틀러스를 든 투구게 선장이에요.','0.85','0.95','0.012',70,'rare','fish/rare/plunder-pirate-captain-horseshoe_v2_thumbnail.png',250,'fish/rare/plunder-pirate-captain-horseshoe_v2_sprite.png','plunder','crawl',true,'both'),
('plunder-sailor-sock-moray','fish','선원양말 곰치','해진 양말 줄무늬에 삐딱한 해적모자와 붉은 스카프를 두른 곰치예요.','0.25','0.8','0.028',73,'rare','fish/rare/plunder-sailor-sock-moray_v2_thumbnail.png',220,'fish/rare/plunder-sailor-sock-moray_v2_sprite.png','plunder','swim',true,'both'),
('plunder-smuggler-pouch-puffer','fish','밀수꾼 주머니복','검은 두건과 가죽 주머니에 금화와 보석을 숨기고 열쇠를 물고 다녀요.','0.32','0.78','0.028',47,'common','fish/normal/plunder-smuggler-pouch-puffer_v2_thumbnail.png',53,'fish/normal/plunder-smuggler-pouch-puffer_v2_sprite.png','plunder','swim',true,'both')
on conflict(id) do update set "kind"=excluded."kind","name"=excluded."name","description"=excluded."description","swim_y_min"=excluded."swim_y_min","swim_y_max"=excluded."swim_y_max","speed"=excluded."speed","size"=excluded."size","rarity"=excluded."rarity","thumbnail_path"=excluded."thumbnail_path","sell_price"=excluded."sell_price","sprite_sheet_path"=excluded."sprite_sheet_path","native_region_id"=excluded."native_region_id","movement_type"=excluded."movement_type","flip_with_direction"=excluded."flip_with_direction","travel_direction"=excluded."travel_direction";
delete from public.collectible_habitats where species_id in ('plunder-anchor-whisker-sealion','plunder-barca','plunder-bloodsail','plunder-deck-cleaner-shrimp','plunder-lookout-goby','plunder-one-eyed-carp','plunder-pirate-captain-horseshoe','plunder-sailor-sock-moray','plunder-smuggler-pouch-puffer');
insert into public.collectible_habitats(species_id,region_id) values
('plunder-anchor-whisker-sealion','plunder'),
('plunder-barca','plunder'),
('plunder-bloodsail','plunder'),
('plunder-deck-cleaner-shrimp','plunder'),
('plunder-lookout-goby','plunder'),
('plunder-one-eyed-carp','plunder'),
('plunder-pirate-captain-horseshoe','plunder'),
('plunder-sailor-sock-moray','plunder'),
('plunder-smuggler-pouch-puffer','plunder');
notify pgrst, 'reload schema';
commit;
