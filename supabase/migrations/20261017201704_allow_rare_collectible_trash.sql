-- Rare trash is a supported collectible tier; preserve all existing rows and policies.
begin;
alter table public.collectible_species drop constraint if exists collectible_nonfish_common;
commit;
