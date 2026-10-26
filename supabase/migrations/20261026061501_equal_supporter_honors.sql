-- Keep stable pagination separate from the equal-amount honor tier.
create or replace function app_private.development_fund_state(p_offset integer default 0)
returns jsonb language plpgsql stable security definer set search_path = '' as $function$
declare u uuid:=auth.uid(); result jsonb;
begin
 if u is null then raise exception 'AUTH_REQUIRED';end if;
 if p_offset is null or p_offset<0 or p_offset>10000 then raise exception 'INVALID_FUND_PAGE';end if;
 with supporters as materialized (
  select r.user_id,sum(r.confirmed_won)::bigint total,min(r.confirmed_at) first_at
  from app_private.island_fund_reports r join public.player_profiles p on p.id=r.user_id
  where r.status='confirmed' and r.public_profile group by r.user_id
 ), ranked as (
  select s.*,
   row_number() over(order by total desc,first_at,user_id) position,
   dense_rank() over(order by total desc) honor_rank
  from supporters s
 ), page as (
  select jsonb_build_object('userId',s.user_id,'nickname',p.nickname,'avatarPath',p.avatar_path,
   'totalWon',s.total::text,'rank',s.honor_rank) value,s.position
  from ranked s join public.player_profiles p on p.id=s.user_id order by s.position offset p_offset limit 20
 ) select jsonb_build_object('operator',app_private.notice_is_operator(),
  'summary',jsonb_build_object('donationCount',(select count(*) from app_private.island_fund_reports where status='confirmed'),'totalWon',(select coalesce(sum(confirmed_won),0)::text from app_private.island_fund_reports where status='confirmed'),
    'supporterCount',(select count(distinct user_id) from app_private.island_fund_reports where status='confirmed')),
  'myPendingCount',(select count(*) from app_private.island_fund_reports where user_id=u and status='pending'),
  'supporters',coalesce((select jsonb_agg(value order by position) from page),'[]'::jsonb),
  'hasMore',(select count(*)>p_offset+20 from supporters)) into result;
 return result || jsonb_build_object('cheers',app_private.development_fund_cheers(0));
end $function$;

revoke all on function app_private.development_fund_state(integer) from public,anon;
grant execute on function app_private.development_fund_state(integer) to authenticated;
