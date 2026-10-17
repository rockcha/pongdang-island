-- Reviewed catalog diff: exclude non-native fish from primal; preserve species and player property.
begin;
delete from public.collectible_habitats h
using public.collectible_species s
where h.species_id=s.id and h.region_id='primal'
 and s.kind='fish' and s.native_region_id is distinct from 'primal';
notify pgrst,'reload schema';
commit;