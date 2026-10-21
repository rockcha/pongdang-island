begin;

-- Only the avatar of an author of a readable post is exposed. Profile RLS stays unchanged.
create function app_private.feedback_authors(p_kind text,p_ids uuid[])
returns jsonb language plpgsql stable security definer set search_path='' as $$
declare actor uuid:=auth.uid(); result jsonb;
begin
 if actor is null then raise exception 'AUTH_REQUIRED'; end if;
 if p_ids is null or cardinality(p_ids)>20 then raise exception 'INVALID_FEEDBACK_IDS'; end if;
 if p_kind='suggestion' then
  select coalesce(jsonb_agg(jsonb_build_object('id',p.id,'avatar_path',a.avatar_path)),'[]'::jsonb) into result
  from public.suggestion_posts p left join public.player_profiles a on a.id=p.author_id
  where p.id=any(p_ids) and (
   not p.friends_only or p.author_id=actor or (select app_private.notice_is_operator()) or exists(
    select 1 from public.friend_requests f where f.status='accepted' and
    ((f.sender_id=actor and f.recipient_id=p.author_id) or (f.recipient_id=actor and f.sender_id=p.author_id))
   )
  );
 elsif p_kind='bug' then
  select coalesce(jsonb_agg(jsonb_build_object('id',p.id,'avatar_path',a.avatar_path)),'[]'::jsonb) into result
  from public.bug_reports p left join public.player_profiles a on a.id=p.author_id where p.id=any(p_ids);
 else raise exception 'INVALID_FEEDBACK_KIND'; end if;
 return result;
end $$;

create function public.feedback_authors(p_kind text,p_ids uuid[])
returns jsonb language sql stable security invoker set search_path='' as $$
 select app_private.feedback_authors(p_kind,p_ids)
$$;
revoke all on function app_private.feedback_authors(text,uuid[]) from public,anon,authenticated;
revoke all on function public.feedback_authors(text,uuid[]) from public,anon,authenticated;
grant execute on function app_private.feedback_authors(text,uuid[]) to authenticated;
grant execute on function public.feedback_authors(text,uuid[]) to authenticated;
commit;
