-- Run after 19. Repeatable; preserves images, habitats and owned collectibles.
begin;
update public.collectible_species as s
set rarity='common', sell_price=prices.sell_price
from (values
  ('blue-sailfish',220),
  ('coral-seabream',180),
  ('spotted-giant-grouper',260),
  ('silver-yellowtail',200),
  ('mint-mahi-mahi',240)
) as prices(id,sell_price)
where s.id=prices.id and s.kind='fish';
commit;

-- Expect five rows with common rarity. Existing fish/rare paths are intentional.
select id,name,rarity,sell_price from public.collectible_species
where id in ('blue-sailfish','coral-seabream','spotted-giant-grouper','silver-yellowtail','mint-mahi-mahi')
order by sell_price;
