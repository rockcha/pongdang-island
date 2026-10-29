-- Generated from supabase/catalog/catalog.json. Review before migration deployment.
begin;
set constraints all deferred;
update public.collectible_species s set sell_price=p.sell_price from (values
('nyamnyam-pongi-donut-float',1110),
('nyamnyam-pongi-little-baker',1120),
('nyamnyam-pongi-popcorn-courier',1100)) as p(id,sell_price) where s.id=p.id;
notify pgrst, 'reload schema';
commit;
