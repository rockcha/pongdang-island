-- Apply after 32 (33 is independent). Repeatable.
-- Convert legacy owned maps to their destination-specific maps before removing
-- the obsolete template. Existing region unlocks and fishing history survive.
begin;
insert into public.player_discoveries(user_id,species_id,discovered_at)
select c.user_id,s.id,min(c.acquired_at)
from public.player_collectibles c join public.collectible_species s on s.id='map-'||c.map_region_id and s.kind='map'
where c.species_id='ocean-map'
group by c.user_id,s.id
on conflict(user_id,species_id) do nothing;

update public.player_collectibles c set species_id=s.id
from public.collectible_species s
where c.species_id='ocean-map' and s.id='map-'||c.map_region_id and s.kind='map';

-- A legacy map without a valid destination cannot be reassigned. Remove only
-- that obsolete individual; keep its attempt row and unlink the deleted item.
update public.fishing_attempts a set collectible_id=null
where collectible_id in (select id from public.player_collectibles where species_id='ocean-map');
delete from public.player_collectibles where species_id='ocean-map';
delete from public.player_discoveries where species_id='ocean-map';
delete from public.collectible_habitats where species_id='ocean-map';
delete from public.collectible_species where id='ocean-map';
commit;

select id,name,rarity,thumbnail_path from public.collectible_species where kind='map' order by id;
