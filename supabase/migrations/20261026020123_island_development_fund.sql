begin;
create table app_private.island_fund_reports (
 id uuid primary key,
 user_id uuid references auth.users(id) on delete set null,
 depositor_name text not null check(char_length(btrim(depositor_name)) between 1 and 40),
 reported_won integer not null check(reported_won between 1 and 1000000000),
 remitted_at timestamptz not null check(isfinite(remitted_at)),
 message text not null default '' check(char_length(message)<=200),
 public_profile boolean not null default false,
 status text not null default 'pending' check(status in('pending','confirmed','rejected')),
 confirmed_won integer check(confirmed_won between 1 and 1000000000),
 confirmed_at timestamptz,
 reviewed_by uuid references auth.users(id) on delete set null,
 review_reason text not null default '' check(char_length(review_reason)<=200),
 bank_reference text check(char_length(bank_reference) between 1 and 100),
 revision integer not null default 0 check(revision>=0),
 created_at timestamptz not null default clock_timestamp(),
 updated_at timestamptz not null default clock_timestamp(),
 check((status='confirmed' and confirmed_won is not null and confirmed_at is not null)
  or(status<>'confirmed' and confirmed_won is null and confirmed_at is null))
);
create index island_fund_owner_history on app_private.island_fund_reports(user_id,created_at desc,id);
create index island_fund_review_queue on app_private.island_fund_reports(status,created_at desc,id);
create index island_fund_public_confirmed on app_private.island_fund_reports(user_id,confirmed_at) where status='confirmed' and public_profile;
create unique index island_fund_bank_reference on app_private.island_fund_reports(bank_reference) where status='confirmed' and bank_reference is not null;
create table app_private.island_fund_reviews (
 operation_id uuid primary key,
 report_id uuid not null references app_private.island_fund_reports(id),
 reviewer_id uuid references auth.users(id) on delete set null,
 signature jsonb not null,
 before_status text not null,
 after_status text not null,
 before_won integer,
 after_won integer,
 created_at timestamptz not null default clock_timestamp()
);
create index island_fund_reviews_report on app_private.island_fund_reviews(report_id,created_at);
alter table app_private.island_fund_reports enable row level security;
alter table app_private.island_fund_reviews enable row level security;
revoke all on app_private.island_fund_reports,app_private.island_fund_reviews from public,anon,authenticated;

create function app_private.development_fund_report_payload(r app_private.island_fund_reports)
returns jsonb language sql stable set search_path='' as $f$
 select jsonb_build_object('id',r.id,'userId',r.user_id,'depositorName',r.depositor_name,'reportedWon',r.reported_won,
  'remittedAt',r.remitted_at,'message',r.message,'publicProfile',r.public_profile,'status',r.status,
  'confirmedWon',r.confirmed_won,'confirmedAt',r.confirmed_at,'reviewReason',r.review_reason,
  'revision',r.revision,'createdAt',r.created_at,'updatedAt',r.updated_at,
  'nickname',(select nickname from public.player_profiles where id=r.user_id),
  'avatarPath',(select avatar_path from public.player_profiles where id=r.user_id))
$f$;

create function app_private.development_fund_state(p_offset integer default 0)
returns jsonb language plpgsql stable security definer set search_path='' as $f$
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
  'summary',jsonb_build_object('totalWon',(select coalesce(sum(confirmed_won),0)::text from app_private.island_fund_reports where status='confirmed'),
    'supporterCount',(select count(distinct user_id) from app_private.island_fund_reports where status='confirmed')),
  'myPendingCount',(select count(*) from app_private.island_fund_reports where user_id=u and status='pending'),
  'supporters',coalesce((select jsonb_agg(value order by position) from page),'[]'::jsonb),
  'hasMore',(select count(*)>p_offset+20 from supporters)) into result;
 return result;
end $f$;

create function app_private.development_fund_reports(p_status text default 'mine',p_offset integer default 0)
returns jsonb language plpgsql stable security definer set search_path='' as $f$
declare u uuid:=auth.uid(); result jsonb;
begin
 if u is null then raise exception 'AUTH_REQUIRED';end if;
 if p_status is null or p_status not in('mine','pending','confirmed','rejected') or p_offset is null or p_offset<0 or p_offset>10000 then raise exception 'INVALID_FUND_PAGE';end if;
 if p_status<>'mine' and not app_private.notice_is_operator() then raise exception 'FUND_FORBIDDEN';end if;
 with page as (
  select r.* from app_private.island_fund_reports r
  where (p_status='mine' and user_id=u) or(p_status<>'mine' and status=p_status)
  order by created_at desc,id offset p_offset limit 21
 ) select jsonb_build_object('items',coalesce((select jsonb_agg(app_private.development_fund_report_payload(r) order by r.created_at desc,r.id)
  from(select * from page order by created_at desc,id limit 20)r),'[]'::jsonb),'hasMore',(select count(*)>20 from page)) into result;
 return result;
end $f$;

create function app_private.development_fund_submit(p_id uuid,p_depositor_name text,p_reported_won integer,p_remitted_at timestamptz,p_message text default '',p_public_profile boolean default false)
returns jsonb language plpgsql security definer set search_path='' as $f$
declare u uuid:=auth.uid(); r app_private.island_fund_reports;
begin
 if u is null then raise exception 'AUTH_REQUIRED';end if;
 if p_id is null or p_depositor_name is null or char_length(btrim(p_depositor_name)) not between 1 and 40
  or p_reported_won is null or p_reported_won not between 1 and 1000000000 or p_remitted_at is null or not isfinite(p_remitted_at)
  or p_remitted_at>clock_timestamp()+interval '10 minutes' or p_message is null or char_length(p_message)>200 or p_public_profile is null
 then raise exception 'INVALID_FUND_REPORT';end if;
 -- Serialize an owner's submissions without touching a game wallet or granting
 -- any game currency. Replayed IDs remain stable after operator review too.
 perform 1 from public.player_profiles where id=u for update;
 if not found then raise exception 'FUND_PROFILE_REQUIRED';end if;
 select * into r from app_private.island_fund_reports where id=p_id;
 if found then
  if r.user_id is distinct from u or r.depositor_name<>btrim(p_depositor_name) or r.reported_won<>p_reported_won
   or r.remitted_at<>p_remitted_at or r.message<>btrim(p_message) or r.public_profile<>p_public_profile then raise exception 'OPERATION_CONFLICT';end if;
  return app_private.development_fund_report_payload(r);
 end if;
 if (select count(*) from app_private.island_fund_reports where user_id=u and created_at>clock_timestamp()-interval '1 day')>=20 then raise exception 'FUND_REPORT_LIMIT';end if;
 insert into app_private.island_fund_reports(id,user_id,depositor_name,reported_won,remitted_at,message,public_profile)
 values(p_id,u,btrim(p_depositor_name),p_reported_won,p_remitted_at,btrim(p_message),p_public_profile) returning * into r;
 return app_private.development_fund_report_payload(r);
end $f$;

create function app_private.development_fund_review(p_operation_id uuid,p_id uuid,p_action text,p_revision integer,p_confirmed_won integer default null,p_reason text default '',p_bank_reference text default null)
returns jsonb language plpgsql security definer set search_path='' as $f$
declare u uuid:=auth.uid(); r app_private.island_fund_reports; prior app_private.island_fund_reviews; sig jsonb; amount integer; reference text; old_status text; old_won integer;
begin
 if u is null then raise exception 'AUTH_REQUIRED';end if;
 if not app_private.notice_is_operator() then raise exception 'FUND_FORBIDDEN';end if;
 if p_operation_id is null or p_id is null or p_action is null or p_action not in('confirm','reject','reopen') or p_revision is null or p_revision<0
  or p_reason is null or char_length(p_reason)>200 or (p_bank_reference is not null and char_length(btrim(p_bank_reference))>100)
  or (p_action='confirm' and (p_confirmed_won is null or p_confirmed_won not between 1 and 1000000000))
 then raise exception 'INVALID_FUND_REVIEW';end if;
 reference:=nullif(btrim(p_bank_reference),'');
 sig:=jsonb_build_object('id',p_id,'action',p_action,'revision',p_revision,'amount',p_confirmed_won,'reason',btrim(p_reason),'bankReference',reference);
 select * into r from app_private.island_fund_reports where id=p_id for update;
 if not found then raise exception 'FUND_NOT_FOUND';end if;
 select * into prior from app_private.island_fund_reviews where operation_id=p_operation_id;
 if found then
  if prior.reviewer_id is distinct from u or prior.signature<>sig then raise exception 'OPERATION_CONFLICT';end if;
  return app_private.development_fund_report_payload(r);
 end if;
 if r.revision<>p_revision then raise exception 'FUND_REPORT_CHANGED';end if;
 if (p_action='confirm' and r.status='confirmed') or(p_action='reject' and r.status='rejected') or(p_action='reopen' and r.status='pending') then raise exception 'FUND_REPORT_CHANGED';end if;
 if p_action='confirm' and reference is not null and exists(select 1 from app_private.island_fund_reports where bank_reference=reference and status='confirmed' and id<>p_id) then raise exception 'FUND_DUPLICATE_TRANSFER';end if;
 old_status:=r.status;old_won:=r.confirmed_won;amount:=case when p_action='confirm' then p_confirmed_won else null end;
 update app_private.island_fund_reports set status=case p_action when 'confirm' then 'confirmed' when 'reject' then 'rejected' else 'pending' end,
  confirmed_won=amount,confirmed_at=case when p_action='confirm' then clock_timestamp() else null end,
  reviewed_by=u,review_reason=btrim(p_reason),bank_reference=reference,revision=revision+1,updated_at=clock_timestamp()
 where id=p_id returning * into r;
 insert into app_private.island_fund_reviews(operation_id,report_id,reviewer_id,signature,before_status,after_status,before_won,after_won)
 values(p_operation_id,p_id,u,sig,old_status,r.status,old_won,amount);
 if r.user_id is not null then
  insert into public.notifications(recipient_id,category,kind,title,body)
  values(r.user_id,'general','system',case p_action when 'confirm' then '발전기금 후원을 확인했어요' when 'reject' then '발전기금 신고를 확인해주세요' else '발전기금 후원을 다시 확인하고 있어요' end,
   case when p_action='confirm' then amount||'원 후원을 확인했어요. 퐁당섬의 내일을 응원해주셔서 고맙습니다.'
    when p_action='reject' then coalesce(nullif(btrim(p_reason),''),'입금 내역과 신고 정보가 일치하지 않아 확인을 보류했어요. 입금 정보를 확인해주세요.')
    else '후원 내역을 확인 대기로 변경했어요. 운영자가 다시 확인할 예정이에요.' end);
 end if;
 return app_private.development_fund_report_payload(r);
end $f$;

create function public.development_fund_state(p_offset integer default 0) returns jsonb language sql stable set search_path='' as $f$select app_private.development_fund_state(p_offset)$f$;
create function public.development_fund_reports(p_status text default 'mine',p_offset integer default 0) returns jsonb language sql stable set search_path='' as $f$select app_private.development_fund_reports(p_status,p_offset)$f$;
create function public.development_fund_submit(p_id uuid,p_depositor_name text,p_reported_won integer,p_remitted_at timestamptz,p_message text default '',p_public_profile boolean default false) returns jsonb language sql set search_path='' as $f$select app_private.development_fund_submit(p_id,p_depositor_name,p_reported_won,p_remitted_at,p_message,p_public_profile)$f$;
create function public.development_fund_review(p_operation_id uuid,p_id uuid,p_action text,p_revision integer,p_confirmed_won integer default null,p_reason text default '',p_bank_reference text default null) returns jsonb language sql set search_path='' as $f$select app_private.development_fund_review(p_operation_id,p_id,p_action,p_revision,p_confirmed_won,p_reason,p_bank_reference)$f$;
revoke all on function app_private.development_fund_report_payload(app_private.island_fund_reports) from public,anon,authenticated;
revoke all on function app_private.development_fund_state(integer),app_private.development_fund_reports(text,integer),app_private.development_fund_submit(uuid,text,integer,timestamptz,text,boolean),app_private.development_fund_review(uuid,uuid,text,integer,integer,text,text) from public,anon;
grant execute on function app_private.development_fund_state(integer),app_private.development_fund_reports(text,integer),app_private.development_fund_submit(uuid,text,integer,timestamptz,text,boolean),app_private.development_fund_review(uuid,uuid,text,integer,integer,text,text) to authenticated;
revoke all on function public.development_fund_state(integer),public.development_fund_reports(text,integer),public.development_fund_submit(uuid,text,integer,timestamptz,text,boolean),public.development_fund_review(uuid,uuid,text,integer,integer,text,text) from public,anon;
grant execute on function public.development_fund_state(integer),public.development_fund_reports(text,integer),public.development_fund_submit(uuid,text,integer,timestamptz,text,boolean),public.development_fund_review(uuid,uuid,text,integer,integer,text,text) to authenticated;
notify pgrst,'reload schema';
commit;
