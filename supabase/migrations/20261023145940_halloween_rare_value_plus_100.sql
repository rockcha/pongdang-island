-- Generated from supabase/catalog/catalog.json. Review before migration deployment.
begin;
set constraints all deferred;
update public.collectible_species s set sell_price=p.sell_price from (values
('halloween-count-cloak-betta',330),
('halloween-discarded-resurrection-manual',138),
('halloween-forgotten-face-mask',225),
('halloween-ghost-ship-compass',142),
('halloween-ghost-skirt-guppy',345),
('halloween-ghost-storage-aquarium',245),
('halloween-headless-portrait',140),
('halloween-little-ghost-gravestone',230),
('halloween-little-ghost-puffer',325),
('halloween-masquerade-lionfish',360),
('halloween-monster-under-bed',240),
('halloween-one-horn-goblin-pleco',320),
('halloween-origami-phantom-koi',370),
('halloween-pumpkin-lantern-angler',340),
('halloween-returned-cursed-doll',135),
('halloween-sleepy-zombie-cory',305),
('halloween-sock-ghost-goby',345),
('halloween-thirteenth-invitation',128),
('halloween-vampire-coffin',150),
('halloween-wisp-lantern-seahorse',350)) as p(id,sell_price) where s.id=p.id;
notify pgrst, 'reload schema';
commit;
