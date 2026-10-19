-- Expose only the seller avatar alongside existing marketplace identity.
begin;
CREATE OR REPLACE FUNCTION app_private.exchange_state(p_tab text DEFAULT 'all'::text, p_query text DEFAULT ''::text, p_offset integer DEFAULT 0)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''
AS $function$
declare v_uid uuid:=auth.uid();v_rows jsonb;v_total integer;
begin
 if v_uid is null then raise exception 'AUTH_REQUIRED';end if;
 if p_tab is null or p_tab not in ('all','mine') or p_query is null or char_length(p_query)>80 or p_offset is null or p_offset<0 then raise exception 'INVALID_EXCHANGE';end if;
 select count(*) into v_total from public.exchange_listings l
 where (case when p_tab='mine' then l.owner_id=v_uid else l.status='active' and l.side='sell' end)
 and l.side='sell' and l.offer->>'kind' in ('collectible','bait') and l.wanted->>'kind'='gold' and l.wanted->>'id'='gold'
 and (coalesce(l.title,'') ilike '%'||p_query||'%' or l.offer->>'name' ilike '%'||p_query||'%' or l.wanted->>'name' ilike '%'||p_query||'%');
 select coalesce(jsonb_agg(to_jsonb(q) order by q.created_at desc,q.id),'[]') into v_rows from(
  select l.*, (select p.avatar_path from public.player_profiles p where p.id=l.owner_id) as owner_avatar_path from public.exchange_listings l
  where (case when p_tab='mine' then l.owner_id=v_uid else l.status='active' and l.side='sell' end)
  and l.side='sell' and l.offer->>'kind' in ('collectible','bait') and l.wanted->>'kind'='gold' and l.wanted->>'id'='gold'
 and (coalesce(l.title,'') ilike '%'||p_query||'%' or l.offer->>'name' ilike '%'||p_query||'%' or l.wanted->>'name' ilike '%'||p_query||'%')
  order by created_at desc,id limit 20 offset p_offset
 ) q;
 return jsonb_build_object('items',v_rows,'total',v_total);
end $function$
;
notify pgrst, 'reload schema';
commit;
