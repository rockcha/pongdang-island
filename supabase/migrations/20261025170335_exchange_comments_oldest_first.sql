-- Order before pagination, with a stable tie-breaker for equal timestamps.
create or replace function app_private.exchange_listing_detail(p_listing_id uuid,p_offset integer default 0)
returns jsonb language plpgsql security definer set search_path='' as $function$
declare u uuid:=auth.uid();l public.exchange_listings;v_listing jsonb;v_comments jsonb;
begin
 if u is null then raise exception 'AUTH_REQUIRED';end if;
 if p_offset is null or p_offset<0 then raise exception 'INVALID_EXCHANGE';end if;
 select * into l from public.exchange_listings where id=p_listing_id and side='sell'
  and (status in ('active','completed') or owner_id=u);
 if not found then raise exception 'EXCHANGE_NOT_FOUND';end if;
 select (to_jsonb(l)-'operation_id'-'escrow_gift_id')||jsonb_build_object(
  'owner_avatar_path',(select avatar_path from public.player_profiles where id=l.owner_id),
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
$function$;
notify pgrst,'reload schema';
