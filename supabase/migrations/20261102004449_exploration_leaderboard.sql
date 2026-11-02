begin;
-- Rankings project only public player details and progress from authoritative runs.
-- No client score submission, weekly settlement, or wallet mutation is introduced.
create function app_private.exploration_leaderboard(p_offset integer default 0)
returns jsonb language plpgsql stable security definer set search_path='' as $$
declare u uuid:=auth.uid(); result jsonb;
begin
 if u is null then raise exception 'AUTH_REQUIRED';end if;
 if p_offset is null or p_offset<0 or p_offset>10000 then raise exception 'INVALID_RANKING_PAGE';end if;
 with progress as (
  select r.id,r.user_id,r.started_at,(r.model#>>'{state,market,floor}')::integer as floor,
   r.reward_gold=2000 and r.finished_at is not null as completed
  from app_private.exploration_runs r
  where r.revision>0 and r.model->>'version'='1' and r.model#>>'{state,mode}'='practice'
   and r.model#>>'{state,market,floor}' ~ '^([1-9]|[1-4][0-9]|50)$'
 ), personal as (
  select p.*,row_number() over(partition by user_id order by floor desc,completed desc,started_at,id) as personal_rank from progress p
 ), ranks as (
  select p.*,row_number() over(order by floor desc,completed desc,started_at,id) as rank from personal p where personal_rank=1
 ), page as (select * from ranks order by rank offset p_offset limit 20)
 select jsonb_build_object('total',(select count(*) from ranks),'offset',p_offset,'rows',coalesce((
  select jsonb_agg(jsonb_build_object(
   'id',p.id,'userId',p.user_id,'rank',p.rank,'floor',p.floor,'completed',p.completed,
   'nickname',coalesce(profile.nickname,'탐험가'),'avatarPath',profile.avatar_path,
   'level',app_private.player_level(p.user_id),'levelProgress',app_private.player_level_progress(p.user_id),
   'mine',p.user_id=u,'friendCode',profile.friend_code,
   'friendStatus',(select f.status from public.friend_requests f
    where f.status in ('pending','accepted') and ((f.sender_id=u and f.recipient_id=p.user_id) or (f.recipient_id=u and f.sender_id=p.user_id))
    order by f.created_at desc limit 1)
  ) order by p.rank) from page p left join public.player_profiles profile on profile.id=p.user_id
 ),'[]'::jsonb)) into result;
 return result;
end $$;
create function public.exploration_leaderboard(p_offset integer default 0)
returns jsonb language sql stable security invoker set search_path='' as $$select app_private.exploration_leaderboard(p_offset)$$;
revoke all on function app_private.exploration_leaderboard(integer),public.exploration_leaderboard(integer) from public,anon;
grant execute on function app_private.exploration_leaderboard(integer),public.exploration_leaderboard(integer) to authenticated;
notify pgrst,'reload schema';
commit;
