-- Collect completion pushes into minute windows. Inbox rows and accounting stay
-- immediate and per run; existing deliveries, retries and expiry warnings keep
-- their original schedule. The sender still rechecks collection before sending.
begin;
create function app_private.schedule_completion_push_window()
returns trigger language plpgsql set search_path='' as $$
begin
 if new.category in ('production','bait-production','expedition','harbor')
  and new.notification_id is not null and new.status='pending' and new.attempts=0 then
  new.available_at:=greatest(new.available_at,date_trunc('minute',clock_timestamp())+interval '1 minute');
 end if;
 return new;
end $$;
revoke all on function app_private.schedule_completion_push_window() from public,anon,authenticated;
create trigger schedule_completion_push_window
before insert on app_private.push_deliveries
for each row execute function app_private.schedule_completion_push_window();
commit;
