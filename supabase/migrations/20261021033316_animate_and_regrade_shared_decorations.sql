-- Generated from supabase/catalog/catalog.json; narrowed during review to grade, price and artwork.
begin;
update public.collectible_species s set rarity=p.rarity::public.game_rarity,sell_price=p.sell_price,thumbnail_path=p.thumbnail_path,sprite_sheet_path=p.sprite_sheet_path from (values
('surface-seeking-beanstalk','epic',320,'decorations/epic/surface-seeking-beanstalk_thumbnail.png','decorations/epic/surface-seeking-beanstalk_animated-v1_sprite.png'),
('upward-sinking-waterfall','epic',380,'decorations/epic/upward-sinking-waterfall_thumbnail.png','decorations/epic/upward-sinking-waterfall_animated-v1_sprite.png')
) as p(id,rarity,sell_price,thumbnail_path,sprite_sheet_path) where s.id=p.id and s.kind='decoration';
notify pgrst, 'reload schema';
commit;
