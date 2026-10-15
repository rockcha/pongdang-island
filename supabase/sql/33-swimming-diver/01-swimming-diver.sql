-- Apply after 32. Upload the two new swimming-diver PNGs to collectibles/fish/epic/.
-- Updates only diver-pongdang; owned individuals and placements are preserved.
begin;
update public.collectible_species set kind='fish',
 description='잠수복을 입고 퐁당 앞바다를 탐험하는 퐁당이. 둥근 헬멧 너머 미소를 지으며 물갈퀴와 꼬리를 움직여 헤엄친다.',
 swim_y_min=.20,swim_y_max=.75,speed=.040,
 sprite_sheet_path='fish/epic/diver-pongdang-swimming_sprite.png',
 thumbnail_path='fish/epic/diver-pongdang-swimming_thumbnail.png'
where id='diver-pongdang';

-- This obsolete decoration image may be removed, including from gift snapshots.
update public.collectible_gifts g set species=g.species||jsonb_build_object(
 'kind',s.kind,'description',s.description,'swim_y_min',s.swim_y_min,'swim_y_max',s.swim_y_max,
 'speed',s.speed,'sprite_sheet_path',s.sprite_sheet_path,'thumbnail_path',s.thumbnail_path)
from public.collectible_species s where s.id='diver-pongdang' and g.species->>'id'=s.id;
commit;
select id,name,kind,rarity,speed,swim_y_min,swim_y_max,sprite_sheet_path,thumbnail_path
from public.collectible_species where id='diver-pongdang';
