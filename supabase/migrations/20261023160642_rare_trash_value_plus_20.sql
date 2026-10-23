-- Generated from supabase/catalog/catalog.json. Review before migration deployment.
begin;
set constraints all deferred;
update public.collectible_species s set sell_price=p.sell_price from (values
('bukangi-shark-plush',40),
('cloud-broken-broom',110),
('cracked-pressure-gauge',29),
('dented-diving-lamp',29),
('dolphin-plush',40),
('gold-dust-glass-bottle',434),
('half-magic-box',75),
('halloween-discarded-resurrection-manual',158),
('halloween-ghost-ship-compass',162),
('halloween-headless-portrait',160),
('halloween-returned-cursed-doll',155),
('halloween-thirteenth-invitation',148),
('halloween-vampire-coffin',170),
('octopus-plush',40),
('pirate-coin-bundle',450),
('pongdang-merch-set',50),
('pongi-plush',40),
('pongi-snack-wrapper',30),
('salvaged-gold-fragment',442),
('siren-odysseus-helmet',50),
('siren-perseus-shield',90),
('siren-zeus-lightning',110),
('whale-plush',40)) as p(id,sell_price) where s.id=p.id;
update public.collectible_species s set sell_price=p.sell_price from (values
('broken-kingdom-tile',45),
('hourglass-bottle',40),
('stopped-moon-watch',35),
('wandering-pocket-compass',45)) as p(id,sell_price) where s.id=p.id;
notify pgrst, 'reload schema';
commit;
