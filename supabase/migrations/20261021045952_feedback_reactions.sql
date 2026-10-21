begin;

create table app_private.feedback_suggestion_votes (
 post_id uuid not null references public.suggestion_posts(id) on delete cascade,
 user_id uuid not null references auth.users(id) on delete cascade,
 value smallint not null check (value in (-1,1)),
 primary key (post_id,user_id)
);
create index feedback_suggestion_votes_user_idx on app_private.feedback_suggestion_votes(user_id);
alter table app_private.feedback_suggestion_votes enable row level security;
revoke all on app_private.feedback_suggestion_votes from public,anon,authenticated;
grant select,insert,update,delete on app_private.feedback_suggestion_votes to authenticated;
create policy feedback_suggestion_votes_read on app_private.feedback_suggestion_votes for select to authenticated
 using (exists(select 1 from public.suggestion_posts p where p.id=post_id));
create policy feedback_suggestion_votes_insert on app_private.feedback_suggestion_votes for insert to authenticated
 with check (user_id=(select auth.uid()) and exists(select 1 from public.suggestion_posts p where p.id=post_id));
create policy feedback_suggestion_votes_update on app_private.feedback_suggestion_votes for update to authenticated
 using (user_id=(select auth.uid()) and exists(select 1 from public.suggestion_posts p where p.id=post_id))
 with check (user_id=(select auth.uid()) and exists(select 1 from public.suggestion_posts p where p.id=post_id));
create policy feedback_suggestion_votes_delete on app_private.feedback_suggestion_votes for delete to authenticated
 using (user_id=(select auth.uid()) and exists(select 1 from public.suggestion_posts p where p.id=post_id));

create table app_private.feedback_bug_votes (
 post_id uuid not null references public.bug_reports(id) on delete cascade,
 user_id uuid not null references auth.users(id) on delete cascade,
 value smallint not null check (value in (-1,1)),
 primary key (post_id,user_id)
);
create index feedback_bug_votes_user_idx on app_private.feedback_bug_votes(user_id);
alter table app_private.feedback_bug_votes enable row level security;
revoke all on app_private.feedback_bug_votes from public,anon,authenticated;
grant select,insert,update,delete on app_private.feedback_bug_votes to authenticated;
create policy feedback_bug_votes_read on app_private.feedback_bug_votes for select to authenticated
 using (exists(select 1 from public.bug_reports p where p.id=post_id));
create policy feedback_bug_votes_insert on app_private.feedback_bug_votes for insert to authenticated
 with check (user_id=(select auth.uid()) and exists(select 1 from public.bug_reports p where p.id=post_id));
create policy feedback_bug_votes_update on app_private.feedback_bug_votes for update to authenticated
 using (user_id=(select auth.uid()) and exists(select 1 from public.bug_reports p where p.id=post_id))
 with check (user_id=(select auth.uid()) and exists(select 1 from public.bug_reports p where p.id=post_id));
create policy feedback_bug_votes_delete on app_private.feedback_bug_votes for delete to authenticated
 using (user_id=(select auth.uid()) and exists(select 1 from public.bug_reports p where p.id=post_id));

-- Invoker functions retain the parent posts' existing RLS, including friends-only visibility.
create function public.feedback_reactions(p_kind text,p_ids uuid[])
returns jsonb language plpgsql stable security invoker set search_path='' as $$
declare result jsonb;
begin
 if auth.uid() is null then raise exception 'AUTH_REQUIRED'; end if;
 if p_ids is null or cardinality(p_ids)>20 then raise exception 'INVALID_FEEDBACK_IDS'; end if;
 if p_kind='suggestion' then
 select coalesce(jsonb_agg(jsonb_build_object('id',p.id,'likes',coalesce(v.likes,0),'dislikes',coalesce(v.dislikes,0),'my_reaction',coalesce(v.mine,0))),'[]'::jsonb) into result
 from public.suggestion_posts p left join lateral (
  select count(*) filter(where value=1) likes,count(*) filter(where value=-1) dislikes,
   max(value) filter(where user_id=auth.uid()) mine
  from app_private.feedback_suggestion_votes where post_id=p.id
 ) v on true where p.id=any(p_ids);
 elsif p_kind='bug' then
 select coalesce(jsonb_agg(jsonb_build_object('id',p.id,'likes',coalesce(v.likes,0),'dislikes',coalesce(v.dislikes,0),'my_reaction',coalesce(v.mine,0))),'[]'::jsonb) into result
 from public.bug_reports p left join lateral (
  select count(*) filter(where value=1) likes,count(*) filter(where value=-1) dislikes,
   max(value) filter(where user_id=auth.uid()) mine
  from app_private.feedback_bug_votes where post_id=p.id
 ) v on true where p.id=any(p_ids);
 else raise exception 'INVALID_FEEDBACK_KIND'; end if;
 return result;
end $$;

create function public.set_feedback_reaction(p_kind text,p_id uuid,p_value integer)
returns jsonb language plpgsql security invoker set search_path='' as $$
begin
 if auth.uid() is null then raise exception 'AUTH_REQUIRED'; end if;
 if p_value is null or p_value not in (-1,0,1) then raise exception 'INVALID_FEEDBACK_VALUE'; end if;
 if p_kind='suggestion' then
 if not exists(select 1 from public.suggestion_posts where id=p_id) then raise exception 'FEEDBACK_NOT_FOUND'; end if;
 if p_value=0 then
  delete from app_private.feedback_suggestion_votes where post_id=p_id and user_id=auth.uid();
 else
  insert into app_private.feedback_suggestion_votes(post_id,user_id,value) values(p_id,auth.uid(),p_value)
  on conflict(post_id,user_id) do update set value=excluded.value;
 end if;
 elsif p_kind='bug' then
 if not exists(select 1 from public.bug_reports where id=p_id) then raise exception 'FEEDBACK_NOT_FOUND'; end if;
 if p_value=0 then
  delete from app_private.feedback_bug_votes where post_id=p_id and user_id=auth.uid();
 else
  insert into app_private.feedback_bug_votes(post_id,user_id,value) values(p_id,auth.uid(),p_value)
  on conflict(post_id,user_id) do update set value=excluded.value;
 end if;
 else raise exception 'INVALID_FEEDBACK_KIND'; end if;
 return public.feedback_reactions(p_kind,array[p_id])->0;
end $$;
revoke all on function public.feedback_reactions(text,uuid[]) from public,anon,authenticated;
revoke all on function public.set_feedback_reaction(text,uuid,integer) from public,anon,authenticated;
grant execute on function public.feedback_reactions(text,uuid[]) to authenticated;
grant execute on function public.set_feedback_reaction(text,uuid,integer) to authenticated;
commit;
