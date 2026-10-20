begin;
create table public.exchange_listing_likes(
 listing_id uuid not null references public.exchange_listings(id) on delete cascade,
 user_id uuid not null references auth.users(id) on delete cascade,
 created_at timestamptz not null default clock_timestamp(),
 primary key(listing_id,user_id)
);
create index exchange_listing_likes_user on public.exchange_listing_likes(user_id);
create table public.exchange_listing_comments(
 id uuid primary key default gen_random_uuid(),
 listing_id uuid not null references public.exchange_listings(id) on delete cascade,
 user_id uuid not null references auth.users(id) on delete cascade,
 operation_id uuid not null,
 body text not null check(char_length(btrim(body)) between 1 and 500 and body~'[^[:space:]]'),
 created_at timestamptz not null default clock_timestamp(),
 unique(user_id,operation_id)
);
create index exchange_listing_comments_page on public.exchange_listing_comments(listing_id,created_at,id);
alter table public.exchange_listing_likes enable row level security;
alter table public.exchange_listing_comments enable row level security;
-- No direct client access: read/write APIs enforce listing visibility and ownership.
revoke all on public.exchange_listing_likes,public.exchange_listing_comments from public,anon,authenticated;

create function app_private.exchange_listing_detail(p_listing_id uuid,p_offset integer default 0)
returns jsonb language plpgsql security definer set search_path=''
as $$
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
 select coalesce(jsonb_agg(to_jsonb(q) order by q.created_at desc,q.id desc),'[]'::jsonb) into v_comments from(
  select c.id,c.user_id,c.body,c.created_at,p.nickname as author_name,p.avatar_path as author_avatar_path
  from public.exchange_listing_comments c join public.player_profiles p on p.id=c.user_id
  where c.listing_id=l.id order by c.created_at desc,c.id desc limit 30 offset p_offset
 ) q;
 return jsonb_build_object('listing',v_listing,'comments',v_comments,'pageSize',30);
end;
$$;

create function app_private.set_exchange_listing_like(p_listing_id uuid,p_liked boolean)
returns jsonb language plpgsql security definer set search_path=''
as $$
declare u uuid:=auth.uid();l public.exchange_listings;
begin
 if u is null then raise exception 'AUTH_REQUIRED';end if;
 if p_liked is null then raise exception 'INVALID_EXCHANGE';end if;
 select * into l from public.exchange_listings where id=p_listing_id and side='sell' and status in ('active','completed') for share;
 if not found then raise exception 'EXCHANGE_UNAVAILABLE';end if;
 perform pg_advisory_xact_lock(hashtextextended('exchange-like:'||p_listing_id::text||':'||u::text,0));
 if p_liked then insert into public.exchange_listing_likes(listing_id,user_id) values(l.id,u) on conflict do nothing;
 else delete from public.exchange_listing_likes where listing_id=l.id and user_id=u;end if;
 return jsonb_build_object('liked',p_liked,'like_count',(select count(*) from public.exchange_listing_likes where listing_id=l.id));
end;
$$;

create function app_private.add_exchange_listing_comment(p_listing_id uuid,p_body text,p_operation_id uuid)
returns uuid language plpgsql security definer set search_path=''
as $$
declare u uuid:=auth.uid();c public.exchange_listing_comments;
begin
 if u is null then raise exception 'AUTH_REQUIRED';end if;
 if p_operation_id is null or p_body is null or char_length(btrim(p_body)) not between 1 and 500 or p_body!~'[^[:space:]]' then raise exception 'INVALID_EXCHANGE_COMMENT';end if;
 perform 1 from public.exchange_listings where id=p_listing_id and side='sell' and status in ('active','completed') for share;
 if not found then raise exception 'EXCHANGE_UNAVAILABLE';end if;
 insert into public.exchange_listing_comments(listing_id,user_id,operation_id,body)
 values(p_listing_id,u,p_operation_id,btrim(p_body)) on conflict(user_id,operation_id) do nothing;
 select * into strict c from public.exchange_listing_comments where user_id=u and operation_id=p_operation_id;
 if c.listing_id<>p_listing_id or c.body<>btrim(p_body) then raise exception 'OPERATION_CONFLICT';end if;
 return c.id;
end;
$$;

create function app_private.delete_exchange_listing_comment(p_comment_id uuid)
returns void language plpgsql security definer set search_path=''
as $$
declare u uuid:=auth.uid();c public.exchange_listing_comments;
begin
 if u is null then raise exception 'AUTH_REQUIRED';end if;
 select * into c from public.exchange_listing_comments where id=p_comment_id for update;
 if not found then return;end if;
 if c.user_id<>u then raise exception 'EXCHANGE_COMMENT_FORBIDDEN';end if;
 delete from public.exchange_listing_comments where id=c.id;
end;
$$;

create or replace function app_private.exchange_state(p_tab text default 'all',p_query text default '',p_offset integer default 0)
returns jsonb language plpgsql security definer set search_path=''
as $$
declare v_uid uuid:=auth.uid();v_rows jsonb;v_total integer;
begin
 if v_uid is null then raise exception 'AUTH_REQUIRED';end if;
 if p_tab is null or p_tab not in ('all','mine') or p_query is null or char_length(p_query)>80 or p_offset is null or p_offset<0 then raise exception 'INVALID_EXCHANGE';end if;
 select count(*) into v_total from public.exchange_listings l
 where (case when p_tab='mine' then l.owner_id=v_uid else l.status='active' and l.side='sell' end)
 and l.side='sell' and l.offer->>'kind' in ('collectible','bait','fuel') and l.wanted->>'kind'='gold' and l.wanted->>'id'='gold'
 and (coalesce(l.title,'') ilike '%'||p_query||'%' or l.offer->>'name' ilike '%'||p_query||'%' or l.wanted->>'name' ilike '%'||p_query||'%');
 select coalesce(jsonb_agg(to_jsonb(q) order by q.created_at desc,q.id),'[]') into v_rows from(
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
$$;

create function public.exchange_listing_detail(p_listing_id uuid,p_offset integer default 0) returns jsonb
language sql security invoker set search_path='' as $$select app_private.exchange_listing_detail(p_listing_id,p_offset)$$;
create function public.set_exchange_listing_like(p_listing_id uuid,p_liked boolean) returns jsonb
language sql security invoker set search_path='' as $$select app_private.set_exchange_listing_like(p_listing_id,p_liked)$$;
create function public.add_exchange_listing_comment(p_listing_id uuid,p_body text,p_operation_id uuid) returns uuid
language sql security invoker set search_path='' as $$select app_private.add_exchange_listing_comment(p_listing_id,p_body,p_operation_id)$$;
create function public.delete_exchange_listing_comment(p_comment_id uuid) returns void
language sql security invoker set search_path='' as $$select app_private.delete_exchange_listing_comment(p_comment_id)$$;
revoke all on function app_private.exchange_listing_detail(uuid,integer),app_private.set_exchange_listing_like(uuid,boolean),app_private.add_exchange_listing_comment(uuid,text,uuid),app_private.delete_exchange_listing_comment(uuid),public.exchange_listing_detail(uuid,integer),public.set_exchange_listing_like(uuid,boolean),public.add_exchange_listing_comment(uuid,text,uuid),public.delete_exchange_listing_comment(uuid) from public,anon;
grant execute on function app_private.exchange_listing_detail(uuid,integer),app_private.set_exchange_listing_like(uuid,boolean),app_private.add_exchange_listing_comment(uuid,text,uuid),app_private.delete_exchange_listing_comment(uuid),public.exchange_listing_detail(uuid,integer),public.set_exchange_listing_like(uuid,boolean),public.add_exchange_listing_comment(uuid,text,uuid),public.delete_exchange_listing_comment(uuid) to authenticated;
notify pgrst,'reload schema';
commit;
