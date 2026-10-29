-- Hide completed/cancelled listings in both public and owner feeds before
-- pagination, retaining the transaction and escrow records unchanged.
create or replace function app_private.flea_state(p_side text default 'sell',p_query text default '',p_kind text default 'all',p_mine boolean default false,p_offset integer default 0)
returns jsonb language plpgsql stable security definer set search_path='' as $$
declare u uuid:=auth.uid();v_ids uuid[];v_total bigint;
begin
 if u is null then raise exception 'AUTH_REQUIRED';end if;
 if p_side is null or p_side not in ('sell','buy') or p_kind is null or p_kind not in ('all','fish','decoration','trash','fuel') or p_mine is null
 or p_offset is null or p_offset<0 or p_offset>100000 or p_query is null or char_length(p_query)>80 then raise exception 'INVALID_FLEA';end if;
 with matched as materialized (
  select p.id,p.created_at from app_private.flea_posts p
  where p.side=p_side and p.status='active' and (not p_mine or p.owner_id=u)
  and (btrim(p_query)='' or position(lower(btrim(p_query)) in lower(p.title))>0 or exists(
   select 1 from app_private.flea_lines l where l.post_id=p.id and position(replace(lower(btrim(p_query)),'연료','기름') in lower(l.asset->>'name'))>0))
  and (p_kind='all' or exists(select 1 from app_private.flea_lines l where l.post_id=p.id and
   (l.kind=p_kind or l.asset->>'subtype'=p_kind)))
 ) select (select count(*) from matched),(select array_agg(id order by created_at desc,id) from(select * from matched order by created_at desc,id limit 20 offset p_offset) q)
 into v_total,v_ids;
 return jsonb_build_object('items',coalesce((select jsonb_agg(app_private.flea_post_payload(id) order by ord) from unnest(v_ids) with ordinality q(id,ord)),'[]'::jsonb),'total',v_total);
end $$;
