-- Apply after 43. Upload 20261015-165350 assets first.
begin;
insert into public.collectible_species
(id,kind,name,description,swim_y_min,swim_y_max,speed,size,rarity,sprite_sheet_path,thumbnail_path,sell_price,native_region_id,movement_type,flip_with_direction,travel_direction,facing_direction)
values
('mistbread-sponge','fish','안개빵 해면','갓 찐 빵처럼 폭신한 연보라 해면. 안개달의 얕은 바닥에 붙어 작은 구멍으로 물을 천천히 들이마신다.',0.88,0.94,0.001,54,'common','fish/normal/mistbread-sponge_sprite.png','fish/normal/mistbread-sponge_thumbnail.png',35,'mistmoon','fixed',false,'both','right'),
('whisper-pipefish','fish','속삭임 실고기','실처럼 가는 은보라 몸과 조그만 귀 모양 지느러미를 가진 실고기. 수초 사이를 지나며 들리지 않는 바다의 이야기를 전한다.',0.32,0.75,0.027,62,'common','fish/normal/whisper-pipefish_sprite.png','fish/normal/whisper-pipefish_thumbnail.png',40,'mistmoon','swim',true,'both','right'),
('dream-thread-worm','fish','꿈실타래 갯지렁이','은빛 실타래처럼 부드럽게 굽은 작은 갯지렁이. 안개달의 모래 위를 기어가며 몸 가장자리의 가는 털을 물살에 맡긴다.',0.88,0.94,0.018,64,'common','fish/normal/dream-thread-worm_sprite.png','fish/normal/dream-thread-worm_thumbnail.png',30,'mistmoon','crawl',true,'both','right'),
('mist-whisker-catfish','fish','안개수염 메기','은빛 수염을 길게 늘어뜨린 회보라색 메기. 안개달의 고요한 물밑을 누비면 수염 끝이 꿈결처럼 뒤따라 흔들린다.',0.5,0.86,0.031,74,'rare','fish/rare/mist-whisker-catfish_sprite.png','fish/rare/mist-whisker-catfish_thumbnail.png',175,'mistmoon','swim',true,'both','right'),
('moonshadow-flounder','fish','달그림자 가자미','달그림자처럼 납작한 몸에 은빛 테두리를 두른 가자미. 안개달의 모래 가까이에서 가장자리 지느러미를 잔물결처럼 움직인다.',0.77,0.92,0.024,78,'rare','fish/rare/moonshadow-flounder_sprite.png','fish/rare/moonshadow-flounder_thumbnail.png',185,'mistmoon','swim',true,'both','right'),
('lunea-knight','fish','루네아의 기사','초승달 뿔과 진주빛 비늘 갑옷을 두른 해마 기사. 루네아의 작은 문장을 품고 안개달의 조용한 항로를 지킨다.',0.25,0.72,0.026,92,'epic','fish/epic/lunea-knight_sprite.png','fish/epic/lunea-knight_thumbnail.png',760,'mistmoon','swim',true,'both','right'),
('lunea-archivist','fish','루네아의 기록관','달의 무늬가 새겨진 나선 껍데기에 바다의 꿈을 간직한 노틸러스. 루네아를 위해 긴 촉수로 잊힌 물결의 기억을 더듬는다.',0.38,0.8,0.022,96,'epic','fish/epic/lunea-archivist_sprite.png','fish/epic/lunea-archivist_thumbnail.png',790,'mistmoon','swim',true,'both','right'),
('lunea-mistmoon-goddess','fish','안개달의 여신 루네아','은빛 머리카락과 달무리 베일을 물살에 펼치는 인어 여신. 안개달의 잠든 생물들을 보살피며 고요한 바다에 부드러운 빛을 남긴다.',0.2,0.72,0.019,144,'mythic','fish/mythic/lunea-mistmoon-goddess_sprite.png','fish/mythic/lunea-mistmoon-goddess_thumbnail.png',2600,'mistmoon','swim',true,'both','right')
on conflict(id) do update set name=excluded.name,description=excluded.description,
swim_y_min=excluded.swim_y_min,swim_y_max=excluded.swim_y_max,speed=excluded.speed,size=excluded.size,rarity=excluded.rarity,
sprite_sheet_path=excluded.sprite_sheet_path,thumbnail_path=excluded.thumbnail_path,sell_price=excluded.sell_price,
native_region_id=excluded.native_region_id,movement_type=excluded.movement_type,flip_with_direction=excluded.flip_with_direction,travel_direction=excluded.travel_direction,facing_direction=excluded.facing_direction;
delete from public.collectible_habitats where species_id in ('mistbread-sponge','whisper-pipefish','dream-thread-worm','mist-whisker-catfish','moonshadow-flounder','lunea-knight','lunea-archivist','lunea-mistmoon-goddess') and region_id<>'mistmoon';
insert into public.collectible_habitats(species_id,region_id)
select id,'mistmoon' from public.collectible_species where id in ('mistbread-sponge','whisper-pipefish','dream-thread-worm','mist-whisker-catfish','moonshadow-flounder','lunea-knight','lunea-archivist','lunea-mistmoon-goddess') on conflict do nothing;
commit;
