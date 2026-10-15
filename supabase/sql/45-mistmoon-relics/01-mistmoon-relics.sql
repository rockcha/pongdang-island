-- Apply after 44. Upload 20261015-173555 PNGs first.
-- Repeatable; existing ownership and placements are preserved.
begin;
-- Regional fishing already selects fish/trash by rarity (SQL 32).
-- Retire its old common-only trash restriction for the requested rare/epic relics.
alter table public.collectible_species drop constraint if exists collectible_nonfish_common;
insert into public.collectible_species
(id,kind,name,description,swim_y_min,swim_y_max,speed,size,rarity,sprite_sheet_path,thumbnail_path,sell_price,native_region_id,movement_type,flip_with_direction,travel_direction,facing_direction)
values
('stopped-moon-watch','trash','멈춘 달시계','초승달 모양 바늘이 멈춘 작은 회중시계. 금 간 유리와 녹슨 고리만이 안개달에서 흘러간 시간을 기억한다.',.45,.88,.012,42,'rare',null,'trash/rare/stopped-moon-watch_thumbnail.png',75,'mistmoon','swim',false,'both','front'),
('lunea-failed-invitation','trash','루네아의 실패한 초대장','봉인이 깨져 끝내 전해지지 못한 루네아의 초대장. 물에 번진 종이와 풀어진 은빛 리본에 희미한 달무늬가 남아 있다.',.45,.88,.012,52,'epic',null,'trash/epic/lunea-failed-invitation_thumbnail.png',240,'mistmoon','swim',false,'both','front'),
('cracked-teacup','trash','금 간 찻잔','가장자리가 깨지고 바닥에 모래가 고인 연보라 찻잔. 안개달의 조용한 물밑에서 돌아오지 않는 티타임을 기다린다.',.45,.88,.012,38,'common',null,'trash/normal/cracked-teacup_thumbnail.png',15,'mistmoon','swim',false,'both','front'),
('drowsy-mushroom-cluster','decoration','졸음버섯 군락','우윳빛 갓을 졸린 듯 늘어뜨린 작은 버섯 군락. 안개달의 바닥에서 서로 기대어 조용한 꿈을 나눈다.',null,null,0,68,'common',null,'decorations/normal/drowsy-mushroom-cluster_thumbnail.png',50,'mistmoon','fixed',false,'both','front'),
('dream-keeping-well','decoration','꿈을 담는 우물','조개빛 돌을 둥글게 쌓아 만든 낮은 우물. 안쪽에 고인 작은 달빛이 안개달 생물들의 잊힌 꿈을 비춘다.',null,null,0,84,'rare',null,'decorations/rare/dream-keeping-well_thumbnail.png',190,'mistmoon','fixed',false,'both','front'),
('lunea-record-shelf','decoration','루네아의 기록 서가','조개판과 진주빛 두루마리를 간직한 루네아의 작은 서가. 달의 문양 아래 안개달이 기억하는 오래된 물결들이 잠들어 있다.',null,null,0,100,'epic',null,'decorations/epic/lunea-record-shelf_thumbnail.png',680,'mistmoon','fixed',false,'both','front')
on conflict(id) do update set kind=excluded.kind,name=excluded.name,description=excluded.description,
swim_y_min=excluded.swim_y_min,swim_y_max=excluded.swim_y_max,speed=excluded.speed,size=excluded.size,rarity=excluded.rarity,
sprite_sheet_path=excluded.sprite_sheet_path,thumbnail_path=excluded.thumbnail_path,sell_price=excluded.sell_price,
native_region_id=excluded.native_region_id,movement_type=excluded.movement_type,flip_with_direction=excluded.flip_with_direction,travel_direction=excluded.travel_direction,facing_direction=excluded.facing_direction;
delete from public.collectible_habitats where species_id in ('stopped-moon-watch','lunea-failed-invitation','cracked-teacup','drowsy-mushroom-cluster','dream-keeping-well','lunea-record-shelf') and region_id<>'mistmoon';
insert into public.collectible_habitats(species_id,region_id)
select id,'mistmoon' from public.collectible_species where id in ('stopped-moon-watch','lunea-failed-invitation','cracked-teacup','drowsy-mushroom-cluster','dream-keeping-well','lunea-record-shelf') on conflict do nothing;
commit;
