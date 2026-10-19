-- Halve the thirteen regional/cosmetic rods from the previous price progression.
begin;
update public.fishing_rods as r set price=v.price from (values
('bluegrove',500),
('cloudferry',900),
('coral',450),
('dreamabyss',800),
('lunea',750),
('mistmoon',550),
('mukhyang',1100),
('pongdang',400),
('primal',700),
('scrapisle',1000),
('siren',1200),
('starruins',650),
('whitenight',600)
) as v(id,price) where r.id=v.id;
commit;
