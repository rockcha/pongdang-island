-- Reference prices are read-time metadata; never rewrite escrow snapshots or request identity.
begin;
create function app_private.trade_priced_asset(p_asset jsonb) returns jsonb language plpgsql stable set search_path='' as $$
declare result jsonb:=p_asset;
begin
 if p_asset->>'kind'='collectible' then
  result:=result||jsonb_build_object('sell_price',(select sell_price from public.collectible_species where id=p_asset->>'id' and kind in ('fish','trash','decoration')));
 end if;
 if jsonb_typeof(p_asset->'items')='array' then
  result:=result||jsonb_build_object('items',coalesce((select jsonb_agg(app_private.trade_priced_asset(value) order by ord) from jsonb_array_elements(p_asset->'items') with ordinality q(value,ord)),'[]'::jsonb));
 end if;
 return result;
end $$;
revoke all on function app_private.trade_priced_asset(jsonb) from public,anon,authenticated;
CREATE OR REPLACE FUNCTION app_private.exchange_inventory()
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''
AS $function$
declare v_uid uuid:=auth.uid();
begin
 if v_uid is null then raise exception 'AUTH_REQUIRED';end if;
 perform app_private.get_gold_wallet();
 return jsonb_build_object('gold',(select gold from public.player_wallets where user_id=v_uid),
 'assets',coalesce((select jsonb_agg(app_private.exchange_asset('collectible',s.id,1)||jsonb_build_object('sell_price',s.sell_price,'available',(
  select count(*) from public.player_collectibles c where c.user_id=v_uid and c.species_id=s.id and c.sold_at is null and c.escrow_gift_id is null and c.tank_id is null
 ))) from public.collectible_species s where s.kind in ('fish','trash','decoration') and s.id not like 'test-%'),'[]'::jsonb)||
jsonb_build_array(app_private.exchange_asset('fuel','fuel',1)||jsonb_build_object('available',(select coalesce((inventory->>'fuel')::integer,0) from public.player_wallets where user_id=v_uid))));
end $function$
;
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
 and l.side='sell' and l.offer->>'kind' in ('collectible','bait','fuel') and l.wanted->>'kind'='gold' and l.wanted->>'id'='gold'
 and (coalesce(l.title,'') ilike '%'||p_query||'%' or l.offer->>'name' ilike '%'||p_query||'%' or l.wanted->>'name' ilike '%'||p_query||'%');
 select coalesce(jsonb_agg(to_jsonb(q)||jsonb_build_object('offer',app_private.trade_priced_asset(q.offer)) order by q.created_at desc,q.id),'[]') into v_rows from(
  select l.*,(select p.avatar_path from public.player_profiles p where p.id=l.owner_id) as owner_avatar_path,
   (select count(*) from public.exchange_listing_likes s where s.listing_id=l.id) as like_count,
   (select count(*) from public.exchange_listing_comments c where c.listing_id=l.id) as comment_count
  from public.exchange_listings l
  where (case when p_tab='mine' then l.owner_id=v_uid else l.status='active' and l.side='sell' end)
  and l.side='sell' and l.offer->>'kind' in ('collectible','bait','fuel') and l.wanted->>'kind'='gold' and l.wanted->>'id'='gold'
  and (coalesce(l.title,'') ilike '%'||p_query||'%' or l.offer->>'name' ilike '%'||p_query||'%' or l.wanted->>'name' ilike '%'||p_query||'%')
  order by l.created_at desc,l.id limit 20 offset p_offset
 ) q;
 return jsonb_build_object('items',v_rows,'total',v_total);
end;
$function$
;
CREATE OR REPLACE FUNCTION app_private.exchange_listing_detail(p_listing_id uuid, p_offset integer DEFAULT 0)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''
AS $function$
declare u uuid:=auth.uid();l public.exchange_listings;v_listing jsonb;v_comments jsonb;
begin
 if u is null then raise exception 'AUTH_REQUIRED';end if;
 if p_offset is null or p_offset<0 then raise exception 'INVALID_EXCHANGE';end if;
 select * into l from public.exchange_listings where id=p_listing_id and side='sell'
  and (status in ('active','completed') or owner_id=u);
 if not found then raise exception 'EXCHANGE_NOT_FOUND';end if;
 select (to_jsonb(l)-'operation_id'-'escrow_gift_id')||jsonb_build_object(
  'offer',app_private.trade_priced_asset(l.offer),'owner_avatar_path',(select avatar_path from public.player_profiles where id=l.owner_id),
  'like_count',(select count(*) from public.exchange_listing_likes where listing_id=l.id),
  'comment_count',(select count(*) from public.exchange_listing_comments where listing_id=l.id),
  'liked',exists(select 1 from public.exchange_listing_likes where listing_id=l.id and user_id=u)
 ) into v_listing;
 select coalesce(jsonb_agg(to_jsonb(q) order by q.created_at asc,q.id asc),'[]'::jsonb) into v_comments from(
  select c.id,c.user_id,c.body,c.created_at,p.nickname as author_name,p.avatar_path as author_avatar_path
  from public.exchange_listing_comments c join public.player_profiles p on p.id=c.user_id
  where c.listing_id=l.id order by c.created_at asc,c.id asc limit 30 offset p_offset
 ) q;
 return jsonb_build_object('listing',v_listing,'comments',v_comments,'pageSize',30);
end;
$function$
;
CREATE OR REPLACE FUNCTION app_private.flea_post_payload(p_id uuid)
 RETURNS jsonb
 LANGUAGE sql
 STABLE
 SET search_path TO ''
AS $function$
 select jsonb_build_object('id',p.id,'owner_id',p.owner_id,'owner_name',u.nickname,'owner_avatar_path',u.avatar_path,
 'side',p.side,'title',p.title,'status',p.status,'escrow_gold',p.escrow_gold,'created_at',p.created_at,
 'items',coalesce((select jsonb_agg(jsonb_build_object('id',l.id,'asset',app_private.trade_priced_asset(l.asset),'quantity',l.quantity,
 'remaining',l.remaining,'unit_price',l.unit_price) order by l.kind,l.item_id) from app_private.flea_lines l where l.post_id=p.id),'[]'::jsonb))
 from app_private.flea_posts p join public.player_profiles u on u.id=p.owner_id where p.id=p_id
$function$
;
notify pgrst,'reload schema';
commit;
