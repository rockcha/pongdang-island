-- Generated from supabase/catalog/catalog.json. Review before migration deployment.
begin;
set constraints all deferred;
insert into public.collectible_species ("id","kind","name","description","swim_y_min","swim_y_max","speed","size","rarity","thumbnail_path","sell_price","sprite_sheet_path","native_region_id","movement_type","flip_with_direction","travel_direction") values
('dreamabyss-ancient-sleeper','fish','잠든 고대 생명체','아득한 옛 바다에서부터 잠든 고대 생명체예요. 눈을 감은 채 심해를 배회하며 조용히 숨을 쉬어요.','0.22','0.76','0.010',150,'mythic','fish/mythic/dreamabyss-ancient-sleeper_thumbnail.png',2960,'fish/mythic/dreamabyss-ancient-sleeper_compat_sprite.png','dreamabyss','swim',true,'both'),
('dreamabyss-dream-clam','fish','꿈조개','보랏빛 껍데기를 여닫으며 꿈결처럼 부드럽게 헤엄쳐요.','0.46','0.80','0.007',42,'common','fish/normal/dreamabyss-dream-clam_thumbnail.png',55,'fish/normal/dreamabyss-dream-clam_sprite.png','dreamabyss','pulse',true,'both'),
('dreamabyss-hallucination-coral-crab','fish','환각산호게','보랏빛 산호가 자란 등껍질을 지고 심연의 바닥을 사뿐사뿐 걸어요.','0.86','0.96','0.007',48,'common','fish/normal/dreamabyss-hallucination-coral-crab_thumbnail.png',58,'fish/normal/dreamabyss-hallucination-coral-crab_sprite.png','dreamabyss','crawl',true,'both'),
('dreamabyss-lilac-sea-cucumber','fish','라일락 해삼','라일락빛 작은 돌기가 돋은 해삼이에요. 작은 관족으로 심연의 바닥을 느릿느릿 걸어요.','0.87','0.97','0.004',50,'common','fish/normal/dreamabyss-lilac-sea-cucumber_thumbnail.png',50,'fish/normal/dreamabyss-lilac-sea-cucumber_sprite.png','dreamabyss','crawl',true,'both'),
('dreamabyss-moon-dream-wings','fish','월몽의 날개','달빛을 머금은 거대한 가오리예요. 날갯짓할 때마다 꿈의 파편이 흩날려요.','0.20','0.72','0.016',120,'epic','fish/epic/dreamabyss-moon-dream-wings_thumbnail.png',960,'fish/epic/dreamabyss-moon-dream-wings_sprite.png','dreamabyss','swim',true,'both'),
('dreamabyss-reverie-seadragon','fish','몽환 해룡','은은한 보랏빛 갈기와 긴 꼬리를 흔들며 꿈먹는 심연을 유영해요.','0.22','0.78','0.013',116,'epic','fish/epic/dreamabyss-reverie-seadragon_thumbnail.png',1000,'fish/epic/dreamabyss-reverie-seadragon_sprite.png','dreamabyss','swim',true,'both'),
('dreamabyss-reverie-whelk','fish','몽환 고둥','라벤더빛 나선 껍데기에 고요한 꿈을 품고 천천히 기어가요.','0.88','0.97','0.004',44,'common','fish/normal/dreamabyss-reverie-whelk_thumbnail.png',52,'fish/normal/dreamabyss-reverie-whelk_sprite.png','dreamabyss','crawl',true,'both'),
('dreamabyss-slumber-curtain','fish','영면의 장막','수많은 촉수로 보랏빛 장막을 펼쳐 주변을 깊은 잠에 빠뜨리는 해파리예요.','0.12','0.65','0.007',106,'epic','fish/epic/dreamabyss-slumber-curtain_thumbnail.png',880,'fish/epic/dreamabyss-slumber-curtain_sprite.png','dreamabyss','pulse',true,'both'),
('dreamabyss-somnambulist','fish','심연의 몽유자','반쯤 감긴 눈으로 꿈과 현실 사이를 떠돌며 부드러운 꼬리를 흔들어요.','0.28','0.78','0.012',70,'rare','fish/rare/dreamabyss-somnambulist_thumbnail.png',225,'fish/rare/dreamabyss-somnambulist_sprite.png','dreamabyss','swim',true,'both'),
('dreamabyss-violet-ghost-shark','fish','보랏빛 유령상어','유령처럼 고요히 미끄러지는 상어예요. 보랏빛 몸 위로 별 같은 무늬가 반짝여요.','0.24','0.78','0.017',112,'epic','fish/epic/dreamabyss-violet-ghost-shark_thumbnail.png',930,'fish/epic/dreamabyss-violet-ghost-shark_sprite.png','dreamabyss','swim',true,'both')
on conflict(id) do update set "kind"=excluded."kind","name"=excluded."name","description"=excluded."description","swim_y_min"=excluded."swim_y_min","swim_y_max"=excluded."swim_y_max","speed"=excluded."speed","size"=excluded."size","rarity"=excluded."rarity","thumbnail_path"=excluded."thumbnail_path","sell_price"=excluded."sell_price","sprite_sheet_path"=excluded."sprite_sheet_path","native_region_id"=excluded."native_region_id","movement_type"=excluded."movement_type","flip_with_direction"=excluded."flip_with_direction","travel_direction"=excluded."travel_direction";
delete from public.collectible_habitats where species_id in ('dreamabyss-ancient-sleeper','dreamabyss-dream-clam','dreamabyss-hallucination-coral-crab','dreamabyss-lilac-sea-cucumber','dreamabyss-moon-dream-wings','dreamabyss-reverie-seadragon','dreamabyss-reverie-whelk','dreamabyss-slumber-curtain','dreamabyss-somnambulist','dreamabyss-violet-ghost-shark');
insert into public.collectible_habitats(species_id,region_id) values
('dreamabyss-ancient-sleeper','dreamabyss'),
('dreamabyss-dream-clam','dreamabyss'),
('dreamabyss-hallucination-coral-crab','dreamabyss'),
('dreamabyss-lilac-sea-cucumber','dreamabyss'),
('dreamabyss-moon-dream-wings','dreamabyss'),
('dreamabyss-reverie-seadragon','dreamabyss'),
('dreamabyss-reverie-whelk','dreamabyss'),
('dreamabyss-slumber-curtain','dreamabyss'),
('dreamabyss-somnambulist','dreamabyss'),
('dreamabyss-violet-ghost-shark','dreamabyss');
notify pgrst, 'reload schema';
commit;
