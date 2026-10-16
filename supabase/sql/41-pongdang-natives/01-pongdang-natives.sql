-- Apply after 40. Upload the six right-facing PNGs before registering species.
begin;
update public.collectible_species set size=144 where id='sea-crocodile';
-- Replace habitat rows within one transaction; deferred constraints validate at commit.
delete from public.collectible_habitats where species_id='pongi-statue' and region_id<>'pongdang';
insert into public.collectible_habitats(species_id,region_id) select id,'pongdang' from public.collectible_species where id='pongi-statue' on conflict do nothing;
update public.collectible_species set native_region_id='pongdang' where id='pongi-statue';
insert into public.collectible_species
(id,kind,name,description,swim_y_min,swim_y_max,speed,size,rarity,sprite_sheet_path,thumbnail_path,sell_price,native_region_id,movement_type,flip_with_direction,travel_direction,facing_direction)
values
('pongdang-shark','fish','퐁당 상어','햇살을 머금은 청록빛 지느러미와 잔물결 무늬를 가진 상어. 퐁당섬 앞바다의 따뜻한 물살을 따라 느긋하게 헤엄친다.',.2,.75,.038,156,'epic','fish/epic/pongdang-shark_sprite.png','fish/epic/pongdang-shark_thumbnail.png',720,'pongdang','swim',true,'both','right'),
('pongdang-whale','fish','퐁당 고래','진주빛 배와 물결처럼 흐르는 지느러미를 가진 고래. 퐁당섬의 얕은 바다에서 조용히 꼬리를 흔들며 첫 항해를 지켜 준다.',.18,.72,.028,172,'epic','fish/epic/pongdang-whale_sprite.png','fish/epic/pongdang-whale_thumbnail.png',780,'pongdang','swim',true,'both','right'),
('pongi-explorer','fish','퐁이 탐사선','퐁이가 조종하는 진주빛 해저 탐사선. 투명한 관측창과 조개빛 추진기를 반짝이며 퐁당섬 앞바다의 작은 비밀들을 찾아다닌다.',.22,.78,.032,176,'mythic','fish/mythic/pongi-explorer_sprite.png','fish/mythic/pongi-explorer_thumbnail.png',2200,'pongdang','swim',true,'both','right')
on conflict(id) do update set
name=excluded.name,description=excluded.description,swim_y_min=excluded.swim_y_min,swim_y_max=excluded.swim_y_max,speed=excluded.speed,size=excluded.size,rarity=excluded.rarity,sprite_sheet_path=excluded.sprite_sheet_path,thumbnail_path=excluded.thumbnail_path,sell_price=excluded.sell_price,native_region_id=excluded.native_region_id,movement_type=excluded.movement_type,flip_with_direction=excluded.flip_with_direction,travel_direction=excluded.travel_direction,facing_direction=excluded.facing_direction;
delete from public.collectible_habitats where species_id in ('pongdang-shark','pongdang-whale','pongi-explorer') and region_id<>'pongdang';
insert into public.collectible_habitats(species_id,region_id)
select id,'pongdang' from public.collectible_species where id in ('pongdang-shark','pongdang-whale','pongi-explorer') on conflict do nothing;
commit;
