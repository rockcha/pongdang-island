-- Generated from supabase/catalog/catalog.json. Review before migration deployment.
begin;
set constraints all deferred;
update public.collectible_species s set sell_price=p.sell_price from (values
('halloween-bandage-loach',52),
('halloween-cathedral-ray-morne',3250),
('halloween-chestnut-witch-puffer',58),
('halloween-dullahan-seahorse',3150),
('halloween-fang-candy-minnow',48),
('halloween-ghost-skirt-guppy',50),
('halloween-glass-coffin-vampire-shark',990),
('halloween-haunted-house-turtle',1040),
('halloween-inverted-moon-angler',980),
('halloween-little-ghost-puffer',70),
('halloween-midnight-pumpkin-train',1020),
('halloween-moonwolf-shark-lugar',3350),
('halloween-mourning-whale-nenia',1030),
('halloween-patchwork-shark',900),
('halloween-pumpkin-hood-puffer',65),
('halloween-scarecrow-sailfish',950),
('halloween-skull-pattern-filefish',60),
('halloween-sock-ghost-goby',54),
('halloween-soft-ghost-goldfish',56),
('halloween-thunder-sturgeon-volta',1050),
('halloween-tomb-dragon-sahet',3450),
('halloween-witch-hat-ray',68)) as p(id,sell_price) where s.id=p.id;
notify pgrst, 'reload schema';
commit;
