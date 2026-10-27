-- Generated from supabase/catalog/catalog.json. Review before migration deployment.
begin;
set constraints all deferred;
update public.collectible_species s set sell_price=p.sell_price from (values
('mechsanctum-automakion',2700),
('mechsanctum-deus-zero',4000)) as p(id,sell_price) where s.id=p.id;
notify pgrst, 'reload schema';
commit;
