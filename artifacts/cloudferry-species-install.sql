-- Reviewed diff: add 25 Cloud Ferry native species only; preserve all existing species and player rows.
begin;
set constraints all deferred;
insert into public.collectible_species ("id","kind","name","description","swim_y_min","swim_y_max","speed","size","rarity","thumbnail_path","sell_price","sprite_sheet_path","native_region_id","movement_type","flip_with_direction","travel_direction") values
('cloud-bath-token-frog','fish','목욕표 나르는 개구리','나무 목욕표를 품에 안고 바닥을 바삐 오가는 목욕탕의 개구리.','0.84','0.94','0.012',84,'common','fish/normal/cloud-bath-token-frog_thumbnail.png',24,'fish/normal/cloud-bath-token-frog_sprite.png','cloudferry','crawl',true,'both'),
('cloud-bucket-little-ponyo','fish','양동이 꼬마 포뇨','초록 양동이 밖으로 얼굴과 작은 지느러미를 내민 꼬마 포뇨.','0.18','0.8','0.028',105,'rare','fish/rare/cloud-bucket-little-ponyo_thumbnail.png',210,'fish/rare/cloud-bucket-little-ponyo_sprite.png','cloudferry','swim',true,'both'),
('cloud-cloud-boat-no-face','fish','구름배 가오나시','작은 나무배에 조용히 앉아 구름나루의 풍경을 바라보는 가오나시.','0.18','0.8','0.018',142,'epic','fish/epic/cloud-cloud-boat-no-face_thumbnail.png',610,'fish/epic/cloud-cloud-boat-no-face_sprite.png','cloudferry','swim',true,'both'),
('cloud-cloud-cotton-jellyfish','fish','구름솜 해파리','구름처럼 몽글한 갓 아래로 짧은 촉수가 살랑이는 작은 해파리.','0.18','0.8','0.028',90,'common','fish/normal/cloud-cloud-cotton-jellyfish_thumbnail.png',24,'fish/normal/cloud-cloud-cotton-jellyfish_sprite.png','cloudferry','pulse',true,'both'),
('cloud-cloud-umbrella-totoro','fish','구름우산 토토로','구름처럼 몽글한 우산을 들고 빗소리에 귀를 기울이는 토토로.','0.84','0.94','0.012',160,'epic','fish/epic/cloud-cloud-umbrella-totoro_thumbnail.png',610,'fish/epic/cloud-cloud-umbrella-totoro_sprite.png','cloudferry','fixed',false,'both'),
('cloud-flame-spirit-calcifer','fish','불꽃 정령 캘시퍼','작은 화덕 안에서 표정을 바꾸며 따뜻한 금빛 불꽃을 흔드는 정령.','0.84','0.94','0.012',112,'rare','fish/rare/cloud-flame-spirit-calcifer_thumbnail.png',210,'fish/rare/cloud-flame-spirit-calcifer_sprite.png','cloudferry','fixed',false,'both'),
('cloud-fluttering-paper-shikigami','fish','팔랑이는 종이 식신','하얀 종이로 접힌 식신들이 팔과 모서리를 팔랑이며 함께 물길을 가른다.','0.18','0.8','0.028',100,'rare','fish/rare/cloud-fluttering-paper-shikigami_thumbnail.png',210,'fish/rare/cloud-fluttering-paper-shikigami_sprite.png','cloudferry','swim',true,'both'),
('cloud-forest-path-white-wolf','fish','숲길의 흰 늑대','흰 털과 긴 꼬리를 물살에 흩날리며 조용히 나아가는 숲의 늑대.','0.18','0.8','0.028',130,'rare','fish/rare/cloud-forest-path-white-wolf_thumbnail.png',210,'fish/rare/cloud-forest-path-white-wolf_sprite.png','cloudferry','swim',true,'both'),
('cloud-head-tilt-kodama','fish','고개 갸웃 코다마','이끼 낀 돌에 앉아 고개를 갸웃하는 작은 숲의 정령.','0.84','0.94','0.012',76,'common','fish/normal/cloud-head-tilt-kodama_thumbnail.png',24,'fish/normal/cloud-head-tilt-kodama_sprite.png','cloudferry','fixed',false,'both'),
('cloud-howl-magic-potion-box','decoration','하울의 마법 약병 상자','오래된 나무 상자 속 색색의 약병. 작은 마개마다 마법사의 생활 흔적이 남아 있다.',null,null,'0',115,'rare','decorations/rare/cloud-howl-magic-potion-box_thumbnail.png',210,null,'cloudferry','fixed',false,'both'),
('cloud-howl-moving-castle','fish','하울의 움직이는 성','네 기계 다리로 바닥을 천천히 걷는 하울의 성. 여섯 초마다 창문을 따라 캘시퍼의 따뜻한 불빛이 번진다.','0.84','0.94','0.012',180,'mythic','fish/mythic/cloud-howl-moving-castle_thumbnail.png',2400,'fish/mythic/cloud-howl-moving-castle_sprite.png','cloudferry','crawl',true,'both'),
('cloud-lantern-no-face','fish','등불 든 가오나시','따뜻한 등불을 들고 제자리에 선 가오나시. 검은 옷자락과 등불 술이 물결친다.','0.84','0.94','0.012',142,'epic','fish/epic/cloud-lantern-no-face_thumbnail.png',610,'fish/epic/cloud-lantern-no-face_sprite.png','cloudferry','fixed',false,'both'),
('cloud-little-log-calcifer','fish','장작 위 꼬마 캘시퍼','까맣게 그을린 장작 위에서 불꽃 끝을 꼼지락거리는 작은 캘시퍼.','0.84','0.94','0.012',85,'common','fish/normal/cloud-little-log-calcifer_thumbnail.png',24,'fish/normal/cloud-little-log-calcifer_sprite.png','cloudferry','fixed',false,'both'),
('cloud-lotus-umbrella-river-spirit','fish','연꽃 우산의 오물신','커다란 연잎 우산 아래 쉬어 가는 둥근 오물신. 이끼와 갈대 끝에 맑은 빛방울이 맺힌다.','0.84','0.94','0.012',158,'epic','fish/epic/cloud-lotus-umbrella-river-spirit_thumbnail.png',610,'fish/epic/cloud-lotus-umbrella-river-spirit_sprite.png','cloudferry','fixed',false,'both'),
('cloud-masked-forest-san','fish','가면을 쓴 숲의 아이, 산','늑대 가면과 털 망토를 걸치고 제자리에 서서 숲의 물길을 지키는 산.','0.84','0.94','0.012',120,'rare','fish/rare/cloud-masked-forest-san_thumbnail.png',210,'fish/rare/cloud-masked-forest-san_sprite.png','cloudferry','fixed',false,'both'),
('cloud-ponyo-green-bucket','decoration','포뇨의 초록 양동이','작은 물고기의 모험이 시작됐던 초록 양동이. 둥근 손잡이에 물방울의 흔적이 남았다.',null,null,'0',95,'common','decorations/normal/cloud-ponyo-green-bucket_thumbnail.png',24,null,'cloudferry','fixed',false,'both'),
('cloud-ripple-running-catbus','fish','물결달리는 고양이버스','여러 발을 차례로 움직이며 바닥을 달리는 고양이버스. 창문에는 포근한 불빛이 머문다.','0.84','0.94','0.012',165,'epic','fish/epic/cloud-ripple-running-catbus_thumbnail.png',610,'fish/epic/cloud-ripple-running-catbus_sprite.png','cloudferry','crawl',true,'both'),
('cloud-shell-home-soot','fish','조개집 검댕이','조개껍데기 안에 숨어 작은 팔과 반짝이는 눈을 내미는 검댕이.','0.84','0.94','0.012',85,'common','fish/normal/cloud-shell-home-soot_thumbnail.png',24,'fish/normal/cloud-shell-home-soot_sprite.png','cloudferry','fixed',false,'both'),
('cloud-star-candy-soot','fish','별사탕 검댕이','별사탕 하나를 높이 들고 바닥을 부지런히 오가는 작은 검댕이.','0.84','0.94','0.012',65,'common','fish/normal/cloud-star-candy-soot_thumbnail.png',24,'fish/normal/cloud-star-candy-soot_sprite.png','cloudferry','crawl',true,'both'),
('cloud-sunset-delivery-kiki','fish','노을배달부 키키','붉은 리본과 옷자락을 물살에 맡긴 배달부. 빗자루 뒤에는 지지가 함께 탄다.','0.18','0.8','0.028',125,'rare','fish/rare/cloud-sunset-delivery-kiki_thumbnail.png',210,'fish/rare/cloud-sunset-delivery-kiki_sprite.png','cloudferry','swim',true,'both'),
('cloud-teacup-soot','fish','찻잔 검댕이','이 빠진 찻잔을 집 삼아 가장자리로 얼굴을 빼꼼 내미는 검댕이.','0.84','0.94','0.012',82,'common','fish/normal/cloud-teacup-soot_thumbnail.png',24,'fish/normal/cloud-teacup-soot_sprite.png','cloudferry','fixed',false,'both'),
('cloud-totoro-lost-umbrella','trash','토토로의 우산','누군가 나루에 두고 간 낡은 우산. 물살에 닳은 천과 굽은 나무 손잡이가 남았다.','0.84','0.94','0.012',95,'common','trash/normal/cloud-totoro-lost-umbrella_thumbnail.png',5,null,'cloudferry','fixed',false,'both'),
('cloud-waterdrop-ponyo','fish','물방울 포뇨','주황 머리카락과 붉은 꼬리를 흔들며 물길을 누비는 작은 포뇨.','0.18','0.8','0.028',90,'rare','fish/rare/cloud-waterdrop-ponyo_thumbnail.png',210,'fish/rare/cloud-waterdrop-ponyo_sprite.png','cloudferry','swim',true,'both'),
('cloud-wave-calling-ponyo','fish','파도를 부르는 포뇨','물고기 모양 파도를 타고 달리는 포뇨. 붉은 옷과 주황 머리카락이 파도 위에서 팔랑인다.','0.18','0.8','0.018',150,'epic','fish/epic/cloud-wave-calling-ponyo_thumbnail.png',610,'fish/epic/cloud-wave-calling-ponyo_sprite.png','cloudferry','swim',true,'both'),
('cloud-white-dragon-haku','fish','백룡의 이름, 하쿠','긴 흰 몸과 청록 갈기, 수염을 물살에 흘려보내며 유려하게 나아가는 백룡 하쿠.','0.18','0.8','0.018',175,'epic','fish/epic/cloud-white-dragon-haku_thumbnail.png',610,'fish/epic/cloud-white-dragon-haku_sprite.png','cloudferry','swim',true,'both')
on conflict(id) do update set "kind"=excluded."kind","name"=excluded."name","description"=excluded."description","swim_y_min"=excluded."swim_y_min","swim_y_max"=excluded."swim_y_max","speed"=excluded."speed","size"=excluded."size","rarity"=excluded."rarity","thumbnail_path"=excluded."thumbnail_path","sell_price"=excluded."sell_price","sprite_sheet_path"=excluded."sprite_sheet_path","native_region_id"=excluded."native_region_id","movement_type"=excluded."movement_type","flip_with_direction"=excluded."flip_with_direction","travel_direction"=excluded."travel_direction";
delete from public.collectible_habitats where species_id in ('cloud-bath-token-frog','cloud-bucket-little-ponyo','cloud-cloud-boat-no-face','cloud-cloud-cotton-jellyfish','cloud-cloud-umbrella-totoro','cloud-flame-spirit-calcifer','cloud-fluttering-paper-shikigami','cloud-forest-path-white-wolf','cloud-head-tilt-kodama','cloud-howl-magic-potion-box','cloud-howl-moving-castle','cloud-lantern-no-face','cloud-little-log-calcifer','cloud-lotus-umbrella-river-spirit','cloud-masked-forest-san','cloud-ponyo-green-bucket','cloud-ripple-running-catbus','cloud-shell-home-soot','cloud-star-candy-soot','cloud-sunset-delivery-kiki','cloud-teacup-soot','cloud-totoro-lost-umbrella','cloud-waterdrop-ponyo','cloud-wave-calling-ponyo','cloud-white-dragon-haku');
insert into public.collectible_habitats(species_id,region_id) values
('cloud-bath-token-frog','cloudferry'),
('cloud-bucket-little-ponyo','cloudferry'),
('cloud-cloud-boat-no-face','cloudferry'),
('cloud-cloud-cotton-jellyfish','cloudferry'),
('cloud-cloud-umbrella-totoro','cloudferry'),
('cloud-flame-spirit-calcifer','cloudferry'),
('cloud-fluttering-paper-shikigami','cloudferry'),
('cloud-forest-path-white-wolf','cloudferry'),
('cloud-head-tilt-kodama','cloudferry'),
('cloud-howl-magic-potion-box','cloudferry'),
('cloud-howl-moving-castle','cloudferry'),
('cloud-lantern-no-face','cloudferry'),
('cloud-little-log-calcifer','cloudferry'),
('cloud-lotus-umbrella-river-spirit','cloudferry'),
('cloud-masked-forest-san','cloudferry'),
('cloud-ponyo-green-bucket','cloudferry'),
('cloud-ripple-running-catbus','cloudferry'),
('cloud-shell-home-soot','cloudferry'),
('cloud-star-candy-soot','cloudferry'),
('cloud-sunset-delivery-kiki','cloudferry'),
('cloud-teacup-soot','cloudferry'),
('cloud-totoro-lost-umbrella','cloudferry'),
('cloud-waterdrop-ponyo','cloudferry'),
('cloud-wave-calling-ponyo','cloudferry'),
('cloud-white-dragon-haku','cloudferry');
do $$begin
 if exists(select 1 from information_schema.columns where table_schema='public' and table_name='collectible_species' and column_name='facing_direction') then execute 'update public.collectible_species set facing_direction=''right'' where id in (''cloud-bath-token-frog'',''cloud-bucket-little-ponyo'',''cloud-cloud-boat-no-face'',''cloud-cloud-cotton-jellyfish'',''cloud-cloud-umbrella-totoro'',''cloud-flame-spirit-calcifer'',''cloud-fluttering-paper-shikigami'',''cloud-forest-path-white-wolf'',''cloud-head-tilt-kodama'',''cloud-howl-magic-potion-box'',''cloud-howl-moving-castle'',''cloud-lantern-no-face'',''cloud-little-log-calcifer'',''cloud-lotus-umbrella-river-spirit'',''cloud-masked-forest-san'',''cloud-ponyo-green-bucket'',''cloud-ripple-running-catbus'',''cloud-shell-home-soot'',''cloud-star-candy-soot'',''cloud-sunset-delivery-kiki'',''cloud-teacup-soot'',''cloud-totoro-lost-umbrella'',''cloud-waterdrop-ponyo'',''cloud-wave-calling-ponyo'',''cloud-white-dragon-haku'')';end if;
 if exists(select 1 from information_schema.columns where table_schema='public' and table_name='collectible_species' and column_name='idle_animated') then execute 'update public.collectible_species set idle_animated=true where id in (''cloud-shell-home-soot'',''cloud-teacup-soot'',''cloud-head-tilt-kodama'',''cloud-little-log-calcifer'',''cloud-flame-spirit-calcifer'',''cloud-masked-forest-san'',''cloud-lantern-no-face'',''cloud-cloud-umbrella-totoro'',''cloud-lotus-umbrella-river-spirit'')';end if;
end $$;
notify pgrst,'reload schema';
commit;
