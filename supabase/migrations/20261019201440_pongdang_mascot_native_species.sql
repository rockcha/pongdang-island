-- Generated from supabase/catalog/catalog.json. Review before migration deployment.
begin;
set constraints all deferred;
insert into public.collectible_species ("id","kind","name","description","swim_y_min","swim_y_max","speed","size","rarity","thumbnail_path","sell_price","sprite_sheet_path","native_region_id","movement_type","flip_with_direction","travel_direction") values
('giseong-fish','fish','기성 물고기','퐁당섬을 후원해 준 구기성님의 따뜻한 마음이 바닷물에 닿아 물고기로 변한 모습. 은테 안경 너머로 섬을 살피며, 복슬한 머리카락을 물결에 맡긴 채 새로운 친구를 반긴다.','0.20','0.75','0.040',70,'rare','fish/rare/giseong-fish_thumbnail.png',180,'fish/rare/giseong-fish_sprite.png','pongdang','swim',true,'both'),
('giseong-webfoot-octopus','fish','기성 쭈꾸미','퐁당섬을 후원해 준 구기성님이 이번에는 쭈꾸미로 변해 앞바다에 놀러 왔다. 은테 안경을 고쳐 쓰고 동그란 입으로 뽀글뽀글 인사를 건네며, 짧은 여덟 팔로 섬의 작은 일손을 돕는다.','0.20','0.75','0.040',68,'rare','fish/rare/giseong-webfoot-octopus_thumbnail.png',180,'fish/rare/giseong-webfoot-octopus_sprite.png','pongdang','swim',true,'both'),
('pongi-seahorse-rider','fish','해마 탄 퐁이','금빛 해마 등에 올라탄 퐁이. 작은 고삐를 꼭 쥐고 앞바다를 누비며 길을 잃은 친구에게 돌아갈 물길을 알려 준다. 해마는 퐁이의 웃음소리에 맞춰 꼬리를 둥글게 만다.','0.20','0.75','0.040',100,'epic','fish/epic/pongi-seahorse-rider_thumbnail.png',750,'fish/epic/pongi-seahorse-rider_sprite.png','pongdang','swim',true,'both'),
('pongi-jellyfish','fish','퐁이 해파리','머리에 분홍 불가사리를 붙이고 둥실 떠다니는 퐁이 해파리. 반투명한 갓 안에 다정한 표정이 비치고, 짧은 촉수 끝에는 앞바다의 햇빛이 은은하게 맺힌다.','0.20','0.75','0.040',70,'rare','fish/rare/pongi-jellyfish_thumbnail.png',170,'fish/rare/pongi-jellyfish_sprite.png','pongdang','swim',true,'both'),
('pongi-crab','fish','퐁이 게','퐁이를 닮은 동그란 얼굴과 작은 집게를 가진 앞바다의 게. 모래알 사이에서 반짝이는 조개를 찾으면 머리 위 불가사리를 흔들며 자랑스럽게 다가온다.','0.82','0.94','0.025',48,'common','fish/normal/pongi-crab_thumbnail.png',35,'fish/normal/pongi-crab_sprite.png','pongdang','crawl',true,'both'),
('pongi-hammerhead','fish','퐁이 귀상어','넓적한 머리 양끝으로 앞바다 구석구석을 살피는 퐁이 귀상어. 퐁이를 닮은 따뜻한 빛깔과 머리 위 불가사리가 눈에 띈다. 낚싯줄에 엉킨 작은 친구들을 풀어 주는 것이 취미다.','0.20','0.75','0.040',82,'rare','fish/rare/pongi-hammerhead_thumbnail.png',220,'fish/rare/pongi-hammerhead_sprite.png','pongdang','swim',true,'both'),
('pongi-exploration-robot','fish','퐁이 탐사로봇','앞바다의 비밀을 찾아 퐁이가 직접 조종하는 변신형 탐사로봇. 진주빛 장갑과 청록빛 추진기로 물살을 가르며, 기계 팔과 다리를 접어 좁은 유적도 거뜬히 탐사한다. 투명 조종석 안의 작은 미소는 어떤 깊이에서도 길을 잃지 않는다.','0.20','0.75','0.025',160,'mythic','fish/mythic/pongi-exploration-robot_thumbnail.png',2600,'fish/mythic/pongi-exploration-robot_sprite.png','pongdang','swim',true,'both'),
('otter-furball','trash','해달의 털뭉치','퐁이가 털을 다듬다 흘린 보송한 털뭉치. 바닷물에 젖어 동그랗게 뭉쳤지만 가까이 보면 포근한 크림색 털 몇 가닥이 섞여 있다.','0.20','0.85','0.025',32,'common','trash/normal/otter-furball_thumbnail.png',8,null,'pongdang','swim',false,'both'),
('pongdang-merch-set','trash','퐁당섬 굿즈세트','앞바다에 빠진 퐁당섬 기념품 묶음. 퐁이 열쇠고리와 작은 머그컵, 불가사리 핀이 물결에 함께 흔들린다. 상자는 눅눅해졌어도 섬을 좋아하던 마음은 고스란히 남았다.','0.20','0.85','0.025',56,'rare','trash/rare/pongdang-merch-set_thumbnail.png',90,null,'pongdang','swim',false,'both'),
('pongi-snack-wrapper','trash','퐁이가 먹던 과자봉다리','퐁이가 바다를 구경하며 먹던 과자 봉다리. 안에는 부스러기 몇 개와 짭짤한 바닷바람만 남았다. 과자는 다 먹었지만 귀여운 포장은 버리기 아깝다.','0.20','0.85','0.025',44,'rare','trash/rare/pongi-snack-wrapper_thumbnail.png',70,null,'pongdang','swim',false,'both'),
('sunken-pongdang-entrance','decoration','가라앉은 퐁당섬 입구','오래전 물길이 바뀌며 앞바다 아래로 가라앉은 퐁당섬의 작은 입구. 퐁이 얼굴이 새겨진 문 위로 산호가 피었고, 조개 등불은 돌아오는 친구를 기다리듯 은은하게 빛난다.',null,null,'0',122,'epic','decorations/epic/sunken-pongdang-entrance_thumbnail.png',650,null,'pongdang','fixed',false,'both'),
('tiny-pongi-figurine','decoration','작은 퐁이 조각','누군가 조개를 안고 있는 퐁이를 작은 돌에 새겼다. 서툰 조각 자국과 둥근 볼 덕분에 바라볼 때마다 저절로 미소가 지어진다.',null,null,'0',40,'common','decorations/normal/tiny-pongi-figurine_thumbnail.png',45,null,'pongdang','fixed',false,'both'),
('pongdang-island-sign','decoration','퐁당섬 표지판','앞바다의 작은 길목을 안내하던 퐁당섬 표지판. 나무판에 새긴 퐁이와 야자수 그림을 따라가면, 물속에서도 언제나 집으로 돌아가는 길을 찾을 수 있을 것 같다.',null,null,'0',66,'rare','decorations/rare/pongdang-island-sign_thumbnail.png',180,null,'pongdang','fixed',false,'both')
on conflict(id) do update set "kind"=excluded."kind","name"=excluded."name","description"=excluded."description","swim_y_min"=excluded."swim_y_min","swim_y_max"=excluded."swim_y_max","speed"=excluded."speed","size"=excluded."size","rarity"=excluded."rarity","thumbnail_path"=excluded."thumbnail_path","sell_price"=excluded."sell_price","sprite_sheet_path"=excluded."sprite_sheet_path","native_region_id"=excluded."native_region_id","movement_type"=excluded."movement_type","flip_with_direction"=excluded."flip_with_direction","travel_direction"=excluded."travel_direction";
delete from public.collectible_habitats where species_id in ('giseong-fish','giseong-webfoot-octopus','pongi-seahorse-rider','pongi-jellyfish','pongi-crab','pongi-hammerhead','pongi-exploration-robot','otter-furball','pongdang-merch-set','pongi-snack-wrapper','sunken-pongdang-entrance','tiny-pongi-figurine','pongdang-island-sign');
insert into public.collectible_habitats(species_id,region_id) values
('giseong-fish','pongdang'),
('giseong-webfoot-octopus','pongdang'),
('pongi-seahorse-rider','pongdang'),
('pongi-jellyfish','pongdang'),
('pongi-crab','pongdang'),
('pongi-hammerhead','pongdang'),
('pongi-exploration-robot','pongdang'),
('otter-furball','pongdang'),
('pongdang-merch-set','pongdang'),
('pongi-snack-wrapper','pongdang'),
('sunken-pongdang-entrance','pongdang'),
('tiny-pongi-figurine','pongdang'),
('pongdang-island-sign','pongdang');
notify pgrst, 'reload schema';
commit;
