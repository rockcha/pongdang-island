-- Apply after 38. Directions visually audited against Storage on 2026-10-15.
-- Nullable means not reviewed; the client uses the audited image-path fallback.
begin;
alter table public.collectible_species add column if not exists facing_direction text
 check (facing_direction in ('left','right','front'));
comment on column public.collectible_species.facing_direction is
 'Head direction in the original artwork before horizontal flipping. front = frontal or no horizontal heading. Re-audit when replacing the sprite.';
with reviewed(id, path, facing) as (values
 ('aurora-eel', 'fish/epic/aurora-eel_sprite.png', 'left'),
 ('bean-pufferfish', 'fish/normal/bean-pufferfish_sprite.png', 'left'),
 ('blue-bronze-horseshoe-crab', 'fish/rare/blue-bronze-horseshoe-crab_sprite.png', 'front'),
 ('blue-great-white', 'fish/rare/blue-great-white_sprite.png', 'right'),
 ('blue-sailfish', 'fish/normal/blue-sailfish_sprite.png', 'right'),
 ('button-urchin', 'fish/normal/button-urchin_sprite.png', 'front'),
 ('cloud-humpback', 'fish/rare/cloud-humpback_sprite.png', 'right'),
 ('coral-bean-shrimp', 'fish/normal/coral-bean-shrimp_sprite.png', 'left'),
 ('coral-claw-crab', 'fish/rare/coral-claw-crab_sprite.png', 'front'),
 ('coral-crowned-turtle', 'fish/epic/coral-crowned-turtle_sprite.png', 'left'),
 ('coral-seabream', 'fish/normal/coral-seabream_sprite.png', 'right'),
 ('coralfan-butterflyfish', 'fish/rare/coralfan-butterflyfish_sprite.png', 'left'),
 ('crescent-seahorse', 'fish/rare/crescent-seahorse_sprite.png', 'right'),
 ('dawn-arowana', 'fish/mythic/dawn-arowana_sprite.png', 'right'),
 ('diver-pongdang', 'fish/epic/diver-pongdang-swimming_sprite.png', 'right'),
 ('dreaming-dumbo-octopus', 'fish/epic/dreaming-dumbo-octopus_sprite.png', 'front'),
 ('flower-coral-seadragon', 'fish/rare/flower-coral-seadragon_sprite.png', 'left'),
 ('glassfin-lionfish', 'fish/rare/glassfin-lionfish_sprite.png', 'left'),
 ('mint-mahi-mahi', 'fish/normal/mint-mahi-mahi_sprite.png', 'right'),
 ('moon-angelfish', 'fish/rare/moon-angelfish_sprite.png', 'right'),
 ('moonbell-jellyfish', 'fish/rare/moonbell-jellyfish_sprite.png', 'front'),
 ('night-orca', 'fish/rare/night-orca_sprite.png', 'right'),
 ('opal-nautilus', 'fish/rare/opal-nautilus_sprite.png', 'right'),
 ('orange-clownfish', 'fish/normal/orange-clownfish_sprite.png', 'left'),
 ('peach-octopus', 'fish/normal/peach-octopus_sprite.png', 'front'),
 ('peach-umbrella-jellyfish', 'fish/normal/peach-umbrella-jellyfish_sprite.png', 'front'),
 ('pearl-parrotfish', 'fish/rare/pearl-parrotfish_sprite.png', 'left'),
 ('pebble-hermit-crab', 'fish/normal/pebble-hermit-crab_sprite.png', 'front'),
 ('petal-nudibranch', 'fish/rare/petal-nudibranch_sprite.png', 'left'),
 ('pink-scallop', 'fish/normal/pink-scallop_sprite.png', 'front'),
 ('pinkchin-blenny', 'fish/normal/pinkchin-blenny_sprite.png', 'left'),
 ('plump-horse-mackerel', 'fish/normal/plump-horse-mackerel_sprite.png', 'right'),
 ('pongdang-fish', 'fish/rare/pongdang-fish_sprite.png', 'right'),
 ('pongul', 'fish/normal/pongul_sprite.png', 'front'),
 ('ribbon-eel', 'fish/normal/ribbon-eel_sprite.png', 'left'),
 ('round-filefish', 'fish/normal/round-filefish_sprite.png', 'right'),
 ('sand-goby', 'fish/normal/sand-goby_sprite.png', 'right'),
 ('sand-hammerhead', 'fish/rare/sand-hammerhead_sprite.png', 'right'),
 ('sea-crocodile', 'fish/rare/sea-crocodile_sprite.png', 'left'),
 ('silver-anchovy', 'fish/normal/silver-anchovy_sprite.png', 'right'),
 ('silver-mist-goby', 'fish/rare/silver-mist-goby_sprite.png', 'right'),
 ('silver-yellowtail', 'fish/normal/silver-yellowtail_sprite.png', 'right'),
 ('soft-sea-cucumber', 'fish/normal/soft-sea-cucumber_sprite.png', 'front'),
 ('spotted-giant-grouper', 'fish/normal/spotted-giant-grouper_sprite.png', 'right'),
 ('star-ray', 'fish/epic/star-ray_sprite.png', 'right'),
 ('star-spotted-whale-shark', 'fish/rare/star-spotted-whale-shark_sprite.png', 'right'),
 ('starpattern-manta', 'fish/epic/starpattern-manta_sprite.png', 'front'),
 ('striped-mackerel', 'fish/normal/striped-mackerel_sprite.png', 'right'),
 ('threadtail-shrimp', 'fish/normal/threadtail-shrimp_sprite.png', 'left'),
 ('tiny-cuttlefish', 'fish/normal/tiny-cuttlefish_sprite.png', 'front')
)
update public.collectible_species s set facing_direction=r.facing
from reviewed r
where s.id=r.id and s.kind='fish'
 and coalesce(s.sprite_sheet_path,s.thumbnail_path)=r.path
 and s.facing_direction is null;
-- This side-facing pulse species previously disabled mirroring entirely.
update public.collectible_species set flip_with_direction=true
where id='opal-nautilus' and sprite_sheet_path='fish/rare/opal-nautilus_sprite.png';
commit;
