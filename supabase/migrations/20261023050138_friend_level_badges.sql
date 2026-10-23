begin;
create function app_private.friend_levels() returns jsonb
 language plpgsql stable security definer set search_path='' as $$
declare uid uuid:=auth.uid();result jsonb;
begin
 if uid is null then raise exception 'AUTH_REQUIRED';end if;
 with friends as (
  select distinct case when sender_id=uid then recipient_id else sender_id end friend_id
  from public.friend_requests where status='accepted' and (sender_id=uid or recipient_id=uid)
 )
 select coalesce(jsonb_agg(jsonb_build_object('friendId',f.friend_id,'level',floor((-1+sqrt(9+4*coalesce(e.total_xp,0)::numeric/25))/2)::integer) order by f.friend_id),'[]'::jsonb)
 into result from friends f left join app_private.player_experience e on e.user_id=f.friend_id;
 return result;
end $$;
create function public.friend_levels() returns jsonb language sql stable set search_path='' as $$select app_private.friend_levels()$$;
revoke all on function app_private.friend_levels(),public.friend_levels() from public,anon,authenticated;
grant execute on function app_private.friend_levels(),public.friend_levels() to authenticated;
notify pgrst,'reload schema';
commit;
