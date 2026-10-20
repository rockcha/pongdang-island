begin;
create function app_private.collectible_storage_filtered(p_offset integer default 0,p_query text default '',p_kind text default 'all',p_rarity text default 'all',p_concept text default 'all') returns jsonb
language plpgsql stable security definer set search_path='' as $$
declare uid uuid:=auth.uid();query text:=btrim(coalesce(p_query,''));result jsonb;
begin
 if uid is null then raise exception 'AUTH_REQUIRED';end if;
 if p_offset is null or p_offset<0 or char_length(query)>60 or p_kind is null or p_kind not in ('all','fish','trash','decoration')
 or p_rarity is null or p_rarity not in ('all','common','rare','epic','mythic') or p_concept is null
 or (p_concept not in ('all','common') and not exists(select 1 from public.regions where id=p_concept)) then raise exception 'INVALID_STORAGE_QUERY';end if;
 with matched as materialized (
  select c.* from public.player_collectibles c join public.collectible_species s on s.id=c.species_id
  where c.user_id=uid and c.tank_id is null and c.sold_at is null and c.escrow_gift_id is null
  and s.kind in ('fish','trash','decoration') and (p_kind='all' or s.kind::text=p_kind)
  and (p_rarity='all' or s.rarity::text=p_rarity)
  and (p_concept='all' or (p_concept='common' and s.native_region_id is null) or s.native_region_id=p_concept)
  and strpos(lower(s.name),lower(query))>0
 ), page as (select * from matched order by acquired_at desc,id limit 50 offset p_offset)
 select jsonb_build_object('total',(select count(*) from matched),'pageSize',50,'items',coalesce((select jsonb_agg(to_jsonb(p)||jsonb_build_object('species',app_private.species_payload(p.species_id,p.map_region_id)) order by p.acquired_at desc,p.id) from page p),'[]'::jsonb)) into result;
 return result;
end $$;
create function public.collectible_storage_filtered(p_offset integer default 0,p_query text default '',p_kind text default 'all',p_rarity text default 'all',p_concept text default 'all') returns jsonb
language sql set search_path='' as $$select app_private.collectible_storage_filtered(p_offset,p_query,p_kind,p_rarity,p_concept)$$;
revoke all on function app_private.collectible_storage_filtered(integer,text,text,text,text),public.collectible_storage_filtered(integer,text,text,text,text) from public,anon,authenticated;
grant execute on function app_private.collectible_storage_filtered(integer,text,text,text,text),public.collectible_storage_filtered(integer,text,text,text,text) to authenticated;
notify pgrst,'reload schema';
commit;
