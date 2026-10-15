-- Apply after 52. Upload assets/storage-upload/new/20261015-204537/ first.
-- Repeatable; keeps ownership, habitats, discoveries, sizes and placements.
begin;
update public.collectible_species
set sprite_sheet_path=case id
 when 'seashell-pinwheel' then 'decorations/normal/seashell-pinwheel_sprite.png'
 when 'tiny-reef-carousel' then 'decorations/rare/tiny-reef-carousel_sprite.png'
 when 'pearl-bearing-clam' then 'decorations/normal/pearl-bearing-clam_sprite.png'
 when 'coral-covered-treasure-chest' then 'decorations/rare/coral-covered-treasure-chest_sprite.png'
 end,
 idle_animated=true,movement_type='fixed',flip_with_direction=false,travel_direction='both'
where kind='decoration' and id in ('seashell-pinwheel','tiny-reef-carousel','pearl-bearing-clam','coral-covered-treasure-chest');
notify pgrst,'reload schema';
commit;
select id,name,kind,rarity,sprite_sheet_path,idle_animated
from public.collectible_species
where id in ('seashell-pinwheel','tiny-reef-carousel','pearl-bearing-clam','coral-covered-treasure-chest') order by id;
