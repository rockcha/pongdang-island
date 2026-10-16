-- Apply after 56. Upload assets/storage-upload/new/20261015-221928/ first.
-- Repeatable; preserves identity, ownership, discoveries, size and habitats.
begin;
update public.collectible_species
set movement_type='crawl',speed=0.012,swim_y_min=0.84,swim_y_max=0.94,
 flip_with_direction=true,travel_direction='both',facing_direction='right',idle_animated=false,
 sprite_sheet_path='fish/mythic/atlantean-sentinel-walk_sprite.png',
 description='대리석 갑주와 청동 관절로 만들어진 고대 수호병. 삼지창을 들고 묵직한 걸음을 옮기며 잠든 왕국을 순찰한다. 물살에 흐르는 망토 아래 수정 심장이 천천히 빛난다.'
where id='atlantean-sentinel' and kind='fish';
notify pgrst,'reload schema';
commit;
select id,name,kind,rarity,size,native_region_id,movement_type,speed,idle_animated,sprite_sheet_path
from public.collectible_species where id='atlantean-sentinel';
