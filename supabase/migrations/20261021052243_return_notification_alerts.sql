begin;

alter table public.harbor_voyages add column notified_at timestamptz;
alter table public.notifications add column harbor_voyage_id uuid references public.harbor_voyages(id) on delete cascade;
create unique index notifications_harbor_voyage_once on public.notifications(harbor_voyage_id) where harbor_voyage_id is not null;
create index harbor_voyages_due_notifications on public.harbor_voyages(returns_at) where notified_at is null and claimed_at is null;

-- Scheduler-only worker. Marking and insertion share a transaction; concurrent calls skip locked trips.
create function app_private.notify_due_harbor_voyages(p_voyage_id uuid default null)
returns integer language plpgsql security definer set search_path='' as $$
declare n integer;
begin
 with due as (
  select id from public.harbor_voyages
  where returns_at<=clock_timestamp() and notified_at is null and claimed_at is null
   and (p_voyage_id is null or id=p_voyage_id)
  order by returns_at,id limit 500 for update skip locked
 ), marked as (
  update public.harbor_voyages v set notified_at=clock_timestamp() from due where v.id=due.id returning v.*
 ) insert into public.notifications(recipient_id,category,kind,title,body,harbor_voyage_id)
 select user_id,'general','system','어선이 돌아왔어요!',
  coalesce(vessel_snapshot->>'name','어선')||'이 조업을 마치고 돌아왔어요. 항구에서 어획물을 받아주세요.',id from marked
 on conflict(harbor_voyage_id) where harbor_voyage_id is not null do nothing;
 get diagnostics n=row_count;
 return n;
end $$;
revoke all on function app_private.notify_due_harbor_voyages(uuid) from public,anon,authenticated;

-- Authenticated catch-up also supplies the next server deadline for an open app.
create function app_private.refresh_return_notifications()
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
 select min(returns_at) into next_at from (
  select returns_at from public.fishing_expeditions where user_id=actor and claimed_at is null and notified_at is null
  union all
  select returns_at from public.harbor_voyages where user_id=actor and claimed_at is null and notified_at is null
 ) pending;
 return jsonb_build_object('created',n,'nextAt',next_at,'serverNow',clock_timestamp());
end $$;
create function public.refresh_return_notifications()
returns jsonb language sql security invoker set search_path='' as $$
 select app_private.refresh_return_notifications()
$$;
revoke all on function app_private.refresh_return_notifications() from public,anon,authenticated;
revoke all on function public.refresh_return_notifications() from public,anon,authenticated;
grant execute on function app_private.refresh_return_notifications() to authenticated;
grant execute on function public.refresh_return_notifications() to authenticated;

do $$
begin
 if exists(select 1 from pg_extension where extname='pg_cron') then
  perform cron.schedule('harbor-voyage-return-notices','* * * * *','select app_private.notify_due_harbor_voyages()');
 else
  raise notice 'pg_cron unavailable: schedule app_private.notify_due_harbor_voyages() before deployment';
 end if;
end $$;
commit;
