-- Generated from supabase/catalog/catalog.json; reviewed to update sprite paths only.
begin;
update public.collectible_species s set sprite_sheet_path=p.sprite_sheet_path from (values
('levitating-stone-spire','decorations/epic/levitating-stone-spire_animated-v1_sprite.png'),
('parasol-sponge-tree','decorations/epic/parasol-sponge-tree_animated-v1_sprite.png'),
('waterwheel-cascade-tower','decorations/epic/waterwheel-cascade-tower_animated-v1_sprite.png')
) as p(id,sprite_sheet_path) where s.id=p.id;
notify pgrst, 'reload schema';
commit;
