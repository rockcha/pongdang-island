-- Apply after 47. Upload the v2 PNGs first. Repeatable; keeps ownership and habitats.
begin;
update public.collectible_species
set sprite_sheet_path='fish/rare/sea-crocodile-v2_sprite.png',
 thumbnail_path='fish/rare/sea-crocodile-v2_thumbnail.png',
 facing_direction='right'
where id='sea-crocodile' and kind='fish';
notify pgrst,'reload schema';
commit;
select id,name,size,facing_direction,sprite_sheet_path,thumbnail_path
from public.collectible_species where id='sea-crocodile';
