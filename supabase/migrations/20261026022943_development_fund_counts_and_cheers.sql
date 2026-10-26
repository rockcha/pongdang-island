begin;
create table app_private.island_fund_cheers(
 id uuid primary key,
 user_id uuid not null references auth.users(id) on delete cascade,
 body text not null check(char_length(btrim(body)) between 1 and 100),
 created_at timestamptz not null default clock_timestamp(),
 deleted_at timestamptz
);
create index island_fund_cheers_feed on app_private.island_fund_cheers(created_at desc,id) where deleted_at is null;
create index island_fund_cheers_owner on app_private.island_fund_cheers(user_id,created_at desc);
alter table app_private.island_fund_cheers enable row level security;
revoke all on app_private.island_fund_cheers from public,anon,authenticated;

create function app_private.development_fund_cheers(p_offset integer default 0)
returns jsonb language plpgsql stable security definer set search_path='' as $f$
declare u uuid:=auth.uid(); result jsonb;
begin
 if u is null then raise exception 'AUTH_REQUIRED';end if;
 if p_offset is null or p_offset<0 or p_offset>10000 then raise exception 'INVALID_FUND_PAGE';end if;
 with page as (
  select c.id,c.user_id,c.body,c.created_at,p.nickname,p.avatar_path
  from app_private.island_fund_cheers c join public.player_profiles p on p.id=c.user_id
  where c.deleted_at is null order by c.created_at desc,c.id offset p_offset limit 4
 ) select jsonb_build_object('items',coalesce((select jsonb_agg(jsonb_build_object('id',r.id,'nickname',r.nickname,
  'avatarPath',r.avatar_path,'body',r.body,'createdAt',r.created_at,'canDelete',r.user_id=u or app_private.notice_is_operator()) order by r.created_at desc,r.id)
  from(select * from page order by created_at desc,id limit 3)r),'[]'::jsonb),'hasMore',(select count(*)>3 from page)) into result;
 return result;
end $f$;

create function app_private.development_fund_cheer(p_id uuid,p_body text default null,p_delete boolean default false)
returns jsonb language plpgsql security definer set search_path='' as $f$
declare u uuid:=auth.uid(); r app_private.island_fund_cheers;
begin
 if u is null then raise exception 'AUTH_REQUIRED';end if;
 if p_id is null or p_delete is null then raise exception 'INVALID_FUND_CHEER';end if;
 -- Serialize each author's rate limit without touching gold or donation records.
 perform 1 from public.player_profiles where id=u for update;
 if not found then raise exception 'FUND_PROFILE_REQUIRED';end if;
 select * into r from app_private.island_fund_cheers where id=p_id for update;
 if p_delete then
  if not found then return jsonb_build_object('ok',true);end if;
  if r.user_id<>u and not app_private.notice_is_operator() then raise exception 'FUND_FORBIDDEN';end if;
  update app_private.island_fund_cheers set deleted_at=coalesce(deleted_at,clock_timestamp()) where id=p_id;
  return jsonb_build_object('ok',true);
 end if;
 if p_body is null or char_length(btrim(p_body)) not between 1 and 100 then raise exception 'INVALID_FUND_CHEER';end if;
 if found then
  if r.user_id<>u or r.body<>btrim(p_body) then raise exception 'OPERATION_CONFLICT';end if;
  return jsonb_build_object('ok',true);
 end if;
 if exists(select 1 from app_private.island_fund_cheers where user_id=u and created_at>clock_timestamp()-interval '30 seconds')
  or (select count(*) from app_private.island_fund_cheers where user_id=u and created_at>clock_timestamp()-interval '1 day')>=30
 then raise exception 'FUND_CHEER_LIMIT';end if;
 insert into app_private.island_fund_cheers(id,user_id,body) values(p_id,u,btrim(p_body));
 return jsonb_build_object('ok',true);
end $f$;

CREATE OR REPLACE FUNCTION app_private.development_fund_state(p_offset integer DEFAULT 0)
 RETURNS jsonb
 LANGUAGE plpgsql
 STABLE SECURITY DEFINER
 SET search_path TO ''
AS $function$
declare u uuid:=auth.uid(); result jsonb;
begin
 if u is null then raise exception 'AUTH_REQUIRED';end if;
 if p_offset is null or p_offset<0 or p_offset>10000 then raise exception 'INVALID_FUND_PAGE';end if;
 with supporters as materialized (
  select r.user_id,sum(r.confirmed_won)::bigint total,min(r.confirmed_at) first_at
  from app_private.island_fund_reports r join public.player_profiles p on p.id=r.user_id
  where r.status='confirmed' and r.public_profile group by r.user_id
 ), ranked as (
  select s.*,row_number() over(order by total desc,first_at,user_id) position from supporters s
 ), page as (
  select jsonb_build_object('userId',s.user_id,'nickname',p.nickname,'avatarPath',p.avatar_path,
   'totalWon',s.total::text,'rank',s.position) value,s.position
  from ranked s join public.player_profiles p on p.id=s.user_id order by s.position offset p_offset limit 20
 ) select jsonb_build_object('operator',app_private.notice_is_operator(),
  'summary',jsonb_build_object('donationCount',(select count(*) from app_private.island_fund_reports where status='confirmed'),'totalWon',(select coalesce(sum(confirmed_won),0)::text from app_private.island_fund_reports where status='confirmed'),
    'supporterCount',(select count(distinct user_id) from app_private.island_fund_reports where status='confirmed')),
  'myPendingCount',(select count(*) from app_private.island_fund_reports where user_id=u and status='pending'),
  'supporters',coalesce((select jsonb_agg(value order by position) from page),'[]'::jsonb),
  'hasMore',(select count(*)>p_offset+20 from supporters)) into result;
 return result || jsonb_build_object('cheers',app_private.development_fund_cheers(0));
end $function$
;

create function public.development_fund_cheers(p_offset integer default 0) returns jsonb language sql stable set search_path='' as $f$select app_private.development_fund_cheers(p_offset)$f$;
create function public.development_fund_cheer(p_id uuid,p_body text default null,p_delete boolean default false) returns jsonb language sql set search_path='' as $f$select app_private.development_fund_cheer(p_id,p_body,p_delete)$f$;
revoke all on function app_private.development_fund_cheers(integer),app_private.development_fund_cheer(uuid,text,boolean),public.development_fund_cheers(integer),public.development_fund_cheer(uuid,text,boolean) from public,anon;
grant execute on function app_private.development_fund_cheers(integer),app_private.development_fund_cheer(uuid,text,boolean),public.development_fund_cheers(integer),public.development_fund_cheer(uuid,text,boolean) to authenticated;
notify pgrst,'reload schema';
commit;
