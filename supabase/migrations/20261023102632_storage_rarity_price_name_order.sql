begin;
-- Sort before pagination, preserving ownership filters and stable item ties.
CREATE OR REPLACE FUNCTION app_private.collectible_storage(p_offset integer DEFAULT 0, p_query text DEFAULT ''::text, p_kind text DEFAULT 'all'::text)
 RETURNS jsonb
 LANGUAGE plpgsql
 STABLE SECURITY DEFINER
 SET search_path TO ''
AS $function$
declare v_uid uuid:=auth.uid();v_total integer;v_items jsonb;v_query text:=btrim(coalesce(p_query,''));
begin
 if v_uid is null then raise exception 'AUTH_REQUIRED'; end if;
 if p_offset is null or p_offset<0 or char_length(v_query)>60 or p_kind is null or p_kind not in ('all','fish','trash','decoration') then raise exception 'INVALID_STORAGE_QUERY'; end if;
 select count(*) into v_total from public.player_collectibles c join public.collectible_species s on s.id=c.species_id
 where c.user_id=v_uid and c.tank_id is null and c.sold_at is null and c.escrow_gift_id is null
   and s.kind in ('fish','trash','decoration') and (p_kind='all' or s.kind::text=p_kind) and strpos(s.name,v_query)>0;
 select coalesce(jsonb_agg((to_jsonb(q)-'storage_order')||jsonb_build_object('species',app_private.species_payload(q.species_id,q.map_region_id)) order by q.storage_order),'[]'::jsonb) into v_items
 from (select c.*,row_number() over(order by case s.rarity when 'mythic' then 3 when 'epic' then 2 when 'rare' then 1 else 0 end asc,s.sell_price asc,s.name collate "C",s.id,c.acquired_at desc,c.id) as storage_order from public.player_collectibles c join public.collectible_species s on s.id=c.species_id
 where c.user_id=v_uid and c.tank_id is null and c.sold_at is null and c.escrow_gift_id is null
   and s.kind in ('fish','trash','decoration') and (p_kind='all' or s.kind::text=p_kind) and strpos(s.name,v_query)>0
 order by storage_order limit 50 offset p_offset) q;
 return jsonb_build_object('items',v_items,'total',v_total,'pageSize',50);
end $function$;

CREATE OR REPLACE FUNCTION app_private.collectible_storage_filtered(p_offset integer DEFAULT 0, p_query text DEFAULT ''::text, p_kind text DEFAULT 'all'::text, p_rarity text DEFAULT 'all'::text, p_concept text DEFAULT 'all'::text)
 RETURNS jsonb
 LANGUAGE plpgsql
 STABLE SECURITY DEFINER
 SET search_path TO ''
AS $function$
declare uid uuid:=auth.uid();query text:=btrim(coalesce(p_query,''));result jsonb;
begin
 if uid is null then raise exception 'AUTH_REQUIRED';end if;
 if p_offset is null or p_offset<0 or char_length(query)>60 or p_kind is null or p_kind not in ('all','fish','trash','decoration')
 or p_rarity is null or p_rarity not in ('all','common','rare','epic','mythic') or p_concept is null
 or (p_concept not in ('all','common') and not exists(select 1 from public.regions where id=p_concept)) then raise exception 'INVALID_STORAGE_QUERY';end if;
 with matched as materialized (
  select c.*,row_number() over(order by case s.rarity when 'mythic' then 3 when 'epic' then 2 when 'rare' then 1 else 0 end asc,s.sell_price asc,s.name collate "C",s.id,c.acquired_at desc,c.id) as storage_order from public.player_collectibles c join public.collectible_species s on s.id=c.species_id
  where c.user_id=uid and c.tank_id is null and c.sold_at is null and c.escrow_gift_id is null
  and s.kind in ('fish','trash','decoration') and (p_kind='all' or s.kind::text=p_kind)
  and (p_rarity='all' or s.rarity::text=p_rarity)
  and (p_concept='all' or (p_concept='common' and s.native_region_id is null) or s.native_region_id=p_concept)
  and strpos(lower(s.name),lower(query))>0
 ), page as (select * from matched order by storage_order limit 50 offset p_offset)
 select jsonb_build_object('total',(select count(*) from matched),'pageSize',50,'items',coalesce((select jsonb_agg((to_jsonb(p)-'storage_order')||jsonb_build_object('species',app_private.species_payload(p.species_id,p.map_region_id)) order by p.storage_order) from page p),'[]'::jsonb)) into result;
 return result;
end $function$;

notify pgrst,'reload schema';
commit;
