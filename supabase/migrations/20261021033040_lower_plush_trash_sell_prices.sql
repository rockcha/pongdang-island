-- Generated from supabase/catalog/catalog.json; narrowed to prices during review.
begin;
update public.collectible_species s set sell_price=p.sell_price from (values
('bukangi-shark-plush',90),
('dolphin-plush',90),
('flower-crab-plush',90),
('jellyfish-plush',90),
('octopus-plush',90),
('pongi-plush',90),
('turtle-plush',90),
('whale-plush',90)
) as p(id,sell_price) where s.id=p.id and s.kind='trash';
notify pgrst, 'reload schema';
commit;
