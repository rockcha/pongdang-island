-- Catalog generated and reviewed; scope deployment to prices only.
-- Keep the default background free and preserve ownership and tier assignments.
begin;
update public.aquarium_backgrounds b set price=v.price
from (values
('aurorasea',800),
('autumnpond',500),
('blueflame',750),
('bottle-harbor',1000),
('cherry-blossom-pond',550),
('cloudsea',650),
('coral',200),
('coral-laundromat',850),
('dawn-flower-market',800),
('dawnmist',250),
('deepsea-post-office',1050),
('default',0),
('firefly-reed-marsh',550),
('glacier',550),
('goldendunes',700),
('icebubbles',750),
('inksea',700),
('jellyfish-bus-stop',950),
('milky-dawn',250),
('mint-ripples',250),
('moon',250),
('moon-dream-onsen',950),
('moss-glasshouse',800),
('pearl',600),
('rainsea',250),
('rosesalt',650),
('seagrass',400),
('shell-dessert-shop',900),
('sleeping-dragon-treasury',1200),
('snowy-attic',900),
('starlight-train-cabin',1200),
('stilltime',400),
('submarine-observatory',1100),
('submerged-library',1100),
('sunken-arcade',1050),
('sunset',250),
('sunset-rooftop-garden',800),
('undersea-teahouse',1050),
('violet',300),
('whale-music-room',1100)
) as v(id,price) where b.id=v.id;
notify pgrst, 'reload schema';
commit;
