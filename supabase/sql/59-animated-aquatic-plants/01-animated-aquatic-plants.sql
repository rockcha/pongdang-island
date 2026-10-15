-- Apply after 58. Upload assets/storage-upload/new/20261015-225310/ first.
-- Repeatable; preserves IDs, ownership, discoveries, habitats, size and placements.
begin;
update public.collectible_species
set thumbnail_path=case id
 when 'ribbon-eelgrass' then 'decorations/normal/ribbon-eelgrass-based_thumbnail.png'
 when 'pebble-sea-moss' then 'decorations/normal/pebble-sea-moss-based_thumbnail.png'
 when 'spiral-kelp' then 'decorations/normal/spiral-kelp-based_thumbnail.png'
 when 'pearl-sea-grapes' then 'decorations/rare/pearl-sea-grapes-based_thumbnail.png'
 when 'rose-fan-seaweed' then 'decorations/rare/rose-fan-seaweed-based_thumbnail.png'
 end,
 sprite_sheet_path=case id
 when 'ribbon-eelgrass' then 'decorations/normal/ribbon-eelgrass-based_sprite.png'
 when 'pebble-sea-moss' then 'decorations/normal/pebble-sea-moss-based_sprite.png'
 when 'spiral-kelp' then 'decorations/normal/spiral-kelp-based_sprite.png'
 when 'pearl-sea-grapes' then 'decorations/rare/pearl-sea-grapes-based_sprite.png'
 when 'rose-fan-seaweed' then 'decorations/rare/rose-fan-seaweed-based_sprite.png'
 end,
 idle_animated=true,movement_type='fixed',speed=0,flip_with_direction=false,travel_direction='both'
where kind='decoration' and id in ('ribbon-eelgrass','pebble-sea-moss','spiral-kelp','pearl-sea-grapes','rose-fan-seaweed');
notify pgrst,'reload schema';
commit;
select id,name,kind,rarity,thumbnail_path,sprite_sheet_path,idle_animated
from public.collectible_species where id in ('ribbon-eelgrass','pebble-sea-moss','spiral-kelp','pearl-sea-grapes','rose-fan-seaweed') order by id;
