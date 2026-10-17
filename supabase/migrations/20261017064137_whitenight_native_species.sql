-- Reviewed diff: 32 White-night native species only; retain existing species and player data.
begin;
set constraints all deferred;
insert into public.collectible_species ("id","kind","name","description","swim_y_min","swim_y_max","speed","size","rarity","thumbnail_path","sell_price","sprite_sheet_path","native_region_id","movement_type","flip_with_direction","travel_direction") values
('blue-ice-crystal','decoration','푸른 얼음 수정','투명한 푸른 결정이 바닥에서 낮게 솟아 있다.',null,null,'0',108,'common','decorations/normal/blue-ice-crystal_thumbnail.png',18,null,'whitenight','fixed',false,'both'),
('bluegrain-scallop','fish','푸른결 가리비','얼음 결정 같은 푸른 결이 부채 모양 껍데기에 새겨져 있다.','0.84','0.94','0.012',84,'common','fish/normal/bluegrain-scallop_thumbnail.png',24,'fish/normal/bluegrain-scallop_sprite.png','whitenight','fixed',false,'both'),
('frosted-route-sign','decoration','서리 낀 항로 표지판','오래된 나무 화살표 위에 서리가 얇게 내려앉았다.',null,null,'0',128,'rare','decorations/rare/frosted-route-sign_thumbnail.png',150,null,'whitenight','fixed',false,'both'),
('frosted-shell-pile','decoration','서리 낀 조개무더기','하얀 서리가 내려앉은 조개껍데기가 작게 쌓여 있다.',null,null,'0',90,'common','decorations/normal/frosted-shell-pile_thumbnail.png',15,null,'whitenight','fixed',false,'both'),
('frostleg-krill','fish','서리발 크릴','반투명한 몸 아래 서리빛 헤엄다리가 부지런히 움직인다.','0.18','0.8','0.028',65,'common','fish/normal/frostleg-krill_thumbnail.png',20,'fish/normal/frostleg-krill_sprite.png','whitenight','swim',true,'both'),
('frosttusk-walrus','fish','서리엄니 바다코끼리','긴 엄니와 풍성한 수염으로 빙해의 바닥을 살핀다.','0.18','0.8','0.028',142,'rare','fish/rare/frosttusk-walrus_thumbnail.png',230,'fish/rare/frosttusk-walrus_sprite.png','whitenight','swim',true,'both'),
('glacier-ancient-creature-fossil','decoration','빙하 속 고대 생물 화석','투명한 빙하 벽 안에 거대한 고대 생물의 골격이 드러나 있다.',null,null,'0',170,'epic','decorations/epic/glacier-ancient-creature-fossil_thumbnail.png',590,null,'whitenight','fixed',false,'both'),
('glacier-embedded-harpoon','decoration','빙하에 박힌 작살','푸른 얼음 덩어리 안에 낡은 작살과 밧줄이 잠들어 있다.',null,null,'0',132,'rare','decorations/rare/glacier-embedded-harpoon_thumbnail.png',175,null,'whitenight','fixed',false,'both'),
('icearmor-king-crab','fish','얼음갑옷 왕게','청백색 갑각과 굵은 집게로 몸을 감싼 왕게.','0.18','0.8','0.028',114,'rare','fish/rare/icearmor-king-crab_thumbnail.png',195,'fish/rare/icearmor-king-crab_sprite.png','whitenight','swim',true,'both'),
('icefloe-lumpsucker','fish','유빙 도치','둥근 몸과 작은 지느러미로 유빙 아래를 누비는 도치.','0.18','0.8','0.028',82,'common','fish/normal/icefloe-lumpsucker_thumbnail.png',26,'fish/normal/icefloe-lumpsucker_sprite.png','whitenight','swim',true,'both'),
('iceflower-anemone','fish','얼음꽃 말미잘','바닥에 붙어 청백색 촉수를 꽃처럼 펼치는 말미잘.','0.84','0.94','0.012',95,'common','fish/normal/iceflower-anemone_thumbnail.png',28,'fish/normal/iceflower-anemone_sprite.png','whitenight','fixed',false,'both'),
('iceribbon-giant-jellyfish','fish','얼음리본 대왕해파리','넓은 갓 아래 천 같은 긴 촉수가 얼음빛 리본처럼 너울거린다.','0.18','0.8','0.018',158,'epic','fish/epic/iceribbon-giant-jellyfish_thumbnail.png',600,'fish/epic/iceribbon-giant-jellyfish_sprite.png','whitenight','swim',true,'both'),
('icewall-greenland-shark','fish','빙벽 그린란드상어','오래된 흉터를 품고 깊은 빙벽 아래를 천천히 도는 상어.','0.18','0.8','0.018',168,'epic','fish/epic/icewall-greenland-shark_thumbnail.png',590,'fish/epic/icewall-greenland-shark_sprite.png','whitenight','swim',true,'both'),
('icewhisker-cod','fish','얼음수염 대구','통통한 배와 얼음빛 턱수염을 가진 대구.','0.18','0.8','0.028',108,'common','fish/normal/icewhisker-cod_thumbnail.png',28,'fish/normal/icewhisker-cod_sprite.png','whitenight','swim',true,'both'),
('longribbon-oarfish','fish','긴리본 산갈치','은백색 긴 몸과 붉은 등지느러미가 리본처럼 흐른다.','0.18','0.8','0.018',166,'rare','fish/rare/longribbon-oarfish_thumbnail.png',245,'fish/rare/longribbon-oarfish_sprite.png','whitenight','swim',true,'both'),
('mammor-frozen-memory','fish','얼어붙은 기억, 맘모르','빙하기의 기억을 품은 거대한 수생 환수. 여섯 초마다 엄니와 어깨의 고대 문양이 빛난다.','0.18','0.8','0.018',180,'mythic','fish/mythic/mammor-frozen-memory_thumbnail.png',2400,'fish/mythic/mammor-frozen-memory_sprite.png','whitenight','swim',true,'both'),
('mammoth-molar-fossil','decoration','매머드 어금니 화석','매머드 어금니의 층층 무늬가 또렷하게 남은 화석.',null,null,'0',115,'rare','decorations/rare/mammoth-molar-fossil_thumbnail.png',160,null,'whitenight','fixed',false,'both'),
('nivella-snowflake-dancer','fish','눈꽃의 무희, 니벨라','눈꽃 같은 날개를 펼쳐 빙해를 밝히는 바다의 무희. 여섯 초마다 날개를 넓게 펼친다.','0.18','0.8','0.018',172,'mythic','fish/mythic/nivella-snowflake-dancer_thumbnail.png',2250,'fish/mythic/nivella-snowflake-dancer_sprite.png','whitenight','swim',true,'both'),
('silverback-great-sealion','fish','은등 큰바다사자','은회색 목털과 커다란 앞지느러미를 가진 큰바다사자.','0.18','0.8','0.018',156,'epic','fish/epic/silverback-great-sealion_thumbnail.png',580,'fish/epic/silverback-great-sealion_sprite.png','whitenight','swim',true,'both'),
('silverbell-jellyfish','fish','은방울 해파리','은빛 테두리의 둥근 갓 아래로 가는 촉수가 늘어진다.','0.18','0.8','0.028',104,'rare','fish/rare/silverbell-jellyfish_thumbnail.png',190,'fish/rare/silverbell-jellyfish_sprite.png','whitenight','swim',true,'both'),
('silverfrost-herring','fish','은서리 청어','푸른 등 아래 은빛 비늘이 서리처럼 반짝이는 청어.','0.18','0.8','0.028',88,'common','fish/normal/silverfrost-herring_thumbnail.png',24,'fish/normal/silverfrost-herring_sprite.png','whitenight','swim',true,'both'),
('silverspear-narwhal','fish','은창 일각고래','나선 엄니를 은빛 창처럼 내밀며 유빙 사이를 헤엄친다.','0.18','0.8','0.028',142,'rare','fish/rare/silverspear-narwhal_thumbnail.png',220,'fish/rare/silverspear-narwhal_sprite.png','whitenight','swim',true,'both'),
('sleeping-expedition-submarine','decoration','잠든 탐험 잠수정','둥근 유리창과 황동 선체에 얼음이 붙은 오래된 탐험 잠수정.',null,null,'0',174,'epic','decorations/epic/sleeping-expedition-submarine_thumbnail.png',630,null,'whitenight','fixed',false,'both'),
('snow-covered-round-rock','decoration','눈 덮인 둥근 바위','둥근 회색 바위 위로 하얀 눈이 포근하게 쌓였다.',null,null,'0',102,'common','decorations/normal/snow-covered-round-rock_thumbnail.png',14,null,'whitenight','fixed',false,'both'),
('snowflake-sea-butterfly','fish','눈꽃 바다나비','투명한 날개를 팔랑이며 눈꽃처럼 떠다니는 바다나비.','0.18','0.8','0.028',72,'common','fish/normal/snowflake-sea-butterfly_thumbnail.png',25,'fish/normal/snowflake-sea-butterfly_sprite.png','whitenight','swim',true,'both'),
('snowmantle-beluga','fish','눈망토 흰돌고래','진주빛 피부와 둥근 이마를 가진 온순한 흰돌고래.','0.18','0.8','0.028',130,'rare','fish/rare/snowmantle-beluga_thumbnail.png',210,'fish/rare/snowmantle-beluga_sprite.png','whitenight','swim',true,'both'),
('snowpattern-orca','fish','눈무늬 범고래','짙은 남색 몸에 눈송이를 닮은 흰 무늬가 피어 있다.','0.18','0.8','0.018',166,'epic','fish/epic/snowpattern-orca_thumbnail.png',620,'fish/epic/snowpattern-orca_sprite.png','whitenight','swim',true,'both'),
('snowspot-capelin','fish','눈점 열빙어','작은 은빛 몸에 눈 같은 흰 점이 흩어진 열빙어.','0.18','0.8','0.028',76,'common','fish/normal/snowspot-capelin_thumbnail.png',22,'fish/normal/snowspot-capelin_sprite.png','whitenight','swim',true,'both'),
('whitenight-bowhead-whale','fish','백야 북극고래','거대한 머리와 활처럼 굽은 입으로 백야의 바다를 누빈다.','0.18','0.8','0.018',180,'epic','fish/epic/whitenight-bowhead-whale_thumbnail.png',650,'fish/epic/whitenight-bowhead-whale_sprite.png','whitenight','swim',true,'both'),
('whitenight-crystal-tree','decoration','백야의 수정 나무','얼음 가지 끝에 백야의 옅은 금빛이 머무는 수정 나무.',null,null,'0',166,'epic','decorations/epic/whitenight-crystal-tree_thumbnail.png',610,null,'whitenight','fixed',false,'both'),
('whitenight-polar-bear','fish','백야 북극곰','백야의 금빛을 머금은 긴 털과 거대한 앞발을 가진 북극곰.','0.18','0.8','0.018',164,'epic','fish/epic/whitenight-polar-bear_thumbnail.png',610,'fish/epic/whitenight-polar-bear_sprite.png','whitenight','swim',true,'both'),
('whitesnow-polar-bear','fish','흰눈 북극곰','하얀 털과 넓은 발로 차가운 물살을 가르는 북극곰.','0.18','0.8','0.028',140,'rare','fish/rare/whitesnow-polar-bear_thumbnail.png',235,'fish/rare/whitesnow-polar-bear_sprite.png','whitenight','swim',true,'both')
on conflict(id) do update set "kind"=excluded."kind","name"=excluded."name","description"=excluded."description","swim_y_min"=excluded."swim_y_min","swim_y_max"=excluded."swim_y_max","speed"=excluded."speed","size"=excluded."size","rarity"=excluded."rarity","thumbnail_path"=excluded."thumbnail_path","sell_price"=excluded."sell_price","sprite_sheet_path"=excluded."sprite_sheet_path","native_region_id"=excluded."native_region_id","movement_type"=excluded."movement_type","flip_with_direction"=excluded."flip_with_direction","travel_direction"=excluded."travel_direction";
delete from public.collectible_habitats where species_id in ('blue-ice-crystal','bluegrain-scallop','frosted-route-sign','frosted-shell-pile','frostleg-krill','frosttusk-walrus','glacier-ancient-creature-fossil','glacier-embedded-harpoon','icearmor-king-crab','icefloe-lumpsucker','iceflower-anemone','iceribbon-giant-jellyfish','icewall-greenland-shark','icewhisker-cod','longribbon-oarfish','mammor-frozen-memory','mammoth-molar-fossil','nivella-snowflake-dancer','silverback-great-sealion','silverbell-jellyfish','silverfrost-herring','silverspear-narwhal','sleeping-expedition-submarine','snow-covered-round-rock','snowflake-sea-butterfly','snowmantle-beluga','snowpattern-orca','snowspot-capelin','whitenight-bowhead-whale','whitenight-crystal-tree','whitenight-polar-bear','whitesnow-polar-bear');
insert into public.collectible_habitats(species_id,region_id) values
('blue-ice-crystal','whitenight'),
('bluegrain-scallop','whitenight'),
('frosted-route-sign','whitenight'),
('frosted-shell-pile','whitenight'),
('frostleg-krill','whitenight'),
('frosttusk-walrus','whitenight'),
('glacier-ancient-creature-fossil','whitenight'),
('glacier-embedded-harpoon','whitenight'),
('icearmor-king-crab','whitenight'),
('icefloe-lumpsucker','whitenight'),
('iceflower-anemone','whitenight'),
('iceribbon-giant-jellyfish','whitenight'),
('icewall-greenland-shark','whitenight'),
('icewhisker-cod','whitenight'),
('longribbon-oarfish','whitenight'),
('mammor-frozen-memory','whitenight'),
('mammoth-molar-fossil','whitenight'),
('nivella-snowflake-dancer','whitenight'),
('silverback-great-sealion','whitenight'),
('silverbell-jellyfish','whitenight'),
('silverfrost-herring','whitenight'),
('silverspear-narwhal','whitenight'),
('sleeping-expedition-submarine','whitenight'),
('snow-covered-round-rock','whitenight'),
('snowflake-sea-butterfly','whitenight'),
('snowmantle-beluga','whitenight'),
('snowpattern-orca','whitenight'),
('snowspot-capelin','whitenight'),
('whitenight-bowhead-whale','whitenight'),
('whitenight-crystal-tree','whitenight'),
('whitenight-polar-bear','whitenight'),
('whitesnow-polar-bear','whitenight');
do $$begin
 if exists(select 1 from information_schema.columns where table_schema='public' and table_name='collectible_species' and column_name='facing_direction') then execute 'update public.collectible_species set facing_direction=''right'' where id in (''blue-ice-crystal'',''bluegrain-scallop'',''frosted-route-sign'',''frosted-shell-pile'',''frostleg-krill'',''frosttusk-walrus'',''glacier-ancient-creature-fossil'',''glacier-embedded-harpoon'',''icearmor-king-crab'',''icefloe-lumpsucker'',''iceflower-anemone'',''iceribbon-giant-jellyfish'',''icewall-greenland-shark'',''icewhisker-cod'',''longribbon-oarfish'',''mammor-frozen-memory'',''mammoth-molar-fossil'',''nivella-snowflake-dancer'',''silverback-great-sealion'',''silverbell-jellyfish'',''silverfrost-herring'',''silverspear-narwhal'',''sleeping-expedition-submarine'',''snow-covered-round-rock'',''snowflake-sea-butterfly'',''snowmantle-beluga'',''snowpattern-orca'',''snowspot-capelin'',''whitenight-bowhead-whale'',''whitenight-crystal-tree'',''whitenight-polar-bear'',''whitesnow-polar-bear'')';end if;
 if exists(select 1 from information_schema.columns where table_schema='public' and table_name='collectible_species' and column_name='idle_animated') then execute 'update public.collectible_species set idle_animated=true where id in (''bluegrain-scallop'',''iceflower-anemone'')';end if;
end $$;
notify pgrst,'reload schema';
commit;
