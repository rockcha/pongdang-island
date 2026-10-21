begin;
create table public.feedback_comments(
 id uuid primary key,
 suggestion_id uuid references public.suggestion_posts(id) on delete cascade,
 bug_id uuid references public.bug_reports(id) on delete cascade,
 author_id uuid not null references auth.users(id) on delete cascade,
 body text not null check(char_length(btrim(body)) between 1 and 500),
 created_at timestamptz not null default now(),
 updated_at timestamptz not null default now(),
 check(num_nonnulls(suggestion_id,bug_id)=1)
);
create index feedback_comments_suggestion on public.feedback_comments(suggestion_id,created_at,id) where suggestion_id is not null;
create index feedback_comments_bug on public.feedback_comments(bug_id,created_at,id) where bug_id is not null;
create index feedback_comments_author on public.feedback_comments(author_id);
alter table public.feedback_comments enable row level security;
revoke all on public.feedback_comments from public,anon,authenticated;

create function app_private.feedback_can_read(p_kind text,p_id uuid) returns boolean
language sql stable security definer set search_path='' as $$
 select auth.uid() is not null and case p_kind
 when 'bug' then exists(select 1 from public.bug_reports where id=p_id)
 when 'suggestion' then exists(select 1 from public.suggestion_posts p where p.id=p_id and (
  not p.friends_only or p.author_id=auth.uid() or app_private.notice_is_operator() or exists(
   select 1 from public.friend_requests f where f.status='accepted' and
   ((f.sender_id=auth.uid() and f.recipient_id=p.author_id) or (f.recipient_id=auth.uid() and f.sender_id=p.author_id))
  )
 )) else false end
$$;
revoke all on function app_private.feedback_can_read(text,uuid) from public,anon,authenticated;

create function app_private.feedback_comments(p_kind text,p_id uuid,p_offset integer default 0) returns jsonb
language plpgsql stable security definer set search_path='' as $$
declare result jsonb;total bigint;
begin
 if auth.uid() is null then raise exception 'AUTH_REQUIRED';end if;
 if p_offset is null or p_offset<0 or p_offset>100000 then raise exception 'INVALID_FEEDBACK_COMMENT';end if;
 if not app_private.feedback_can_read(p_kind,p_id) then raise exception 'FEEDBACK_NOT_FOUND';end if;
 select count(*) into total from public.feedback_comments c where case p_kind when 'suggestion' then c.suggestion_id=p_id else c.bug_id=p_id end;
 select coalesce(jsonb_agg(to_jsonb(t) order by t.created_at,t.id),'[]'::jsonb) into result from (
  select c.id,c.author_id,coalesce(p.nickname,'낚시꾼') author_name,p.avatar_path,c.body,c.created_at,c.updated_at
  from public.feedback_comments c left join public.player_profiles p on p.id=c.author_id
  where case p_kind when 'suggestion' then c.suggestion_id=p_id else c.bug_id=p_id end
  order by c.created_at,c.id limit 20 offset p_offset
 ) t;
 return jsonb_build_object('items',result,'total',total);
end $$;
create function public.feedback_comments(p_kind text,p_id uuid,p_offset integer default 0) returns jsonb
language sql stable set search_path='' as $$select app_private.feedback_comments(p_kind,p_id,p_offset)$$;

create function app_private.feedback_comment_action(p_kind text,p_id uuid,p_action text,p_comment_id uuid,p_body text default '') returns uuid
language plpgsql security definer set search_path='' as $$
declare u uuid:=auth.uid();c public.feedback_comments;
begin
 if u is null then raise exception 'AUTH_REQUIRED';end if;
 if p_comment_id is null or p_action is null or p_action not in ('add','edit','delete') then raise exception 'INVALID_FEEDBACK_COMMENT';end if;
 -- Lock the parent against concurrent deletion or visibility changes.
 if p_kind='suggestion' then perform 1 from public.suggestion_posts where id=p_id for share;
 elsif p_kind='bug' then perform 1 from public.bug_reports where id=p_id for share;
 else raise exception 'INVALID_FEEDBACK_COMMENT';end if;
 if not app_private.feedback_can_read(p_kind,p_id) then raise exception 'FEEDBACK_NOT_FOUND';end if;
 perform pg_advisory_xact_lock(hashtextextended('feedback-comment:'||p_comment_id::text,0));
 select * into c from public.feedback_comments where id=p_comment_id for update;
 if found then
  if (p_kind='suggestion' and c.suggestion_id is distinct from p_id) or (p_kind='bug' and c.bug_id is distinct from p_id) then raise exception 'FEEDBACK_COMMENT_FORBIDDEN';end if;
  if c.author_id<>u and not (p_action='delete' and app_private.notice_is_operator()) then raise exception 'FEEDBACK_COMMENT_FORBIDDEN';end if;
  if p_action='add' then
   if c.body is distinct from btrim(p_body) then raise exception 'OPERATION_CONFLICT';end if;
   return c.id;
  end if;
 elsif p_action='delete' then return p_comment_id;
 elsif p_action<>'add' then raise exception 'FEEDBACK_COMMENT_NOT_FOUND';
 end if;
 if p_action='delete' then delete from public.feedback_comments where id=p_comment_id;return p_comment_id;end if;
 if p_body is null or char_length(btrim(p_body)) not between 1 and 500 then raise exception 'INVALID_FEEDBACK_COMMENT';end if;
 if p_action='add' then
  insert into public.feedback_comments(id,suggestion_id,bug_id,author_id,body)
  values(p_comment_id,case when p_kind='suggestion' then p_id end,case when p_kind='bug' then p_id end,u,btrim(p_body));
 else update public.feedback_comments set body=btrim(p_body),updated_at=now() where id=p_comment_id;end if;
 return p_comment_id;
end $$;
create function public.feedback_comment_action(p_kind text,p_id uuid,p_action text,p_comment_id uuid,p_body text default '') returns uuid
language sql set search_path='' as $$select app_private.feedback_comment_action(p_kind,p_id,p_action,p_comment_id,p_body)$$;
revoke all on function app_private.feedback_comments(text,uuid,integer),public.feedback_comments(text,uuid,integer),app_private.feedback_comment_action(text,uuid,text,uuid,text),public.feedback_comment_action(text,uuid,text,uuid,text) from public,anon;
grant execute on function app_private.feedback_comments(text,uuid,integer),public.feedback_comments(text,uuid,integer),app_private.feedback_comment_action(text,uuid,text,uuid,text),public.feedback_comment_action(text,uuid,text,uuid,text) to authenticated;
notify pgrst,'reload schema';
commit;
