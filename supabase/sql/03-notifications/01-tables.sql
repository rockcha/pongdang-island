begin;
create table if not exists public.notifications (
  id uuid primary key default gen_random_uuid(),
  recipient_id uuid not null references public.player_profiles(id) on delete cascade,
  actor_id uuid references public.player_profiles(id) on delete set null,
  category text not null check (category in ('friend', 'general')),
  kind text not null check (kind in ('friend_request', 'friend_accepted', 'announcement', 'reward', 'system')),
  title text not null check (char_length(title) between 1 and 100),
  body text not null default '' check (char_length(body) <= 500),
  request_id uuid references public.friend_requests(id) on delete cascade,
  read_at timestamptz,
  created_at timestamptz not null default now(),
  check ((category = 'friend' and kind in ('friend_request', 'friend_accepted') and request_id is not null)
    or (category = 'general' and kind in ('announcement', 'reward', 'system') and request_id is null))
);
create index if not exists notifications_recipient_created on public.notifications(recipient_id, created_at desc);
create index if not exists notifications_unread on public.notifications(recipient_id, category) where read_at is null;
create unique index if not exists notifications_request_once on public.notifications(recipient_id, kind, request_id) where request_id is not null;
alter table public.notifications enable row level security;
revoke all on public.notifications from anon, authenticated;
grant select, update(read_at) on public.notifications to authenticated;
-- Trusted backends may create general notifications. Do not put service keys in Vite.
grant select, insert, update, delete on public.notifications to service_role;
drop policy if exists notifications_owner_read on public.notifications;
create policy notifications_owner_read on public.notifications for select to authenticated using (recipient_id = (select auth.uid()));
drop policy if exists notifications_owner_update on public.notifications;
create policy notifications_owner_update on public.notifications for update to authenticated
  using (recipient_id = (select auth.uid())) with check (recipient_id = (select auth.uid()));
commit;
