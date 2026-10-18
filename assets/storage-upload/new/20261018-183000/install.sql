-- Focused deployment: only the 25 new dreamabyss species; remote decoration sprites already supported.
begin;
set constraints all deferred;
insert into public.collectible_species (id,kind,name,description,swim_y_min,swim_y_max,speed,size,rarity,thumbnail_path,sell_price,sprite_sheet_path,native_region_id,movement_type,flip_with_direction,travel_direction) values
('violet-telescopefish','fish','자줏빛 망원경고기','위를 향한 망원경 같은 눈으로 미약한 빛을 찾는 자줏빛 심해어.','0.2','0.8','0.025',100,'rare','fish/rare/violet-telescopefish_thumbnail.png',230,'fish/rare/violet-telescopefish_sprite.png','dreamabyss','swim',true,'both'),
('inky-purple-grenadier','fish','먹보라 심해대구','둥근 머리와 가늘게 이어지는 꼬리를 가진 먹보라색 심해대구.','0.2','0.8','0.025',100,'rare','fish/rare/inky-purple-grenadier_thumbnail.png',230,'fish/rare/inky-purple-grenadier_sprite.png','dreamabyss','swim',true,'both'),
('inky-purple-gulper-eel','fish','먹보라 풍선장어','커다란 주머니 입과 보랏빛 꼬리 등불을 지닌 풍선장어.','0.2','0.8','0.025',100,'rare','fish/rare/inky-purple-gulper-eel_thumbnail.png',230,'fish/rare/inky-purple-gulper-eel_sprite.png','dreamabyss','swim',true,'both'),
('amethyst-fangtooth','fish','자수정 송곳니고기','자수정처럼 맑은 송곳니와 짙은 보라색 비늘을 가진 심해어.','0.2','0.8','0.025',100,'rare','fish/rare/amethyst-fangtooth_thumbnail.png',230,'fish/rare/amethyst-fangtooth_sprite.png','dreamabyss','swim',true,'both'),
('starthread-dragonfish','fish','별실 용고기','턱 아래 별빛 수염을 늘어뜨리고 은빛 발광점을 따라 유영하는 용고기.','0.2','0.8','0.025',100,'rare','fish/rare/starthread-dragonfish_thumbnail.png',230,'fish/rare/starthread-dragonfish_sprite.png','dreamabyss','swim',true,'both'),
('lilac-frilled-shark','fish','라일락 주름상어','라일락빛 아가미 주름과 긴 몸을 부드럽게 움직이는 심해상어.','0.2','0.8','0.025',150,'epic','fish/epic/lilac-frilled-shark_thumbnail.png',650,'fish/epic/lilac-frilled-shark_sprite.png','dreamabyss','swim',true,'both'),
('violet-longlure-angler','fish','보랏불 긴수염아귀','긴 낚싯줄 끝에서 보랏불이 흔들리는 심해 아귀.','0.2','0.8','0.025',150,'epic','fish/epic/violet-longlure-angler_thumbnail.png',650,'fish/epic/violet-longlure-angler_sprite.png','dreamabyss','swim',true,'both'),
('amethyst-goblin-shark','fish','자수정 마귀상어','긴 주둥이와 자수정빛 지느러미로 심연을 가르는 마귀상어.','0.2','0.8','0.025',150,'epic','fish/epic/amethyst-goblin-shark_thumbnail.png',650,'fish/epic/amethyst-goblin-shark_sprite.png','dreamabyss','swim',true,'both'),
('twilight-frilled-shark','fish','황혼 주름상어','먹보라색 등에서 자주빛 배로 황혼이 번지는 긴 주름상어.','0.2','0.8','0.025',150,'epic','fish/epic/twilight-frilled-shark_thumbnail.png',650,'fish/epic/twilight-frilled-shark_sprite.png','dreamabyss','swim',true,'both'),
('violiss-amethyst-trench','fish','자수정 해구의 주인, 바이올리스','자수정 능선을 등에 품은 심연의 거대한 마귀상어. 은빛 발광선과 유려한 지느러미가 깊은 해구를 밝힌다.','0.2','0.8','0.016',180,'mythic','fish/mythic/violiss-amethyst-trench_thumbnail.png',2400,'fish/mythic/violiss-amethyst-trench_sprite.png','dreamabyss','swim',true,'both'),
('purple-stained-bottle','trash','보랏물 든 유리병','오래 가라앉아 보랏물이 든 유리병. 안쪽에 검은 모래가 조금 남았다.','0.84','0.94','0.012',80,'common','trash/normal/purple-stained-bottle_thumbnail.png',5,null,'dreamabyss','fixed',false,'both'),
('broken-survey-cable','trash','끊어진 탐사 케이블','보라색 피복이 벗겨지고 연결 단자가 끊어진 탐사 케이블.','0.84','0.94','0.012',80,'common','trash/normal/broken-survey-cable_thumbnail.png',5,null,'dreamabyss','fixed',false,'both'),
('dented-diving-lamp','trash','찌그러진 잠수등','보호 철망이 찌그러진 잠수등. 흐린 유리 안쪽의 불빛은 꺼졌다.','0.84','0.94','0.012',80,'rare','trash/rare/dented-diving-lamp_thumbnail.png',18,null,'dreamabyss','fixed',false,'both'),
('discarded-oxygen-tank','trash','버려진 산소통','빛바랜 산소통에 보라색 침전물이 내려앉았다.','0.84','0.94','0.012',80,'common','trash/normal/discarded-oxygen-tank_thumbnail.png',5,null,'dreamabyss','fixed',false,'both'),
('cracked-pressure-gauge','trash','금 간 수압계','유리에 금이 가고 바늘이 끝까지 돌아간 낡은 수압계.','0.84','0.94','0.012',80,'rare','trash/rare/cracked-pressure-gauge_thumbnail.png',18,null,'dreamabyss','fixed',false,'both'),
('torn-survey-flag','trash','찢어진 탐사 깃발','부러진 깃대에 남보라색 천 조각이 남은 탐사 깃발.','0.84','0.94','0.012',80,'common','trash/normal/torn-survey-flag_thumbnail.png',5,null,'dreamabyss','fixed',false,'both'),
('violet-abyss-pebbles','decoration','보랏빛 심해 자갈','라벤더빛이 은은하게 감도는 둥근 심해 자갈 세 개.',null,null,'0',80,'common','decorations/normal/violet-abyss-pebbles_thumbnail.png',20,null,'dreamabyss','fixed',false,'both'),
('lavender-tube-coral','decoration','라벤더 관산호','옅은 보라색 입구를 가진 관산호가 작은 바위에 모여 자랐다.',null,null,'0',80,'common','decorations/normal/lavender-tube-coral_thumbnail.png',20,null,'dreamabyss','fixed',false,'both'),
('silver-speck-sponge','decoration','은점 바다해면','자줏빛 표면에 작은 은색 점이 박힌 둥근 바다해면.',null,null,'0',80,'common','decorations/normal/silver-speck-sponge_thumbnail.png',20,null,'dreamabyss','fixed',false,'both'),
('pearl-sand-mound','decoration','진주모래 둔덕','회보라색 모래 사이로 작은 진주가 드러난 낮은 둔덕.',null,null,'0',80,'common','decorations/normal/pearl-sand-mound_thumbnail.png',20,null,'dreamabyss','fixed',false,'both'),
('amethyst-cluster','decoration','자수정 군락','검은 암석 틈에서 맑은 보랏빛 결정들이 비스듬히 자란 군락.',null,null,'0',80,'rare','decorations/rare/amethyst-cluster_thumbnail.png',140,null,'dreamabyss','fixed',false,'both'),
('violet-hydrothermal-vent','decoration','보랏빛 열수구','낮은 암석 굴뚝에서 보라색 물안개가 천천히 피어나는 열수구.',null,null,'0',80,'rare','decorations/rare/violet-hydrothermal-vent_thumbnail.png',140,'decorations/rare/violet-hydrothermal-vent_sprite.png','dreamabyss','fixed',false,'both'),
('moonlit-pearl-clam','decoration','달빛 진주조개','검보라색 조개 안의 은빛 진주가 달빛처럼 은은하게 빛난다.',null,null,'0',80,'rare','decorations/rare/moonlit-pearl-clam_thumbnail.png',140,'decorations/rare/moonlit-pearl-clam_sprite.png','dreamabyss','fixed',false,'both'),
('sleeping-survey-pod','decoration','잠든 심해 관측구','둥근 보라색 관측창을 가진 잠수정이 심해 산호에 둘러싸여 잠들었다.',null,null,'0',130,'epic','decorations/epic/sleeping-survey-pod_thumbnail.png',460,null,'dreamabyss','fixed',false,'both'),
('primordial-amethyst-heart','decoration','태초의 자수정 심장','갈라진 현무암에 감싸인 거대한 자수정. 중심의 은보랏빛이 느리게 맥박친다.',null,null,'0',150,'mythic','decorations/mythic/primordial-amethyst-heart_thumbnail.png',1800,'decorations/mythic/primordial-amethyst-heart_sprite.png','dreamabyss','fixed',false,'both')
on conflict(id) do update set kind=excluded.kind,name=excluded.name,description=excluded.description,swim_y_min=excluded.swim_y_min,swim_y_max=excluded.swim_y_max,speed=excluded.speed,size=excluded.size,rarity=excluded.rarity,thumbnail_path=excluded.thumbnail_path,sell_price=excluded.sell_price,sprite_sheet_path=excluded.sprite_sheet_path,native_region_id=excluded.native_region_id,movement_type=excluded.movement_type,flip_with_direction=excluded.flip_with_direction,travel_direction=excluded.travel_direction;
insert into public.collectible_habitats(species_id,region_id) values
('violet-telescopefish','dreamabyss'),
('inky-purple-grenadier','dreamabyss'),
('inky-purple-gulper-eel','dreamabyss'),
('amethyst-fangtooth','dreamabyss'),
('starthread-dragonfish','dreamabyss'),
('lilac-frilled-shark','dreamabyss'),
('violet-longlure-angler','dreamabyss'),
('amethyst-goblin-shark','dreamabyss'),
('twilight-frilled-shark','dreamabyss'),
('violiss-amethyst-trench','dreamabyss'),
('purple-stained-bottle','dreamabyss'),
('broken-survey-cable','dreamabyss'),
('dented-diving-lamp','dreamabyss'),
('discarded-oxygen-tank','dreamabyss'),
('cracked-pressure-gauge','dreamabyss'),
('torn-survey-flag','dreamabyss'),
('violet-abyss-pebbles','dreamabyss'),
('lavender-tube-coral','dreamabyss'),
('silver-speck-sponge','dreamabyss'),
('pearl-sand-mound','dreamabyss'),
('amethyst-cluster','dreamabyss'),
('violet-hydrothermal-vent','dreamabyss'),
('moonlit-pearl-clam','dreamabyss'),
('sleeping-survey-pod','dreamabyss'),
('primordial-amethyst-heart','dreamabyss')
on conflict(species_id,region_id) do nothing;
notify pgrst,'reload schema';
commit;
