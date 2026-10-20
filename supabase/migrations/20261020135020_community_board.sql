-- Community content is readable by signed-in players; all writes go through
-- authenticated RPCs so authorship, counters, replies and notifications are atomic.
create table public.board_posts (
  id uuid primary key default gen_random_uuid(),
  author_id uuid not null references public.player_profiles(id) on delete cascade,
  title text not null check (char_length(btrim(title)) between 1 and 80),
  body text not null check (char_length(btrim(body)) between 1 and 5000),
  images text[] not null default '{}' check (cardinality(images) <= 3),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index board_posts_recent on public.board_posts(created_at desc,id desc);
create index board_posts_author on public.board_posts(author_id,created_at desc);
create table public.board_comments (
  id uuid primary key default gen_random_uuid(),
  post_id uuid not null references public.board_posts(id) on delete cascade,
  author_id uuid not null references public.player_profiles(id) on delete cascade,
  parent_id uuid,
  body text not null check (char_length(body) <= 1000),
  deleted boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique(id,post_id),
  foreign key(parent_id,post_id) references public.board_comments(id,post_id) on delete cascade,
  check (deleted or char_length(btrim(body)) >= 1)
);
create index board_comments_post on public.board_comments(post_id,created_at desc,id desc);
create index board_comments_parent on public.board_comments(parent_id,post_id);
create index board_comments_author on public.board_comments(author_id,created_at desc);
create table public.board_reactions (
  user_id uuid not null references public.player_profiles(id) on delete cascade,
  post_id uuid not null references public.board_posts(id) on delete cascade,
  comment_id uuid,
  value smallint not null check (value in (-1,1)),
  created_at timestamptz not null default now(),
  unique nulls not distinct(user_id,post_id,comment_id),
  foreign key(comment_id,post_id) references public.board_comments(id,post_id) on delete cascade
);
create index board_reactions_post on public.board_reactions(post_id,value);
create index board_reactions_comment on public.board_reactions(comment_id,post_id,value);
alter table public.board_posts enable row level security;
alter table public.board_comments enable row level security;
alter table public.board_reactions enable row level security;
revoke all on public.board_posts,public.board_comments,public.board_reactions from public,anon,authenticated;
grant select on public.board_posts,public.board_comments to authenticated;
create policy board_posts_read on public.board_posts for select to authenticated using ((select auth.uid()) is not null);
create policy board_comments_read on public.board_comments for select to authenticated using ((select auth.uid()) is not null);

alter table public.notifications add column board_post_id uuid references public.board_posts(id) on delete cascade;
create index notifications_board_post on public.notifications(board_post_id) where board_post_id is not null;

create function app_private.board_post_json(p public.board_posts) returns jsonb
language sql stable security definer set search_path='' as $$
  select to_jsonb(p) || jsonb_build_object(
    'author_name',a.nickname,'avatar_path',a.avatar_path,'equipped_title',a.equipped_title,
    'likes',(select count(*) from public.board_reactions r where r.post_id=p.id and r.comment_id is null and r.value=1),
    'dislikes',(select count(*) from public.board_reactions r where r.post_id=p.id and r.comment_id is null and r.value=-1),
    'my_reaction',coalesce((select r.value from public.board_reactions r where r.post_id=p.id and r.comment_id is null and r.user_id=auth.uid()),0),
    'comment_count',(select count(*) from public.board_comments c where c.post_id=p.id and not c.deleted)
  ) from public.player_profiles a where a.id=p.author_id and auth.uid() is not null
$$;
revoke all on function app_private.board_post_json(public.board_posts) from public,anon,authenticated;

create function app_private.board_feed(p_sort text default 'latest',p_mine boolean default false,p_offset integer default 0) returns jsonb
language plpgsql stable security definer set search_path='' as $$
declare result jsonb;
begin
  if auth.uid() is null then raise exception 'AUTH_REQUIRED'; end if;
  if p_sort not in ('latest','popular') or p_offset<0 or p_offset>10000 then raise exception 'INVALID_BOARD_REQUEST'; end if;
  select jsonb_build_object('items',coalesce(jsonb_agg(q.item order by q.rank_order),'[]'::jsonb),
    'total',(select count(*) from public.board_posts p where not p_mine or p.author_id=auth.uid())) into result
  from (select app_private.board_post_json(p) item,row_number() over(order by
    case when p_sort='popular' then (select count(*) from public.board_reactions r where r.post_id=p.id and r.comment_id is null and r.value=1) end desc nulls last,p.created_at desc,p.id desc) rank_order
    from public.board_posts p where not p_mine or p.author_id=auth.uid()
    order by rank_order limit 20 offset p_offset) q;
  return result;
end $$;

create function app_private.board_detail(p_id uuid,p_offset integer default 0) returns jsonb
language plpgsql stable security definer set search_path='' as $$
declare result jsonb;
begin
  if auth.uid() is null then raise exception 'AUTH_REQUIRED'; end if;
  if p_offset<0 or p_offset>10000 then raise exception 'INVALID_BOARD_REQUEST'; end if;
  select app_private.board_post_json(p) into result from public.board_posts p where p.id=p_id;
  if result is null then return null; end if;
  return jsonb_build_object('post',result,'comments',coalesce((select jsonb_agg(q.item order by q.created_at desc,q.id desc) from (
    select c.id,c.created_at,to_jsonb(c)||jsonb_build_object(
      'author_name',a.nickname,'avatar_path',a.avatar_path,'equipped_title',a.equipped_title,
      'parent_author_name',pa.nickname,
      'likes',(select count(*) from public.board_reactions r where r.comment_id=c.id and r.value=1),
      'dislikes',(select count(*) from public.board_reactions r where r.comment_id=c.id and r.value=-1),
      'my_reaction',coalesce((select r.value from public.board_reactions r where r.comment_id=c.id and r.user_id=auth.uid()),0)
    ) item from public.board_comments c join public.player_profiles a on a.id=c.author_id
    left join public.board_comments parent on parent.id=c.parent_id left join public.player_profiles pa on pa.id=parent.author_id
    where c.post_id=p_id order by c.created_at desc,c.id desc limit 50 offset p_offset
  )q),'[]'::jsonb),'comment_total',(select count(*) from public.board_comments where post_id=p_id));
end $$;

create function app_private.board_action(p_action text,p_payload jsonb) returns uuid
language plpgsql security definer set search_path='' as $$
<<payload>>
declare uid uuid:=auth.uid(); pid uuid; cid uuid; target public.board_posts; comment public.board_comments;
  parent public.board_comments; actor text; choice smallint; previous smallint; images text[]; title text; body text;
begin
  if uid is null then raise exception 'AUTH_REQUIRED'; end if;
  select nickname into actor from public.player_profiles where id=uid;
  if actor is null then raise exception 'NICKNAME_REQUIRED'; end if;
  perform pg_advisory_xact_lock(hashtextextended(uid::text,4731));
  pid:=(p_payload->>'post_id')::uuid;
  if pid is null then raise exception 'INVALID_BOARD_REQUEST'; end if;
  if p_action='save' then
    select * into target from public.board_posts where id=pid for update;
    if found and target.author_id<>uid then raise exception 'NOT_ALLOWED'; end if;
    title:=btrim(p_payload->>'title'); body:=btrim(p_payload->>'body');
    if title is null or char_length(title) not between 1 and 80 or body is null or char_length(body) not between 1 and 5000 then raise exception 'INVALID_BOARD_REQUEST'; end if;
    select coalesce(array_agg(value),'{}'::text[]) into images from jsonb_array_elements_text(coalesce(p_payload->'images','[]'::jsonb));
    if cardinality(images)>3 or exists(select 1 from unnest(images) path where path !~ ('^'||uid::text||'/'||pid::text||'/[0-9a-f-]+\.(png|jpg|webp)$')) then raise exception 'INVALID_BOARD_IMAGE'; end if;
    if exists(select 1 from unnest(images) path where not exists(select 1 from storage.objects o where o.bucket_id='board-images' and o.name=path)) then raise exception 'INVALID_BOARD_IMAGE'; end if;
    if target.id is null then
      if (select count(*) from public.board_posts where author_id=uid and created_at>now()-interval '1 minute')>=3 then raise exception 'BOARD_RATE_LIMIT'; end if;
      insert into public.board_posts(id,author_id,title,body,images) values(pid,uid,title,body,images);
    else update public.board_posts set title=payload.title,body=payload.body,images=payload.images,updated_at=now() where id=pid; end if;
    return pid;
  end if;
  select * into target from public.board_posts where id=pid for update;
  if not found then raise exception 'BOARD_NOT_FOUND'; end if;
  if p_action='delete' then
    if target.author_id<>uid and not app_private.notice_is_operator() then raise exception 'NOT_ALLOWED'; end if;
    delete from public.board_posts where id=pid; return pid;
  elsif p_action='comment' then
    cid:=(p_payload->>'id')::uuid;
    if cid is null then raise exception 'INVALID_BOARD_REQUEST'; end if;
    select * into comment from public.board_comments where id=cid;
    if found then
      if comment.author_id<>uid or comment.post_id<>pid or comment.deleted then raise exception 'NOT_ALLOWED'; end if;
      return pid; -- Retry of the same comment must not send duplicate notifications.
    end if;
    body:=btrim(p_payload->>'body');
    if body is null or char_length(body) not between 1 and 1000 then raise exception 'INVALID_BOARD_REQUEST'; end if;
    if (select count(*) from public.board_comments where author_id=uid and created_at>now()-interval '1 minute')>=10 then raise exception 'BOARD_RATE_LIMIT'; end if;
    if nullif(p_payload->>'parent_id','') is not null then
      select * into parent from public.board_comments where id=(p_payload->>'parent_id')::uuid and post_id=pid;
      if not found or parent.parent_id is not null or parent.deleted then raise exception 'INVALID_BOARD_REPLY'; end if;
    end if;
    insert into public.board_comments(id,post_id,author_id,parent_id,body) values(cid,pid,uid,parent.id,body);
    insert into public.notifications(recipient_id,actor_id,category,kind,title,body,board_post_id)
      select recipient,uid,'general','system',case when parent.id is null then '내 글에 새 댓글이 달렸어요' else '새 답글이 달렸어요' end,
        left(actor||': '||body,500),pid from (select target.author_id recipient union select parent.author_id where parent.author_id is not null) recipients where recipient<>uid;
    return pid;
  elsif p_action='edit_comment' or p_action='delete_comment' then
    select * into comment from public.board_comments where id=(p_payload->>'id')::uuid and post_id=pid for update;
    if not found or comment.deleted then raise exception 'COMMENT_NOT_FOUND'; end if;
    if comment.author_id<>uid and not (p_action='delete_comment' and app_private.notice_is_operator()) then raise exception 'NOT_ALLOWED'; end if;
    if p_action='delete_comment' then update public.board_comments set body='',deleted=true,updated_at=now() where id=comment.id;
    else
      body:=btrim(p_payload->>'body');
      if body is null or char_length(body) not between 1 and 1000 then raise exception 'INVALID_BOARD_REQUEST'; end if;
      update public.board_comments set body=payload.body,updated_at=now() where id=comment.id;
    end if;
    return pid;
  elsif p_action='react' then
    choice:=(p_payload->>'value')::smallint; cid:=nullif(p_payload->>'comment_id','')::uuid;
    if choice is null or choice not in (-1,0,1) then raise exception 'INVALID_BOARD_REQUEST'; end if;
    if cid is not null and not exists(select 1 from public.board_comments where id=cid and post_id=pid and not deleted) then raise exception 'COMMENT_NOT_FOUND'; end if;
    -- Set the desired state, rather than toggling, so network retries are safe.
    if choice=0 then delete from public.board_reactions where user_id=uid and post_id=pid and comment_id is not distinct from cid;
    else insert into public.board_reactions(user_id,post_id,comment_id,value) values(uid,pid,cid,choice)
      on conflict(user_id,post_id,comment_id) do update set value=excluded.value;
    end if;
    return pid;
  end if;
  raise exception 'INVALID_BOARD_REQUEST';
end $$;

create function public.board_feed(p_sort text default 'latest',p_mine boolean default false,p_offset integer default 0) returns jsonb language sql stable security invoker set search_path='' as $$select app_private.board_feed(p_sort,p_mine,p_offset)$$;
create function public.board_detail(p_id uuid,p_offset integer default 0) returns jsonb language sql stable security invoker set search_path='' as $$select app_private.board_detail(p_id,p_offset)$$;
create function public.board_action(p_action text,p_payload jsonb) returns uuid language sql security invoker set search_path='' as $$select app_private.board_action(p_action,p_payload)$$;
revoke all on function app_private.board_feed(text,boolean,integer),app_private.board_detail(uuid,integer),app_private.board_action(text,jsonb),public.board_feed(text,boolean,integer),public.board_detail(uuid,integer),public.board_action(text,jsonb) from public,anon;
grant execute on function app_private.board_feed(text,boolean,integer),app_private.board_detail(uuid,integer),app_private.board_action(text,jsonb),public.board_feed(text,boolean,integer),public.board_detail(uuid,integer),public.board_action(text,jsonb) to authenticated;

insert into storage.buckets(id,name,public,file_size_limit,allowed_mime_types)
values('board-images','board-images',false,5242880,array['image/png','image/jpeg','image/webp']);
create policy board_images_read on storage.objects for select to authenticated using (
  bucket_id='board-images' and ((select auth.uid())::text=split_part(name,'/',1) or exists(select 1 from public.board_posts p where name=any(p.images)))
);
create policy board_images_upload on storage.objects for insert to authenticated with check (
  bucket_id='board-images' and (select auth.uid())::text=split_part(name,'/',1)
  and name ~ '^[0-9a-f-]{36}/[0-9a-f-]{36}/[0-9a-f-]+\.(png|jpg|webp)$'
);
create policy board_images_remove on storage.objects for delete to authenticated using (
  bucket_id='board-images' and (select auth.uid())::text=split_part(name,'/',1)
  and not exists(select 1 from public.board_posts p where name=any(p.images))
);
