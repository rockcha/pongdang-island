-- Reduce only the bonus for newly generated orders. Existing reward snapshots
-- and delivery receipts are deliberately unchanged; do not regenerate boards.
CREATE OR REPLACE FUNCTION app_private.merchant_order_bonus(p_items jsonb)
 RETURNS integer
 LANGUAGE plpgsql
 IMMUTABLE
 SET search_path TO ''
AS $function$
declare n integer;total integer;rare_units integer;rare_kinds integer;epics integer;mythics integer;bonus integer;
begin
 if jsonb_typeof(p_items) is distinct from 'array' then raise exception 'INVALID_MERCHANT_ITEMS';end if;
 n:=jsonb_array_length(p_items);
 if n not between 1 and 3 or exists(select 1 from jsonb_array_elements(p_items) a where (a->>'quantity') is null or (a->>'quantity')::integer not between 1 and 2 or coalesce(a->>'rarity','') not in ('common','rare','epic','mythic')) then raise exception 'INVALID_MERCHANT_ITEMS';end if;
 select sum((a->>'quantity')::integer),coalesce(sum((a->>'quantity')::integer) filter(where a->>'rarity'='rare'),0),count(*) filter(where a->>'rarity'='rare'),count(*) filter(where a->>'rarity'='epic'),count(*) filter(where a->>'rarity'='mythic')
 into total,rare_units,rare_kinds,epics,mythics from jsonb_array_elements(p_items) a;
 if n=1 and total=1 then
  return round((case p_items->0->>'rarity' when 'common' then 72 when 'rare' then 90 when 'epic' then 225 else 540 end) * 0.9)::integer;
 elsif n=2 and total=2 then
  bonus:=case rare_kinds when 0 then 120 when 1 then 200 else 250 end;
 elsif n=2 and total=3 then
  bonus:=case rare_units when 0 then 200 when 1 then 300 when 2 then 380 else 500 end;
 elsif n=3 and total=4 and (select max((a->>'quantity')::integer) from jsonb_array_elements(p_items) a)=2 then
  bonus:=case rare_kinds when 0 then 600 when 1 then 800 else 1000 end;
 else raise exception 'INVALID_MERCHANT_ITEMS';end if;
 return round((bonus+epics*250+mythics*600) * 0.9)::integer;
end $function$;
