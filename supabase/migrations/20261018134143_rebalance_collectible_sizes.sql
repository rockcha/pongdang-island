-- Allow mythic creatures to have a visibly larger silhouette than epic species.
begin;
set local lock_timeout = '5s';
alter table public.collectible_species drop constraint collectible_species_size_check;
alter table public.collectible_species add constraint collectible_species_size_check check (size between 16 and 300);
commit;
