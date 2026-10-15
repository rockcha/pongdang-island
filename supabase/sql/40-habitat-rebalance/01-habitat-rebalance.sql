-- Apply after 39. Repeatable. Keep legacy native metadata aligned with habitats.
begin;
update public.collectible_species set native_region_id=null
where id in ('silver-mist-goby','hazy-glass-marble','crescent-seahorse','coral-bean-shrimp','coral-claw-crab');
delete from public.collectible_habitats where species_id in
 ('silver-mist-goby','hazy-glass-marble','crescent-seahorse','coral-bean-shrimp','coral-claw-crab');
insert into public.collectible_habitats(species_id,region_id) values
 ('silver-mist-goby','pongdang'),('silver-mist-goby','mistmoon'),
 ('hazy-glass-marble','pongdang'),('hazy-glass-marble','coral'),('hazy-glass-marble','mistmoon'),
 ('crescent-seahorse','coral'),('crescent-seahorse','mistmoon'),
 ('coral-bean-shrimp','pongdang'),('coral-bean-shrimp','coral'),
 ('coral-claw-crab','pongdang'),('coral-claw-crab','coral');
-- Do not remove a catalog row if ownership or discoveries have appeared since review.
-- Existing foreign keys also prevent losing owned or discovered items.
do $$ begin
 if exists(select 1 from public.collectible_gifts where status='pending'
   and species->>'id' in ('moon-sleep-waterlily','mist-bell-windchime')) then
  raise exception 'Pending gifts must be resolved before retiring these decorations';
 end if;
end $$;
delete from public.collectible_species where id in ('moon-sleep-waterlily','mist-bell-windchime');
commit;
