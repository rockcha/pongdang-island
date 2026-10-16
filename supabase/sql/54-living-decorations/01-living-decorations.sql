-- Apply after 53. Upload assets/storage-upload/new/20261015-205549/ first.
-- Repeatable; preserves ownership, discoveries, habitats and placements.
begin;
update public.collectible_species
set sprite_sheet_path='decorations/rare/'||id||'_sprite.png',
 idle_animated=true,movement_type='fixed',flip_with_direction=false,travel_direction='both'
where kind='decoration' and id in ('sleeping-mini-shipwreck','first-coral-cradle','dream-keeping-well','coral-house','moonlit-jellyfish-lantern');

update public.collectible_species set rarity='common'
where kind='decoration' and id in ('butter-starfish','ripple-coral-fragment');
notify pgrst,'reload schema';
commit;
select id,name,kind,rarity,sprite_sheet_path,idle_animated,sell_price
from public.collectible_species
where id in ('sleeping-mini-shipwreck','first-coral-cradle','dream-keeping-well','coral-house','moonlit-jellyfish-lantern','butter-starfish','ripple-coral-fragment') order by id;
