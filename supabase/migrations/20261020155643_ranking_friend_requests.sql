begin;
CREATE OR REPLACE FUNCTION app_private.arcade_weekly_leaderboard(p_game text, p_offset integer)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''
AS $function$
declare
 uid uuid:=auth.uid();
 week_start date:=date_trunc('week',clock_timestamp() at time zone 'Asia/Seoul')::date;
 rows jsonb;total bigint;
begin
 if uid is null then raise exception 'AUTH_REQUIRED';end if;
 if p_game is null or p_game not in('shadow','memory') or p_offset is null or p_offset<0 then raise exception 'INVALID_OFFSET';end if;
 select count(*) into total from app_private.arcade_weekly_rankings(p_game,week_start);
 select coalesce(jsonb_agg(jsonb_build_object('rank',r.rank,'id',r.run_id,'nickname',coalesce(p.nickname,'섬 여행자'),
 'mine',r.user_id=uid,'userId',r.user_id,'friendCode',p.friend_code,'friendStatus',(select f.status from public.friend_requests f where f.status in ('pending','accepted') and ((f.sender_id=uid and f.recipient_id=r.user_id) or (f.recipient_id=uid and f.sender_id=r.user_id)) order by f.created_at desc limit 1),'score',r.score,'elapsedMs',r.elapsed_ms,'moves',r.moves,'finishedAt',r.finished_at,
 'rewardGold',app_private.arcade_weekly_gold(r.rank)) order by r.rank),'[]'::jsonb) into rows
 from (select * from app_private.arcade_weekly_rankings(p_game,week_start) order by rank limit 20 offset p_offset) r
 left join public.player_profiles p on p.id=r.user_id;
 return jsonb_build_object('rows',rows,'total',total,'offset',p_offset,'pageSize',20,
 'weekStart',week_start::timestamp at time zone 'Asia/Seoul','weekEnd',(week_start+7)::timestamp at time zone 'Asia/Seoul',
 'rewards',jsonb_build_array(2000,1500,1000,650,400,200));
end $function$
;
CREATE OR REPLACE FUNCTION app_private.brick_leaderboard(p_offset integer DEFAULT 0)
 RETURNS jsonb
 LANGUAGE plpgsql
 STABLE SECURITY DEFINER
 SET search_path TO ''
AS $function$
declare v_uid uuid:=auth.uid();v_offset integer:=greatest(0,least(coalesce(p_offset,0),10000));v_result jsonb;
begin
 if v_uid is null then raise exception 'AUTH_REQUIRED';end if;
 with personal as (
  select r.*,row_number() over(partition by user_id order by reward desc,started_at,id) as personal_rank from public.brick_game_runs r where finished_at is not null and reward>0
 ), ranks as (
  select p.*,row_number() over(order by reward desc,started_at,id) as rank from personal p where personal_rank=1
 ), page as (select * from ranks order by rank offset v_offset limit 30)
 select jsonb_build_object('total',(select count(*) from ranks),'offset',v_offset,'rows',coalesce((select jsonb_agg(jsonb_build_object('id',p.id,'rank',p.rank,'gold',p.reward,'nickname',coalesce(u.nickname,'퐁이'),'mine',p.user_id=v_uid,'userId',p.user_id,'friendCode',u.friend_code,'friendStatus',(select f.status from public.friend_requests f where f.status in ('pending','accepted') and ((f.sender_id=v_uid and f.recipient_id=p.user_id) or (f.recipient_id=v_uid and f.sender_id=p.user_id)) order by f.created_at desc limit 1)) order by p.rank) from page p left join public.player_profiles u on u.id=p.user_id),'[]'::jsonb)) into v_result;
 return v_result;
end $function$
;
CREATE OR REPLACE FUNCTION app_private.ladder_leaderboard(p_offset integer DEFAULT 0)
 RETURNS jsonb
 LANGUAGE plpgsql
 STABLE SECURITY DEFINER
 SET search_path TO ''
AS $function$
declare v_result jsonb;
begin
 if auth.uid() is null then raise exception 'AUTH_REQUIRED';end if;
 if p_offset is null or p_offset<0 or p_offset>10000 then raise exception 'INVALID_OFFSET';end if;
 with personal as (
  select r.*,row_number() over(partition by user_id order by reward desc,created_at,id) rn from app_private.ladder_runs r where reward>0
 ), ranked as (
  select p.*,row_number() over(order by reward desc,created_at,id) rank from personal p where rn=1
 ), page as (select * from ranked order by rank offset p_offset limit 20)
 select jsonb_build_object('total',(select count(*) from ranked),'rows',coalesce((select jsonb_agg(jsonb_build_object('id',p.id,'rank',p.rank,'gold',p.reward,'nickname',coalesce(u.nickname,'섬 여행자'),'mine',p.user_id=auth.uid(),'userId',p.user_id,'friendCode',u.friend_code,'friendStatus',(select f.status from public.friend_requests f where f.status in ('pending','accepted') and ((f.sender_id=auth.uid() and f.recipient_id=p.user_id) or (f.recipient_id=auth.uid() and f.sender_id=p.user_id)) order by f.created_at desc limit 1)) order by p.rank) from page p left join public.player_profiles u on u.id=p.user_id),'[]'::jsonb)) into v_result;
 return v_result;
end $function$
;
notify pgrst,'reload schema';
commit;
