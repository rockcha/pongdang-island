-- Narrowed catalog deployment: only movement and habitat depth change.
begin;
update public.collectible_species s set movement_type=v.movement_type,swim_y_min=v.low,swim_y_max=v.high from (values
('mistmoon-postman-hermit','crawl',0.86::numeric,0.95::numeric),
('icearmor-king-crab','crawl',0.86::numeric,0.95::numeric)
) v(id,movement_type,low,high) where s.id=v.id;
notify pgrst, 'reload schema';
commit;
