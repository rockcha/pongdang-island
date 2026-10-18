-- REFERENCE PATCH: compare the entire patch against the target DB before any execution.
-- Prerequisite: existing map shop. Safe to rerun; preserves players, wallets and other species.
-- 2026-10-18 MCP check: scrapisle region and 26 native species exist.
-- Full patch fields, maps, rod, odds and execution history remain unverified.
-- See docs/db/REMOTE_REVIEW.md for scope and project identification limitations.
-- Reviewed diff: Scrap Isle region, map, rod,26 exclusive collectibles and region-scoped object-heavy fishing.
begin;
set constraints all deferred;
insert into public.regions ("id","name","description","rarity","sort_order","image_path","requires_map_fragment") values
('scrapisle','녹빛 고물섬','녹슨 배와 떠밀려온 물건들이 작은 섬을 이뤘어요. 고철 사이로 자란 해초와 잊힌 보물을 찾아보세요.','common',10,'scrapisle.png',true)
on conflict(id) do update set "name"=excluded."name","description"=excluded."description","rarity"=excluded."rarity","sort_order"=excluded."sort_order","image_path"=excluded."image_path","requires_map_fragment"=excluded."requires_map_fragment";
insert into public.region_maps ("region_id","price","thumbnail_path") values
('scrapisle',1800,'map/routes/map-scrapisle_thumbnail.png')
on conflict(region_id) do update set "price"=excluded."price","thumbnail_path"=excluded."thumbnail_path";
insert into public.fishing_rods ("id","name","price","region_id","failure_reduction_bp","native_bonus_bp") values
('scrapisle','녹빛 고철 낚싯대',1500,'scrapisle',200,200)
on conflict(id) do update set "name"=excluded."name","price"=excluded."price","region_id"=excluded."region_id","failure_reduction_bp"=excluded."failure_reduction_bp","native_bonus_bp"=excluded."native_bonus_bp";
insert into public.collectible_species ("id","kind","name","description","swim_y_min","swim_y_max","speed","size","rarity","thumbnail_path","sell_price","sprite_sheet_path","native_region_id","movement_type","flip_with_direction","travel_direction") values
('scrap-abandoned-survey-robot','fish','버려진 탐사 로봇','구리 껍질과 두 무한궤도로 바닥을 누비는 탐사 로봇. 카메라와 작은 집게가 물길을 살핀다.','0.84','0.94','0.012',150,'epic','fish/epic/scrap-abandoned-survey-robot_thumbnail.png',590,'fish/epic/scrap-abandoned-survey-robot_sprite.png','scrapisle','crawl',true,'both'),
('scrap-barnacle-telephone','decoration','따개비 전화기','수화기와 본체 사이에 따개비가 모여 사는 초록 전화기.',null,null,'0',108,'rare','decorations/rare/scrap-barnacle-telephone_thumbnail.png',165,null,'scrapisle','fixed',false,'both'),
('scrap-bottlecap-shield-crab','fish','병뚜껑 방패게','서로 다른 병뚜껑을 방패처럼 든 작은 게. 집게와 다리를 바삐 움직인다.','0.84','0.94','0.012',92,'rare','fish/rare/scrap-bottlecap-shield-crab_thumbnail.png',165,'fish/rare/scrap-bottlecap-shield-crab_sprite.png','scrapisle','crawl',true,'both'),
('scrap-broken-diving-helmet','decoration','고장 난 잠수 헬멧','둥근 유리창에 금이 간 잠수 헬멧. 구리 이음새를 따라 녹청이 피었다.',null,null,'0',120,'rare','decorations/rare/scrap-broken-diving-helmet_thumbnail.png',165,null,'scrapisle','fixed',false,'both'),
('scrap-bulb-home-octopus','fish','전구집 문어','둥글게 닳은 전구 안에서 촉수와 얼굴을 빼꼼 내미는 작은 문어.','0.84','0.94','0.012',105,'rare','fish/rare/scrap-bulb-home-octopus_thumbnail.png',165,'fish/rare/scrap-bulb-home-octopus_sprite.png','scrapisle','fixed',false,'both'),
('scrap-coral-wreck-car','decoration','산호 품은 폐자동차','빛바랜 차체와 깨진 창문 사이로 산호가 자란 폐자동차.',null,null,'0',170,'epic','decorations/epic/scrap-coral-wreck-car_thumbnail.png',590,null,'scrapisle','fixed',false,'both'),
('scrap-dented-sardine-can','trash','찌그러진 꽁치 통조림','찌그러진 통조림 뚜껑에 해초가 걸렸다. 희미한 꽁치 그림만 남은 빈 깡통.','0.18','0.8','0.012',78,'common','trash/normal/scrap-dented-sardine-can_thumbnail.png',8,null,'scrapisle','swim',false,'both'),
('scrap-discarded-cassette','trash','버려진 카세트테이프','풀린 테이프가 리본처럼 흔들리는 카세트. 어떤 노래가 담겼는지는 알 수 없다.','0.18','0.8','0.012',85,'common','trash/normal/scrap-discarded-cassette_thumbnail.png',8,null,'scrapisle','swim',false,'both'),
('scrap-forgotten-clockwork-robot','decoration','잊힌 태엽 로봇','작은 태엽 열쇠를 등에 단 로봇. 바닷속 바닥에서 오래된 주인을 기다린다.',null,null,'0',118,'rare','decorations/rare/scrap-forgotten-clockwork-robot_thumbnail.png',165,null,'scrapisle','fixed',false,'both'),
('scrap-greenark-last-collector','fish','마지막 수거선, 그린아크','버려진 물건들을 싣고 떠도는 거대한 수거선. 여섯 초마다 크레인으로 빛나는 고물을 건져 올린다.','0.18','0.8','0.012',180,'mythic','fish/mythic/scrap-greenark-last-collector_thumbnail.png',2300,'fish/mythic/scrap-greenark-last-collector_sprite.png','scrapisle','swim',true,'both'),
('scrap-leaky-cooking-pot','decoration','구멍 난 냄비','바닥에 구멍 난 낡은 냄비. 구멍 사이로 작은 해초가 자랐다.',null,null,'0',100,'common','decorations/normal/scrap-leaky-cooking-pot_thumbnail.png',18,null,'scrapisle','fixed',false,'both'),
('scrap-locked-suitcase','decoration','잠긴 여행 가방','황동 자물쇠가 굳게 잠긴 여행 가방. 오래된 여행의 흔적을 간직한다.',null,null,'0',115,'rare','decorations/rare/scrap-locked-suitcase_thumbnail.png',165,null,'scrapisle','fixed',false,'both'),
('scrap-lost-rain-boot','trash','짝 잃은 장화','주인을 잃은 노란 장화. 물살을 따라 천천히 빙그르르 떠다닌다.','0.18','0.8','0.012',90,'common','trash/normal/scrap-lost-rain-boot_thumbnail.png',8,null,'scrapisle','swim',false,'both'),
('scrap-rusted-lighthouse-lens','decoration','녹슨 등대 렌즈','겹겹의 초록 유리에 물빛이 맺히는 등대 렌즈. 녹슨 받침대 위에서 쉬고 있다.',null,null,'0',150,'epic','decorations/epic/scrap-rusted-lighthouse-lens_thumbnail.png',590,null,'scrapisle','fixed',false,'both'),
('scrap-scrap-armored-sturgeon','fish','고철갑옷 철갑상어','녹슨 판금을 닮은 구릿빛 비늘갑옷을 두른 철갑상어. 긴 주둥이 아래 수염이 흐른다.','0.18','0.8','0.018',170,'epic','fish/epic/scrap-scrap-armored-sturgeon_thumbnail.png',590,'fish/epic/scrap-scrap-armored-sturgeon_sprite.png','scrapisle','swim',true,'both'),
('scrap-seaweed-shopping-cart','decoration','해초 감긴 쇼핑카트','바퀴와 철망을 해초가 감싼 쇼핑카트. 이제는 작은 생물들의 쉼터다.',null,null,'0',140,'rare','decorations/rare/scrap-seaweed-shopping-cart_thumbnail.png',165,null,'scrapisle','fixed',false,'both'),
('scrap-sleeping-vending-machine','decoration','잠든 심해 자판기','깊은 바다에 잠든 자판기. 흐린 유리 너머 오래된 캔과 작은 불빛이 남았다.',null,null,'0',155,'epic','decorations/epic/scrap-sleeping-vending-machine_thumbnail.png',590,null,'scrapisle','fixed',false,'both'),
('scrap-soaked-duck-toy','trash','젖은 오리인형','기운 솜이 물을 머금은 노란 오리인형. 닳은 단추 눈으로 물길을 바라본다.','0.18','0.8','0.012',85,'common','trash/normal/scrap-soaked-duck-toy_thumbnail.png',8,null,'scrapisle','swim',false,'both'),
('scrap-soggy-newspaper','trash','바닷물 먹은 신문지','오래된 소식이 바닷물에 번진 신문지. 젖은 가장자리가 흐느적거린다.','0.18','0.8','0.012',95,'common','trash/normal/scrap-soggy-newspaper_thumbnail.png',8,null,'scrapisle','swim',false,'both'),
('scrap-stopped-alarm-clock','decoration','멈춘 알람시계','언젠가의 아침에서 멈춘 탁상시계. 두 종 위에 따개비가 자리 잡았다.',null,null,'0',95,'common','decorations/normal/scrap-stopped-alarm-clock_thumbnail.png',18,null,'scrapisle','fixed',false,'both'),
('scrap-sunken-scrap-carrier','decoration','침몰한 고물 운반선','폐타이어와 고철을 가득 실은 채 바닥에 잠든 작은 운반선.',null,null,'0',170,'epic','decorations/epic/scrap-sunken-scrap-carrier_thumbnail.png',590,null,'scrapisle','fixed',false,'both'),
('scrap-tin-home-hermit-crab','fish','깡통집 소라게','빈 통조림을 집 삼아 바닥을 부지런히 오가는 소라게.','0.84','0.94','0.012',90,'rare','fish/rare/scrap-tin-home-hermit-crab_thumbnail.png',165,'fish/rare/scrap-tin-home-hermit-crab_sprite.png','scrapisle','crawl',true,'both'),
('scrap-tire-moray','fish','타이어 곰치','폐타이어 구멍을 집 삼아 얼굴을 내미는 곰치. 짧은 목이 물살에 살랑인다.','0.84','0.94','0.012',125,'rare','fish/rare/scrap-tire-moray_thumbnail.png',165,'fish/rare/scrap-tire-moray_sprite.png','scrapisle','fixed',false,'both'),
('scrap-verdigris-fan','decoration','녹청빛 선풍기','녹청이 내려앉은 선풍기. 둥근 철망 안에서 오래된 날개가 잠들어 있다.',null,null,'0',135,'rare','decorations/rare/scrap-verdigris-fan_thumbnail.png',165,null,'scrapisle','fixed',false,'both'),
('scrap-waterlogged-music-box','decoration','물먹은 오르골','뚜껑이 열린 오르골. 조개 무희와 황동 원판이 지난 노래를 간직한다.',null,null,'0',112,'rare','decorations/rare/scrap-waterlogged-music-box_thumbnail.png',165,null,'scrapisle','fixed',false,'both'),
('scrap-wheel-less-bicycle','decoration','바퀴 잃은 자전거','바퀴 하나를 잃고 바닷속에 기대 선 자전거. 바구니가 작은 해초밭이 됐다.',null,null,'0',145,'rare','decorations/rare/scrap-wheel-less-bicycle_thumbnail.png',165,null,'scrapisle','fixed',false,'both')
on conflict(id) do update set "kind"=excluded."kind","name"=excluded."name","description"=excluded."description","swim_y_min"=excluded."swim_y_min","swim_y_max"=excluded."swim_y_max","speed"=excluded."speed","size"=excluded."size","rarity"=excluded."rarity","thumbnail_path"=excluded."thumbnail_path","sell_price"=excluded."sell_price","sprite_sheet_path"=excluded."sprite_sheet_path","native_region_id"=excluded."native_region_id","movement_type"=excluded."movement_type","flip_with_direction"=excluded."flip_with_direction","travel_direction"=excluded."travel_direction";
delete from public.collectible_habitats where species_id in ('scrap-abandoned-survey-robot','scrap-barnacle-telephone','scrap-bottlecap-shield-crab','scrap-broken-diving-helmet','scrap-bulb-home-octopus','scrap-coral-wreck-car','scrap-dented-sardine-can','scrap-discarded-cassette','scrap-forgotten-clockwork-robot','scrap-greenark-last-collector','scrap-leaky-cooking-pot','scrap-locked-suitcase','scrap-lost-rain-boot','scrap-rusted-lighthouse-lens','scrap-scrap-armored-sturgeon','scrap-seaweed-shopping-cart','scrap-sleeping-vending-machine','scrap-soaked-duck-toy','scrap-soggy-newspaper','scrap-stopped-alarm-clock','scrap-sunken-scrap-carrier','scrap-tin-home-hermit-crab','scrap-tire-moray','scrap-verdigris-fan','scrap-waterlogged-music-box','scrap-wheel-less-bicycle');
insert into public.collectible_habitats(species_id,region_id) values
('scrap-abandoned-survey-robot','scrapisle'),
('scrap-barnacle-telephone','scrapisle'),
('scrap-bottlecap-shield-crab','scrapisle'),
('scrap-broken-diving-helmet','scrapisle'),
('scrap-bulb-home-octopus','scrapisle'),
('scrap-coral-wreck-car','scrapisle'),
('scrap-dented-sardine-can','scrapisle'),
('scrap-discarded-cassette','scrapisle'),
('scrap-forgotten-clockwork-robot','scrapisle'),
('scrap-greenark-last-collector','scrapisle'),
('scrap-leaky-cooking-pot','scrapisle'),
('scrap-locked-suitcase','scrapisle'),
('scrap-lost-rain-boot','scrapisle'),
('scrap-rusted-lighthouse-lens','scrapisle'),
('scrap-scrap-armored-sturgeon','scrapisle'),
('scrap-seaweed-shopping-cart','scrapisle'),
('scrap-sleeping-vending-machine','scrapisle'),
('scrap-soaked-duck-toy','scrapisle'),
('scrap-soggy-newspaper','scrapisle'),
('scrap-stopped-alarm-clock','scrapisle'),
('scrap-sunken-scrap-carrier','scrapisle'),
('scrap-tin-home-hermit-crab','scrapisle'),
('scrap-tire-moray','scrapisle'),
('scrap-verdigris-fan','scrapisle'),
('scrap-waterlogged-music-box','scrapisle'),
('scrap-wheel-less-bicycle','scrapisle');
do $$begin
 if exists(select 1 from information_schema.columns where table_schema='public' and table_name='collectible_species' and column_name='facing_direction') then execute 'update public.collectible_species set facing_direction=''right'' where id in (''scrap-abandoned-survey-robot'',''scrap-barnacle-telephone'',''scrap-bottlecap-shield-crab'',''scrap-broken-diving-helmet'',''scrap-bulb-home-octopus'',''scrap-coral-wreck-car'',''scrap-dented-sardine-can'',''scrap-discarded-cassette'',''scrap-forgotten-clockwork-robot'',''scrap-greenark-last-collector'',''scrap-leaky-cooking-pot'',''scrap-locked-suitcase'',''scrap-lost-rain-boot'',''scrap-rusted-lighthouse-lens'',''scrap-scrap-armored-sturgeon'',''scrap-seaweed-shopping-cart'',''scrap-sleeping-vending-machine'',''scrap-soaked-duck-toy'',''scrap-soggy-newspaper'',''scrap-stopped-alarm-clock'',''scrap-sunken-scrap-carrier'',''scrap-tin-home-hermit-crab'',''scrap-tire-moray'',''scrap-verdigris-fan'',''scrap-waterlogged-music-box'',''scrap-wheel-less-bicycle'')';end if;
 if exists(select 1 from information_schema.columns where table_schema='public' and table_name='collectible_species' and column_name='idle_animated') then execute 'update public.collectible_species set idle_animated=true where id in (''scrap-bulb-home-octopus'',''scrap-tire-moray'')';end if;
end $$;
create or replace function app_private.pick_regional_collectible(p_region_id text,p_rarity public.game_rarity,p_decoration boolean,p_map_roll integer)
returns table(species_id text,map_region_id text) language plpgsql set search_path='' as $$
declare v_objects boolean;
begin
 if p_map_roll is null or p_map_roll<0 or p_map_roll>=10000 then raise exception 'INVALID_ROLL';end if;
 if p_region_id='scrapisle' and not p_decoration then
  -- Objects on80% of ordinary rolls; fall back within the same tier if pool absent.
  v_objects:=random()<0.8;
  return query select s.id,null::text from public.collectible_species s join public.collectible_habitats h on h.species_id=s.id
  where h.region_id=p_region_id and s.rarity=p_rarity and s.kind in('fish','trash','decoration')
  order by case when (s.kind in('trash','decoration'))=v_objects then 0 else 1 end,random() limit 1;
 else
  return query select s.id,null::text from public.collectible_species s join public.collectible_habitats h on h.species_id=s.id
  where h.region_id=p_region_id and ((p_decoration and s.kind='decoration') or (not p_decoration and s.kind in('fish','trash') and s.rarity=p_rarity))
  order by random() limit 1;
 end if;
end $$;
notify pgrst,'reload schema';
commit;

-- Expected result:26 exclusive collectibles.
select kind,count(*) from public.collectible_species where native_region_id='scrapisle' group by kind order by kind;
