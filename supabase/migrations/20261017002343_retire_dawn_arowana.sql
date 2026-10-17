-- Reviewed catalog retirement: remove dawn-arowana only; no catalog-wide upserts.
begin;
lock table public.collectible_species in share row exclusive mode;
do $$ begin
 if exists(select 1 from public.player_collectibles where species_id='dawn-arowana')
 or exists(select 1 from public.player_discoveries where species_id='dawn-arowana')
 or exists(select 1 from public.collectible_gifts where species->>'id'='dawn-arowana')
 or exists(select 1 from public.exchange_listings where offer->>'id'='dawn-arowana' or wanted->>'id'='dawn-arowana')
 or exists(select 1 from public.auction_listings where offer->>'id'='dawn-arowana') then
  raise exception 'DAWN_AROWANA_REFERENCED';
 end if;
end $$;
delete from public.collectible_habitats where species_id='dawn-arowana';
delete from public.collectible_species where id='dawn-arowana';
notify pgrst,'reload schema';
commit;
