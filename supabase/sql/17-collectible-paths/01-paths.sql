-- Apply after 16. Safe to repeat; changes only asset paths, preserves all progress.
begin;
update public.collectible_species set sprite_sheet_path=case id
 when 'pongul' then 'fish/normal/pongul_sprite.png' when 'moon-angelfish' then 'fish/rare/moon-angelfish_sprite.png'
 when 'star-ray' then 'fish/epic/star-ray_sprite.png' when 'dawn-arowana' then 'fish/mythic/dawn-arowana_sprite.png' else sprite_sheet_path end,
 thumbnail_path=case id
 when 'pongul' then 'fish/normal/pongul_thumbnail.png' when 'moon-angelfish' then 'fish/rare/moon-angelfish_thumbnail.png'
 when 'star-ray' then 'fish/epic/star-ray_thumbnail.png' when 'dawn-arowana' then 'fish/mythic/dawn-arowana_thumbnail.png'
 when 'glass-bottle' then 'trash/normal/glass-bottle_thumbnail.png' when 'coral-house' then 'structures/normal/coral-house_thumbnail.png'
 when 'ocean-map' then 'map/normal/ocean-map_thumbnail.png' else thumbnail_path end;
notify pgrst,'reload schema';
commit;
