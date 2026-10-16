-- Apply after 54. Upload assets/storage-upload/new/20261015-210827/ first.
-- Repeatable; preserves catalog identity, ownership, discoveries and placements.
begin;
update public.collectible_species
set sprite_sheet_path='decorations/epic/lunea-record-shelf_sprite.png',
 idle_animated=true,movement_type='fixed',flip_with_direction=false,travel_direction='both'
where id='lunea-record-shelf' and kind='decoration';
notify pgrst,'reload schema';
commit;
select id,name,kind,rarity,native_region_id,sprite_sheet_path,idle_animated
from public.collectible_species where id='lunea-record-shelf';
