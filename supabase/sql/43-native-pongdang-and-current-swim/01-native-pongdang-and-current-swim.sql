-- Apply after 42. Upload the seven assets from 20261015-161244 first.
begin;
update public.collectible_species set sprite_sheet_path=case id
 when 'pongdang-shark' then 'fish/epic/sunwave-shark-glide_sprite.png'
 when 'pongdang-whale' then 'fish/epic/wavefin-whale-glide_sprite.png'
 else 'fish/mythic/pongi-explorer-cruise_sprite.png' end,
 facing_direction='right',flip_with_direction=true
where id in ('pongdang-shark','pongdang-whale','pongi-explorer');
insert into public.collectible_species
(id,kind,name,description,swim_y_min,swim_y_max,speed,size,rarity,sprite_sheet_path,thumbnail_path,sell_price,native_region_id,movement_type,flip_with_direction,travel_direction,facing_direction)
values
('pongdang-native-shark','fish','퐁당 상어','머리 위 작은 불가사리와 살구빛 몸이 퐁이를 닮은 상어. 퐁당섬 앞바다에서 잔잔한 물살을 가르며 섬의 작은 친구들을 지켜 준다.',.25,.75,.036,150,'epic','fish/epic/pongdang-native-shark_sprite.png','fish/epic/pongdang-native-shark_thumbnail.png',740,'pongdang','swim',true,'both','right'),
('pongdang-native-whale','fish','퐁당 고래','주황빛 등과 크림색 배, 머리의 불가사리가 포근한 고래. 퐁당섬 앞바다에 머물며 햇살 아래 느긋하게 물살을 타고 흐른다.',.2,.72,.028,166,'epic','fish/epic/pongdang-native-whale_sprite.png','fish/epic/pongdang-native-whale_thumbnail.png',800,'pongdang','swim',true,'both','right')
on conflict(id) do update set name=excluded.name,description=excluded.description,
 swim_y_min=excluded.swim_y_min,swim_y_max=excluded.swim_y_max,speed=excluded.speed,size=excluded.size,rarity=excluded.rarity,
 sprite_sheet_path=excluded.sprite_sheet_path,thumbnail_path=excluded.thumbnail_path,sell_price=excluded.sell_price,
 native_region_id=excluded.native_region_id,movement_type=excluded.movement_type,
 flip_with_direction=excluded.flip_with_direction,travel_direction=excluded.travel_direction,facing_direction=excluded.facing_direction;
delete from public.collectible_habitats where species_id in ('pongdang-native-shark','pongdang-native-whale') and region_id<>'pongdang';
insert into public.collectible_habitats(species_id,region_id)
select id,'pongdang' from public.collectible_species where id in ('pongdang-native-shark','pongdang-native-whale') on conflict do nothing;
commit;
