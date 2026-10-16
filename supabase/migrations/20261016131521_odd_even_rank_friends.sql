-- Extend paid cashout rankings with the existing friend-request contract.
begin;
create or replace function app_private.odd_even_leaderboard(p_offset integer default 0) returns jsonb
language plpgsql security definer set search_path='' as $$
declare v_rows jsonb;v_total bigint;
begin
 if auth.uid() is null then raise exception 'AUTH_REQUIRED';end if;
 if p_offset is null or p_offset<0 then raise exception 'INVALID_OFFSET';end if;
 select count(distinct user_id) into v_total from public.odd_even_runs where stage='banked';
 select coalesce(jsonb_agg(to_jsonb(t) order by t.rank),'[]'::jsonb) into v_rows from (
  select row_number() over(order by r.stake desc,r.finished_at,r.id)+p_offset as rank,r.id,r.stake as gold,r.wins,
   coalesce(p.nickname,'섬 여행자') as nickname,r.user_id=auth.uid() as mine,
   r.user_id as "userId",p.friend_code as "friendCode",
   (select f.status from public.friend_requests f where f.status in ('pending','accepted')
    and ((f.sender_id=auth.uid() and f.recipient_id=r.user_id) or (f.recipient_id=auth.uid() and f.sender_id=r.user_id))
    order by f.created_at desc limit 1) as "friendStatus"
  from (select * from (select distinct on(user_id) * from public.odd_even_runs where stage='banked' order by user_id,stake desc,finished_at,id) best order by stake desc,finished_at,id limit 20 offset p_offset) r
  left join public.player_profiles p on p.id=r.user_id
 ) t;
 return jsonb_build_object('rows',v_rows,'total',v_total);
end $$;
revoke all on function app_private.odd_even_leaderboard(integer) from public,anon;
grant execute on function app_private.odd_even_leaderboard(integer) to authenticated;
notify pgrst,'reload schema';
commit;
