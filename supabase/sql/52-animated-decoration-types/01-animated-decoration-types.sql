-- Apply after 51. Repeatable; reuses existing uploaded sprites and thumbnails.
-- Keeps collectible IDs, ownership, discoveries, habitats and placements.
begin;
update public.collectible_species
set kind='decoration',swim_y_min=null,swim_y_max=null,speed=0,
 movement_type='fixed',flip_with_direction=false,travel_direction='both',idle_animated=true,
 size=case when id='sunken-windmill' then 145 else size end
where id in ('sunken-windmill','pea-sponge','mistbread-sponge');

update public.collectible_species set size=160
where id='dawn-narwhal' and kind='fish';
notify pgrst,'reload schema';
commit;

select id,name,kind,size,movement_type,idle_animated,native_region_id,sprite_sheet_path
from public.collectible_species
where id in ('sunken-windmill','pea-sponge','mistbread-sponge','dawn-narwhal')
order by id;
