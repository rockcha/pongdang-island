begin;
create table if not exists public.friend_requests (
  id uuid primary key default gen_random_uuid(),
  sender_id uuid not null references public.player_profiles(id) on delete cascade,
  recipient_id uuid not null references public.player_profiles(id) on delete cascade,
  status text not null default 'pending' check (status in ('pending', 'accepted', 'declined', 'cancelled')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  check (sender_id <> recipient_id)
);
-- One active relationship per unordered pair, including opposite-direction requests.
create unique index if not exists friend_requests_active_pair on public.friend_requests
  (least(sender_id, recipient_id), greatest(sender_id, recipient_id)) where status in ('pending', 'accepted');
create index if not exists friend_requests_sender_status on public.friend_requests(sender_id, status, created_at desc);
create index if not exists friend_requests_recipient_status on public.friend_requests(recipient_id, status, created_at desc);
alter table public.friend_requests enable row level security;
revoke all on public.friend_requests from anon, authenticated;
grant select on public.friend_requests to authenticated;
drop policy if exists requests_participants_read on public.friend_requests;
create policy requests_participants_read on public.friend_requests for select to authenticated
  using ((select auth.uid()) = sender_id or (select auth.uid()) = recipient_id);

drop policy if exists profiles_related_read on public.player_profiles;
create policy profiles_related_read on public.player_profiles for select to authenticated using (
  id = (select auth.uid()) or exists (
    select 1 from public.friend_requests r where
    (r.sender_id = (select auth.uid()) and r.recipient_id = player_profiles.id)
    or (r.recipient_id = (select auth.uid()) and r.sender_id = player_profiles.id)
  )
);
commit;
