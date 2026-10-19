-- Catalog prices follow the same monotonic conversion, rounded to five gold.
-- Include remote-only fish without altering their other fields or player-owned records.
-- Old ranges were read from the target project before preparing this migration.
update public.collectible_species
set sell_price=case rarity
 when 'common' then greatest(15,least(150,(round((15+(sell_price-20)*135.0/240)/5)*5)::integer))
 when 'epic' then greatest(600,least(1000,(round((600+(sell_price-560)*400.0/240)/5)*5)::integer))
 when 'mythic' then greatest(1500,least(3000,(round((1500+(sell_price-1800)*1500.0/1000)/5)*5)::integer))
 end
where kind='fish' and rarity in ('common','epic','mythic');
