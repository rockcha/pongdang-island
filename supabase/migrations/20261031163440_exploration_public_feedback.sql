begin;

-- Public feedback belongs to authenticated players, independently of temporary run gold/items.
create table app_private.exploration_feedback (
 id uuid primary key,
 user_id uuid not null references public.player_profiles(id) on delete cascade,
 body text not null check (char_length(btrim(body,E' \t\n\r')) between 1 and 500),
 created_at timestamptz not null default now(),
 updated_at timestamptz not null default now(),
 deleted_at timestamptz
);
alter table app_private.exploration_feedback enable row level security;
revoke all on app_private.exploration_feedback from public, anon, authenticated;
create index exploration_feedback_visible_idx on app_private.exploration_feedback(created_at desc,id desc) where deleted_at is null;
create index exploration_feedback_author_time_idx on app_private.exploration_feedback(user_id,created_at desc);

create function app_private.exploration_feedback(p_offset integer default 0)
returns jsonb language plpgsql stable security definer set search_path='' as $$
declare u uuid:=auth.uid();op boolean;result jsonb;
begin
 if u is null then raise exception 'AUTH_REQUIRED';end if;
 if p_offset is null or p_offset<0 or p_offset>10000 then raise exception 'INVALID_FEEDBACK_PAGE';end if;
 op:=app_private.notice_is_operator();
 with page as (
  select c.*,p.nickname,p.avatar_path
  from app_private.exploration_feedback c join public.player_profiles p on p.id=c.user_id
  where c.deleted_at is null order by c.created_at desc,c.id desc offset p_offset limit 21
 ) select jsonb_build_object(
  'items',coalesce((select jsonb_agg(jsonb_build_object('id',r.id,'authorId',r.user_id,'nickname',r.nickname,'avatarPath',r.avatar_path,'body',r.body,'createdAt',r.created_at,'updatedAt',r.updated_at,'canEdit',r.user_id=u,'canDelete',r.user_id=u or op) order by r.created_at desc,r.id desc) from(select * from page order by created_at desc,id desc limit 20)r),'[]'::jsonb),
  'hasMore',(select count(*)>20 from page)
 ) into result;
 return result;
end $$;

create function app_private.exploration_feedback_action(p_action text,p_id uuid,p_body text default null)
returns uuid language plpgsql security definer set search_path='' as $$
declare u uuid:=auth.uid();r app_private.exploration_feedback;clean text:=btrim(p_body,E' \t\n\r');
begin
 if u is null then raise exception 'AUTH_REQUIRED';end if;
 if p_id is null or p_action is null or p_action not in ('add','edit','delete') then raise exception 'INVALID_FEEDBACK_ACTION';end if;
 if not exists(select 1 from public.player_profiles where id=u) then raise exception 'FEEDBACK_PROFILE_REQUIRED';end if;
 -- Serialize only this author's feedback requests; retries retain their original comment UUID.
 perform pg_catalog.pg_advisory_xact_lock(pg_catalog.hashtext('exploration_feedback'),pg_catalog.hashtext(u::text));
 select * into r from app_private.exploration_feedback where id=p_id for update;
 if p_action='delete' then
  if not found then return p_id;end if;
  if r.user_id<>u and not app_private.notice_is_operator() then raise exception 'FEEDBACK_FORBIDDEN';end if;
  update app_private.exploration_feedback set deleted_at=coalesce(deleted_at,clock_timestamp()) where id=p_id;
  return p_id;
 end if;
 if clean is null or char_length(clean) not between 1 and 500 then raise exception 'INVALID_FEEDBACK_BODY';end if;
 if p_action='edit' then
  if not found or r.deleted_at is not null then raise exception 'FEEDBACK_NOT_FOUND';end if;
  if r.user_id<>u then raise exception 'FEEDBACK_FORBIDDEN';end if;
  if r.body<>clean then update app_private.exploration_feedback set body=clean,updated_at=clock_timestamp() where id=p_id;end if;
  return p_id;
 end if;
 if found then
  if r.user_id<>u or r.body<>clean then raise exception 'OPERATION_CONFLICT';end if;
  return p_id;
 end if;
 if exists(select 1 from app_private.exploration_feedback where user_id=u and created_at>clock_timestamp()-interval '30 seconds')
  or (select count(*) from app_private.exploration_feedback where user_id=u and created_at>clock_timestamp()-interval '1 day')>=30
 then raise exception 'FEEDBACK_RATE_LIMIT';end if;
 insert into app_private.exploration_feedback(id,user_id,body) values(p_id,u,clean);
 return p_id;
end $$;

create function public.exploration_feedback(p_offset integer default 0)
returns jsonb language sql stable security invoker set search_path='' as $$select app_private.exploration_feedback(p_offset)$$;
create function public.exploration_feedback_action(p_action text,p_id uuid,p_body text default null)
returns uuid language sql security invoker set search_path='' as $$select app_private.exploration_feedback_action(p_action,p_id,p_body)$$;
revoke all on function app_private.exploration_feedback(integer),app_private.exploration_feedback_action(text,uuid,text),public.exploration_feedback(integer),public.exploration_feedback_action(text,uuid,text) from public,anon,authenticated;
grant usage on schema app_private to authenticated;
grant execute on function app_private.exploration_feedback(integer),app_private.exploration_feedback_action(text,uuid,text),public.exploration_feedback(integer),public.exploration_feedback_action(text,uuid,text) to authenticated;
notify pgrst,'reload schema';
commit;
