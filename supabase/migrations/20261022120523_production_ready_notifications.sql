begin;
set local lock_timeout='5s';

alter table app_private.production_sites add column ready_notified_at timestamptz;
alter table public.notifications
 add column production_site_id uuid references app_private.production_sites(id) on delete set null,
 add column production_started_at timestamptz;
create unique index notifications_production_run_once
 on public.notifications(production_site_id,production_started_at) where production_site_id is not null;
create index production_sites_due_notifications on app_private.production_sites(completes_at)
 where started_at is not null and ready_notified_at is null;

-- Starting or clearing a run resets delivery without changing its frozen production snapshot.
create function app_private.reset_production_ready_notice()
returns trigger language plpgsql security invoker set search_path='' as $$
begin
 new.ready_notified_at:=null;
 return new;
end $$;
revoke all on function app_private.reset_production_ready_notice() from public,anon,authenticated;
create trigger production_ready_notice_reset before update of started_at on app_private.production_sites
 for each row when (old.started_at is distinct from new.started_at)
 execute function app_private.reset_production_ready_notice();

-- Scheduler-only worker. Claim/discard and notification delivery serialize on the site row.
create function app_private.notify_due_production_sites(p_site_id uuid default null)
returns integer language plpgsql security definer set search_path='' as $$
declare n integer;
begin
 with due as (
  select id from app_private.production_sites
  where started_at is not null and ready_notified_at is null
   and completes_at<=clock_timestamp() and expires_at>clock_timestamp()
   and (p_site_id is null or id=p_site_id)
  order by completes_at,id limit 500 for update skip locked
 ), marked as (
  update app_private.production_sites s set ready_notified_at=clock_timestamp()
  from due where s.id=due.id returning s.*
 ) insert into public.notifications(recipient_id,category,kind,title,body,production_site_id,production_started_at)
 select s.user_id,'general','system','연료 생산이 끝났어요!',
  f.name||'에서 연료 '||s.run_output||'개를 만들었어요. 생산소에서 수령해 주세요.',s.id,s.started_at
 from marked s join public.production_facilities f on f.id=s.facility_id
 on conflict(production_site_id,production_started_at) where production_site_id is not null do nothing;
 get diagnostics n=row_count;
 return n;
end $$;
revoke all on function app_private.notify_due_production_sites(uuid) from public,anon,authenticated;

-- Catch up only the caller's runs, then schedule the open app against server time.
create or replace function app_private.refresh_return_notifications()
returns jsonb language plpgsql security definer set search_path='' as $$
declare actor uuid:=auth.uid(); trip uuid; n integer:=0; next_at timestamptz;
begin
 if actor is null then raise exception 'AUTH_REQUIRED'; end if;
 for trip in select id from public.fishing_expeditions where user_id=actor and claimed_at is null
  and notified_at is null and returns_at<=clock_timestamp() order by returns_at,id limit 500
 loop n:=n+app_private.notify_due_expeditions(trip); end loop;
 for trip in select id from public.harbor_voyages where user_id=actor and claimed_at is null
  and notified_at is null and returns_at<=clock_timestamp() order by returns_at,id limit 500
 loop n:=n+app_private.notify_due_harbor_voyages(trip); end loop;
 for trip in select id from app_private.production_sites where user_id=actor
  and started_at is not null and ready_notified_at is null
  and completes_at<=clock_timestamp() and expires_at>clock_timestamp() order by completes_at,id limit 500
 loop n:=n+app_private.notify_due_production_sites(trip); end loop;
 select min(due_at) into next_at from (
  select returns_at as due_at from public.fishing_expeditions where user_id=actor and claimed_at is null and notified_at is null
  union all
  select returns_at from public.harbor_voyages where user_id=actor and claimed_at is null and notified_at is null
  union all
  select completes_at from app_private.production_sites where user_id=actor and started_at is not null
   and ready_notified_at is null and expires_at>clock_timestamp()
 ) pending;
 return jsonb_build_object('created',n,'nextAt',next_at,'serverNow',clock_timestamp());
end $$;
revoke all on function app_private.refresh_return_notifications() from public,anon,authenticated;
grant execute on function app_private.refresh_return_notifications() to authenticated;

do $$
begin
 if exists(select 1 from pg_extension where extname='pg_cron') then
  perform cron.schedule('production-ready-notifications','* * * * *','select app_private.notify_due_production_sites()');
 else
  raise notice 'pg_cron unavailable: schedule app_private.notify_due_production_sites() before deployment';
 end if;
end $$;
commit;
