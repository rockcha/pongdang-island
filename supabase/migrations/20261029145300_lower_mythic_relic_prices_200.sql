-- Generated from supabase/catalog/catalog.json. Review before migration deployment.
begin;
set constraints all deferred;
update public.fishing_relics s set sell_price=p.sell_price from (values
('eternal-water-clock',2800),
('golden-parade-crown',2800),
('horizon-ark',2800),
('instant-fishing-hook',2800),
('ocean-memory-compass',2800),
('ocean-seed',2800),
('primordial-ember',2800),
('sea-king-shipwright-edict',2800),
('sea-king-summoning-bell',2800),
('sea-king-trade-ledger',2800),
('worlds-end-lens',2800)) as p(id,sell_price) where s.id=p.id;
notify pgrst, 'reload schema';
commit;
