-- Run files in the order documented in docs/systems/realtime-social.md.
begin;
create schema if not exists app_private;
revoke all on schema app_private from public, anon;
grant usage on schema app_private to authenticated;

create table if not exists public.player_profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  nickname text not null check (nickname ~ '^[가-힣a-zA-Z0-9_]{2,12}$'),
  friend_code text not null unique default upper(substr(replace(gen_random_uuid()::text, '-', ''), 1, 12))
    check (friend_code ~ '^[A-F0-9]{12}$'),
  created_at timestamptz not null default now()
);
alter table public.player_profiles enable row level security;
revoke all on public.player_profiles from anon, authenticated;
grant select on public.player_profiles to authenticated;
commit;
