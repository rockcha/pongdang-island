begin;
set local lock_timeout='5s';

-- Server-clock gate: no cron or connected browser is needed at the boundary.
-- Reopen explicitly after the patch is validated; do not guess a completion time.
create table app_private.fishing_maintenance (
 id boolean primary key default true check(id),
 starts_at timestamptz not null,
 released_at timestamptz,
 check(released_at is null or released_at>=starts_at)
);
alter table app_private.fishing_maintenance enable row level security;
revoke all on app_private.fishing_maintenance from public,anon,authenticated;
insert into app_private.fishing_maintenance(id,starts_at)
values(true,'2026-10-22 15:30:00+09');

create function app_private.fishing_maintenance_active(p_at timestamptz default clock_timestamp())
returns boolean language sql stable security definer set search_path='' as $$
 select exists(select 1 from app_private.fishing_maintenance
 where id and p_at>=starts_at and (released_at is null or p_at<released_at))
$$;
revoke all on function app_private.fishing_maintenance_active(timestamptz) from public,anon,authenticated;

create function app_private.enforce_fishing_maintenance()
returns trigger language plpgsql security definer set search_path='' as $$
begin
 if app_private.fishing_maintenance_active(clock_timestamp()) then
  raise exception using errcode='P0001',
   message='FISHING_MAINTENANCE: 낚시·미끼·통발·어선 점검 중입니다. 완료 공지 후 다시 이용해 주세요.';
 end if;
 return new;
end $$;
revoke all on function app_private.enforce_fishing_maintenance() from public,anon,authenticated;

-- Guard durable mutations, including old purchase entry points. Every failed
-- transaction rolls back any earlier wallet changes and generated rewards.
create trigger fishing_maintenance_bait_purchase
before insert on public.gold_transactions for each row
when(new.action='buy' and (new.item_id='bait' or new.item_id like 'fishing:%'))
execute function app_private.enforce_fishing_maintenance();
create trigger fishing_maintenance_cast_start
before insert on app_private.prepared_fishing_casts for each row
execute function app_private.enforce_fishing_maintenance();
create trigger fishing_maintenance_trap_start
before insert on public.fishing_expeditions for each row
execute function app_private.enforce_fishing_maintenance();
create trigger fishing_maintenance_trap_claim
before update of claimed_at on public.fishing_expeditions for each row
when(old.claimed_at is distinct from new.claimed_at)
execute function app_private.enforce_fishing_maintenance();
create trigger fishing_maintenance_boat_start
before insert on public.harbor_voyages for each row
execute function app_private.enforce_fishing_maintenance();
create trigger fishing_maintenance_boat_claim
before update of claimed_at on public.harbor_voyages for each row
when(old.claimed_at is distinct from new.claimed_at)
execute function app_private.enforce_fishing_maintenance();
create trigger fishing_maintenance_trap_boost
before insert on app_private.expedition_boosts for each row
execute function app_private.enforce_fishing_maintenance();

comment on table app_private.fishing_maintenance is
 'Scheduled fishing patch gate. After validation, reopen by setting released_at=clock_timestamp() where id. Existing cast finish and read-only state remain available. Does not change any catch rules or existing voyage snapshots.';
commit;
