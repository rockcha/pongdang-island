begin;

-- Staged settings only: the active bait catalog, cast RPCs, traps and voyages
-- continue using their existing rules until the fishing-system release.
create table app_private.fishing_bait_balance_profiles (
 id text primary key check (id ~ '^bait(_[a-z0-9]+)*$'),
 name text not null check (length(trim(name)) > 0),
 price integer check (price >= 0),
 success_chance_bp integer not null check (success_chance_bp = 10000),
 common_bp integer not null check (common_bp between 0 and 10000),
 rare_bp integer not null check (rare_bp between 0 and 10000),
 epic_bp integer not null check (epic_bp between 0 and 10000),
 mythic_bp integer not null check (mythic_bp between 0 and 10000),
 wait_min_seconds integer not null check (wait_min_seconds > 0),
 wait_max_seconds integer not null,
 target_kinds jsonb not null,
 effect_kind text not null check (effect_kind in ('standard','alternating','native_boost','common_only','undiscovered','shooting_star','day_night')),
 native_multiplier numeric not null check (native_multiplier >= 1),
 night_common_bp integer,
 night_rare_bp integer,
 night_wait_min_seconds integer,
 night_wait_max_seconds integer,
 constraint bait_balance_grade_total check (common_bp + rare_bp + epic_bp + mythic_bp = 10000),
 constraint bait_balance_wait_range check (wait_max_seconds >= wait_min_seconds),
 constraint bait_balance_targets check (
  jsonb_typeof(target_kinds) = 'array'
  and jsonb_array_length(target_kinds) between 1 and 3
  and target_kinds <@ '["fish","trash","decoration"]'::jsonb
 ),
 constraint bait_balance_native_effect check (effect_kind = 'native_boost' or native_multiplier = 1),
 constraint bait_balance_night_rules check (
  (effect_kind <> 'day_night' and night_common_bp is null and night_rare_bp is null
   and night_wait_min_seconds is null and night_wait_max_seconds is null)
  or
  (effect_kind = 'day_night' and night_common_bp is not null and night_rare_bp is not null
   and night_wait_min_seconds is not null and night_wait_max_seconds is not null
   and night_common_bp between 0 and 10000 and night_rare_bp between 0 and 10000
   and night_common_bp + night_rare_bp + epic_bp + mythic_bp = 10000
   and night_wait_min_seconds > 0 and night_wait_max_seconds >= night_wait_min_seconds)
 )
);

alter table app_private.fishing_bait_balance_profiles enable row level security;
revoke all on app_private.fishing_bait_balance_profiles from public, anon, authenticated;
comment on table app_private.fishing_bait_balance_profiles is
 'Unreleased manual-fishing balance. Never activate by updating legacy bait rows before snapshotting existing trap rules. New bait artwork and RPC integration belong to the fishing-system release.';

create function app_private.fishing_bait_balance_at(p_bait_id text, p_at timestamptz default clock_timestamp())
returns jsonb
language sql
stable
security invoker
set search_path = ''
as $$
 with chosen as (
  select b.*,b.effect_kind = 'day_night'
   and extract(hour from p_at at time zone 'Asia/Seoul') not between 6 and 17 as is_night
  from app_private.fishing_bait_balance_profiles b where b.id = p_bait_id and p_at is not null
 )
 select (to_jsonb(b) - array['is_night','night_common_bp','night_rare_bp','night_wait_min_seconds','night_wait_max_seconds'])
  || jsonb_build_object(
   'period',case when b.effect_kind = 'day_night' then case when b.is_night then 'night' else 'day' end else null end,
   'common_bp',case when b.is_night then b.night_common_bp else b.common_bp end,
   'rare_bp',case when b.is_night then b.night_rare_bp else b.rare_bp end,
   'wait_min_seconds',case when b.is_night then b.night_wait_min_seconds else b.wait_min_seconds end,
   'wait_max_seconds',case when b.is_night then b.night_wait_max_seconds else b.wait_max_seconds end
  ) from chosen b;
$$;
revoke all on function app_private.fishing_bait_balance_at(text,timestamptz) from public, anon, authenticated;
comment on function app_private.fishing_bait_balance_at(text,timestamptz) is
 'Internal, unreleased settings lookup. Korea day is 06:00 <= time < 18:00. The future cast RPC must snapshot this once at cast start; no current fishing RPC calls it.';

commit;
