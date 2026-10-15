-- Apply after 30; upload PNGs in assets/storage-upload/new/1052/ first.
-- Repeatable, preserves ownership and placements. Deferred native constraints
-- validate each species and its sole habitat together at commit.
begin;
create index if not exists collectible_species_native_region on public.collectible_species(native_region_id) where native_region_id is not null;
insert into public.collectible_species
 (id,kind,name,description,swim_y_min,swim_y_max,speed,size,rarity,sprite_sheet_path,thumbnail_path,sell_price,native_region_id)
values
 ('hazy-glass-marble','trash','흐릿한 유리구슬','안개달 해역의 은빛 모래에 오래 묻혀 뿌옇게 변한 구슬. 유리 속에는 지워지지 않는 초승달 무늬가 남아 있다.',.65,.90,.015,36,'common',null,'trash/normal/hazy-glass-marble_thumbnail.png',10,'mistmoon'),
 ('soaked-moonlight-postcard','trash','젖은 달빛 엽서','은빛 안개에 젖어 글씨가 모두 지워진 엽서. 희미한 초승달 그림만이 누군가의 밤을 기억한다.',.35,.75,.012,46,'common',null,'trash/normal/soaked-moonlight-postcard_thumbnail.png',12,'mistmoon'),
 ('silver-mist-goby','fish','은안개 망둑','반투명 은빛 몸에 안개빛 지느러미를 두른 작은 망둑. 안개달 해역의 물밑을 조용히 누비며 달빛을 좇는다.',.60,.88,.030,56,'rare','fish/rare/silver-mist-goby_sprite.png','fish/rare/silver-mist-goby_thumbnail.png',160,'mistmoon'),
 ('crescent-seahorse','fish','초승달 해마','연보랏빛 꼬리를 초승달처럼 감은 작은 해마. 안개가 내려앉은 밤이면 은빛 배를 반짝이며 느긋하게 헤엄친다.',.30,.70,.025,62,'rare','fish/rare/crescent-seahorse_sprite.png','fish/rare/crescent-seahorse_thumbnail.png',180,'mistmoon'),
 ('moon-sleep-waterlily','decoration','달잠 수련','은백색 꽃잎 사이에 푸른빛을 품은 작은 수련. 안개달 해역의 고요한 밤을 꽃 한 송이에 담았다.',null,null,0,62,'rare',null,'decorations/rare/moon-sleep-waterlily_thumbnail.png',160,'mistmoon'),
 ('mist-bell-windchime','decoration','안개종 풍경','작은 유리종 아래 달 모양 조각이 매달린 풍경. 안개달 해역의 잔물결을 따라 잊힌 자장가를 간직한다.',null,null,0,64,'rare',null,'decorations/rare/mist-bell-windchime_thumbnail.png',170,'mistmoon')
on conflict(id) do update set
 kind=excluded.kind,name=excluded.name,description=excluded.description,swim_y_min=excluded.swim_y_min,swim_y_max=excluded.swim_y_max,
 speed=excluded.speed,size=excluded.size,rarity=excluded.rarity,sprite_sheet_path=excluded.sprite_sheet_path,
 thumbnail_path=excluded.thumbnail_path,sell_price=excluded.sell_price,native_region_id=excluded.native_region_id;
delete from public.collectible_habitats
where species_id in ('hazy-glass-marble','soaked-moonlight-postcard','silver-mist-goby','crescent-seahorse','moon-sleep-waterlily','mist-bell-windchime') and region_id<>'mistmoon';
insert into public.collectible_habitats(species_id,region_id)
select id,'mistmoon' from public.collectible_species
where id in ('hazy-glass-marble','soaked-moonlight-postcard','silver-mist-goby','crescent-seahorse','moon-sleep-waterlily','mist-bell-windchime')
on conflict do nothing;
commit;
select id,name,kind,rarity,is_native,native_region_id from public.collectible_species where native_region_id='mistmoon' order by kind,id;
