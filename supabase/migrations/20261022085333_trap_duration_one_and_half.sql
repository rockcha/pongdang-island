begin;
-- Only new installations use this value. Existing return times stay fixed.
create or replace function app_private.trap_minutes_per_bait()
returns integer language sql immutable set search_path='' as $$select 15$$;
revoke all on function app_private.trap_minutes_per_bait() from public,anon,authenticated;
commit;
