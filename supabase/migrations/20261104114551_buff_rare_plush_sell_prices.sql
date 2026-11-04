-- Generated from supabase/catalog/catalog.json. Review before migration deployment.
begin;
set constraints all deferred;
update public.collectible_species s set sell_price=p.sell_price from (values
('bukangi-shark-plush',80),
('dolphin-plush',80),
('flattened-otter-plush',60),
('flower-crab-plush',70),
('jellyfish-plush',70),
('octopus-plush',80),
('pongi-plush',80),
('turtle-plush',70),
('unstuffed-seahorse-plush',65),
('whale-plush',80),
('worn-seal-plush',70)) as p(id,sell_price) where s.id=p.id;
notify pgrst, 'reload schema';
commit;
