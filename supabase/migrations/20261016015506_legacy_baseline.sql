-- Frozen import of legacy SQL 01-38. New EMPTY application databases only.
-- Existing databases: inspect and reconcile first; never replay this baseline.
begin;
do $$ begin
 if exists(select 1 from pg_class c join pg_namespace n on n.oid=c.relnamespace where n.nspname in ('public','app_private') and c.relkind in ('r','p')) then
  raise exception 'BASELINE_REQUIRES_EMPTY_APP_SCHEMA';
 end if;
end $$;

-- SOURCE: 01-profiles/01-tables.sql
-- Run files in the order documented in docs/systems/realtime-social.md.

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

set constraints all immediate;
set constraints all deferred;

-- SOURCE: 02-friends/01-tables.sql

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

set constraints all immediate;
set constraints all deferred;

-- SOURCE: 03-notifications/01-tables.sql

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

set constraints all immediate;
set constraints all deferred;

-- SOURCE: 04-functions/01-social-api.sql

-- Definer functions are kept in a non-exposed schema, with an auth.uid() check.
-- Public RPC wrappers are SECURITY INVOKER. No direct client table writes are granted.
create or replace function app_private.sync_player_profile()
returns public.player_profiles language plpgsql security definer set search_path = '' as $$
declare v_uid uuid := auth.uid(); v_name text; v_profile public.player_profiles;
begin
  if v_uid is null then raise exception 'AUTH_REQUIRED'; end if;
  select raw_user_meta_data ->> 'game_nickname' into v_name from auth.users where id = v_uid;
  if v_name is null or v_name !~ '^[가-힣a-zA-Z0-9_]{2,12}$' then raise exception 'NICKNAME_REQUIRED'; end if;
  -- Retry only the extraordinarily rare random-code collision.
  for attempt in 1..5 loop
    begin
      insert into public.player_profiles(id, nickname) values (v_uid, v_name)
      on conflict(id) do update set nickname = excluded.nickname
      returning * into v_profile;
      return v_profile;
    exception when unique_violation then
      if attempt = 5 then raise; end if;
    end;
  end loop;
  raise exception 'PROFILE_CREATE_FAILED';
end $$;

create or replace function app_private.find_player_by_code(p_code text)
returns setof public.player_profiles language plpgsql security definer set search_path = '' as $$
begin
  if auth.uid() is null then raise exception 'AUTH_REQUIRED'; end if;
  if upper(trim(p_code)) !~ '^[A-F0-9]{12}$' then raise exception 'INVALID_FRIEND_CODE'; end if;
  return query select * from public.player_profiles where friend_code = upper(trim(p_code)) limit 1;
end $$;

create or replace function app_private.send_friend_request(p_code text)
returns uuid language plpgsql security definer set search_path = '' as $$
declare v_uid uuid := auth.uid(); v_target uuid; v_id uuid; v_name text;
begin
  if v_uid is null then raise exception 'AUTH_REQUIRED'; end if;
  if upper(trim(p_code)) !~ '^[A-F0-9]{12}$' then raise exception 'INVALID_FRIEND_CODE'; end if;
  select id into v_target from public.player_profiles where friend_code = upper(trim(p_code));
  if v_target is null then raise exception 'PLAYER_NOT_FOUND'; end if;
  if v_target = v_uid then raise exception 'CANNOT_FRIEND_SELF'; end if;
  select nickname into v_name from public.player_profiles where id = v_uid;
  if v_name is null then raise exception 'NICKNAME_REQUIRED'; end if;
  -- Serialize a sender's rate limit checks and opposite-direction operations for a pair.
  perform pg_advisory_xact_lock(hashtextextended('sender:' || v_uid::text, 0));
  perform pg_advisory_xact_lock(hashtextextended(least(v_uid, v_target)::text || greatest(v_uid, v_target)::text, 1));
  if exists(select 1 from public.friend_requests where least(sender_id,recipient_id) = least(v_uid,v_target)
    and greatest(sender_id,recipient_id) = greatest(v_uid,v_target) and status in ('pending','accepted')) then
    raise exception 'RELATIONSHIP_EXISTS';
  end if;
  if (select count(*) from public.friend_requests where sender_id = v_uid and created_at > now() - interval '1 minute') >= 5
    or (select count(*) from public.friend_requests where sender_id = v_uid and status = 'pending') >= 30
    or exists(select 1 from public.friend_requests where least(sender_id,recipient_id) = least(v_uid,v_target)
      and greatest(sender_id,recipient_id) = greatest(v_uid,v_target) and updated_at > now() - interval '1 minute') then
    raise exception 'FRIEND_RATE_LIMIT';
  end if;
  insert into public.friend_requests(sender_id,recipient_id) values(v_uid,v_target) returning id into v_id;
  insert into public.notifications(recipient_id,actor_id,category,kind,title,body,request_id)
    values(v_target,v_uid,'friend','friend_request',v_name || '님의 친구 요청','함께 퐁당섬에서 낚시해요.',v_id);
  return v_id;
end $$;

create or replace function app_private.respond_friend_request(p_request_id uuid, p_action text)
returns void language plpgsql security definer set search_path = '' as $$
declare v_uid uuid := auth.uid(); v_request public.friend_requests; v_name text;
begin
  if v_uid is null then raise exception 'AUTH_REQUIRED'; end if;
  select * into v_request from public.friend_requests where id = p_request_id for update;
  if not found then raise exception 'REQUEST_NOT_FOUND'; end if;
  if p_action is null or p_action not in ('accept','decline','cancel') then raise exception 'INVALID_ACTION'; end if;
  if (p_action = 'cancel' and v_request.sender_id <> v_uid)
    or (p_action in ('accept','decline') and v_request.recipient_id <> v_uid) then raise exception 'NOT_ALLOWED'; end if;
  if v_request.status <> 'pending' then raise exception 'REQUEST_ALREADY_HANDLED'; end if;
  update public.friend_requests set status = case p_action when 'accept' then 'accepted' when 'decline' then 'declined' else 'cancelled' end,
    updated_at = now() where id = p_request_id;
  update public.notifications set read_at = coalesce(read_at,now()) where request_id = p_request_id and kind = 'friend_request';
  if p_action = 'accept' then
    select nickname into v_name from public.player_profiles where id = v_uid;
    insert into public.notifications(recipient_id,actor_id,category,kind,title,body,request_id)
      values(v_request.sender_id,v_uid,'friend','friend_accepted',v_name || '님과 친구가 됐어요','친구 목록에서 확인해보세요.',p_request_id);
  end if;
end $$;

create or replace function public.sync_player_profile() returns public.player_profiles
language sql security invoker set search_path = '' as $$ select app_private.sync_player_profile() $$;
create or replace function public.find_player_by_code(p_code text) returns setof public.player_profiles
language sql security invoker set search_path = '' as $$ select * from app_private.find_player_by_code(p_code) $$;
create or replace function public.send_friend_request(p_code text) returns uuid
language sql security invoker set search_path = '' as $$ select app_private.send_friend_request(p_code) $$;
create or replace function public.respond_friend_request(p_request_id uuid, p_action text) returns void
language sql security invoker set search_path = '' as $$ select app_private.respond_friend_request(p_request_id,p_action) $$;

revoke all on function app_private.sync_player_profile(), app_private.find_player_by_code(text), app_private.send_friend_request(text), app_private.respond_friend_request(uuid,text) from public, anon;
revoke all on function public.sync_player_profile(), public.find_player_by_code(text), public.send_friend_request(text), public.respond_friend_request(uuid,text) from public, anon;
grant execute on function app_private.sync_player_profile(), app_private.find_player_by_code(text), app_private.send_friend_request(text), app_private.respond_friend_request(uuid,text) to authenticated;
grant execute on function public.sync_player_profile(), public.find_player_by_code(text), public.send_friend_request(text), public.respond_friend_request(uuid,text) to authenticated;

set constraints all immediate;
set constraints all deferred;

-- SOURCE: 05-realtime/01-publication.sql
-- Run as database owner. RLS still controls which rows each subscriber can see.

do $$
begin
  if not exists(select 1 from pg_publication where pubname = 'supabase_realtime') then
    create publication supabase_realtime;
  end if;
  if not exists(select 1 from pg_publication_tables where pubname='supabase_realtime' and schemaname='public' and tablename='friend_requests') then
    alter publication supabase_realtime add table public.friend_requests;
  end if;
  if not exists(select 1 from pg_publication_tables where pubname='supabase_realtime' and schemaname='public' and tablename='notifications') then
    alter publication supabase_realtime add table public.notifications;
  end if;
end $$;

set constraints all immediate;
set constraints all deferred;

-- SOURCE: 06-avatars/01-avatar-storage.sql
-- Apply AFTER 01~05. Additive change for already-installed databases.

alter table public.player_profiles add column if not exists avatar_path text;
insert into storage.buckets(id,name,public,file_size_limit,allowed_mime_types)
values ('avatars','avatars',true,5242880,array['image/webp'])
on conflict(id) do update set public=true,file_size_limit=5242880,allowed_mime_types=array['image/webp'];

-- Public bucket serves image URLs. Object listing/writes are limited to the owner folder.
drop policy if exists avatars_owner_select on storage.objects;
create policy avatars_owner_select on storage.objects for select to authenticated
  using(bucket_id='avatars' and split_part(name,'/',1)=(select auth.uid())::text);
drop policy if exists avatars_owner_insert on storage.objects;
create policy avatars_owner_insert on storage.objects for insert to authenticated
  with check(bucket_id='avatars' and name ~ ('^' || (select auth.uid())::text || '/[a-f0-9-]{36}\.webp$'));
drop policy if exists avatars_owner_delete on storage.objects;
create policy avatars_owner_delete on storage.objects for delete to authenticated
  using(bucket_id='avatars' and split_part(name,'/',1)=(select auth.uid())::text);
-- Uploads always use a new UUID filename, not upsert; no UPDATE policy is required.

create or replace function app_private.set_player_avatar(p_path text)
returns public.player_profiles language plpgsql security definer set search_path = '' as $$
declare v_uid uuid := auth.uid(); v_profile public.player_profiles;
begin
  if v_uid is null then raise exception 'AUTH_REQUIRED'; end if;
  perform app_private.sync_player_profile();
  if p_path is not null then
    if p_path !~ ('^' || v_uid::text || '/[a-f0-9-]{36}\.webp$') then raise exception 'INVALID_AVATAR_PATH'; end if;
    if not exists(select 1 from storage.objects where bucket_id='avatars' and name=p_path and metadata->>'mimetype'='image/webp') then
      raise exception 'AVATAR_NOT_FOUND';
    end if;
  end if;
  update public.player_profiles set avatar_path=p_path where id=v_uid returning * into v_profile;
  return v_profile;
end $$;
create or replace function public.set_player_avatar(p_path text) returns public.player_profiles
language sql security invoker set search_path = '' as $$ select app_private.set_player_avatar(p_path) $$;
revoke all on function app_private.set_player_avatar(text),public.set_player_avatar(text) from public,anon;
grant execute on function app_private.set_player_avatar(text),public.set_player_avatar(text) to authenticated;

-- Related users receive profile changes under the existing profiles_related_read RLS policy.
do $$ begin
  if not exists(select 1 from pg_publication_tables where pubname='supabase_realtime' and schemaname='public' and tablename='player_profiles') then
    alter publication supabase_realtime add table public.player_profiles;
  end if;
end $$;
notify pgrst, 'reload schema';

set constraints all immediate;
set constraints all deferred;

-- SOURCE: 07-friend-removal/01-remove-friend.sql
-- Apply AFTER 01~06. Keep relationship history so old notifications remain stable.

alter table public.friend_requests drop constraint if exists friend_requests_status_check;
alter table public.friend_requests add constraint friend_requests_status_check
  check(status in ('pending','accepted','declined','cancelled','removed'));
create or replace function app_private.remove_friend(p_request_id uuid)
returns void language plpgsql security definer set search_path = '' as $$
declare v_uid uuid := auth.uid(); v_request public.friend_requests;
begin
  if v_uid is null then raise exception 'AUTH_REQUIRED'; end if;
  select * into v_request from public.friend_requests where id=p_request_id for update;
  if not found then raise exception 'REQUEST_NOT_FOUND'; end if;
  if v_uid <> v_request.sender_id and v_uid <> v_request.recipient_id then raise exception 'NOT_ALLOWED'; end if;
  if v_request.status <> 'accepted' then raise exception 'FRIENDSHIP_NOT_ACTIVE'; end if;
  update public.friend_requests set status='removed',updated_at=now() where id=p_request_id;
  update public.notifications set read_at=coalesce(read_at,now()) where request_id=p_request_id;
  -- No separate unfriend notification. Existing UPDATE subscriptions update both lists.
end $$;
create or replace function public.remove_friend(p_request_id uuid) returns void
language sql security invoker set search_path = '' as $$ select app_private.remove_friend(p_request_id) $$;
revoke all on function app_private.remove_friend(uuid),public.remove_friend(uuid) from public,anon;
grant execute on function app_private.remove_friend(uuid),public.remove_friend(uuid) to authenticated;
notify pgrst, 'reload schema';

set constraints all immediate;
set constraints all deferred;

-- SOURCE: 08-gold/01-wallet.sql
-- Apply after 01~07. Browser balances are intentionally not imported.

create table public.player_wallets (
 user_id uuid primary key references auth.users(id) on delete cascade,
 gold integer not null default 0 check(gold between 0 and 1000000000),
 inventory jsonb not null default '{}' check(jsonb_typeof(inventory)='object'),
 test_claimed boolean not null default false,
 updated_at timestamptz not null default now()
);
create table public.gold_transactions (
 user_id uuid not null references auth.users(id) on delete cascade,
 operation_id uuid not null,
 action text not null check(action in ('charge','buy','sell')),
 item_id text,
 delta integer not null,
 created_at timestamptz not null default now(),
 primary key(user_id,operation_id)
);
create table app_private.gold_settings (
 id boolean primary key default true check(id),
 test_charge_enabled boolean not null default true
);
insert into app_private.gold_settings(id) values(true);
alter table app_private.gold_settings enable row level security;
revoke all on app_private.gold_settings from public,anon,authenticated;
alter table public.player_wallets enable row level security;
alter table public.gold_transactions enable row level security;
revoke all on public.player_wallets,public.gold_transactions from public,anon,authenticated;
grant select on public.player_wallets,public.gold_transactions to authenticated;
create policy wallet_owner_read on public.player_wallets for select to authenticated using(user_id=(select auth.uid()));
create policy ledger_owner_read on public.gold_transactions for select to authenticated using(user_id=(select auth.uid()));

create function app_private.get_gold_wallet() returns jsonb
language plpgsql security definer set search_path='' as $$
declare v_uid uuid:=auth.uid(); v_wallet public.player_wallets;
begin
 if v_uid is null then raise exception 'AUTH_REQUIRED'; end if;
 insert into public.player_wallets(user_id) values(v_uid) on conflict do nothing;
 select * into v_wallet from public.player_wallets where user_id=v_uid;
 return jsonb_build_object('gold',v_wallet.gold,'inventory',v_wallet.inventory,'testClaimed',v_wallet.test_claimed,'testEnabled',(select test_charge_enabled from app_private.gold_settings where id));
end $$;
create function app_private.trade_gold(p_operation_id uuid,p_action text,p_item_id text default null) returns jsonb
language plpgsql security definer set search_path='' as $$
declare v_uid uuid:=auth.uid(); v_wallet public.player_wallets; v_previous public.gold_transactions; v_delta integer; v_count integer; v_price integer;
begin
 if v_uid is null then raise exception 'AUTH_REQUIRED'; end if;
 if p_operation_id is null or p_action is null or p_action not in ('charge','buy','sell') then raise exception 'INVALID_TRADE'; end if;
 insert into public.player_wallets(user_id) values(v_uid) on conflict do nothing;
 select * into v_wallet from public.player_wallets where user_id=v_uid for update;
 select * into v_previous from public.gold_transactions where user_id=v_uid and operation_id=p_operation_id;
 if found then
  if v_previous.action<>p_action or v_previous.item_id is distinct from p_item_id then raise exception 'OPERATION_CONFLICT'; end if;
  return app_private.get_gold_wallet() || jsonb_build_object('delta',0);
 end if;
 if p_action='charge' then
  if p_item_id is not null then raise exception 'INVALID_TRADE'; end if;
  if not coalesce((select test_charge_enabled from app_private.gold_settings where id),false) then raise exception 'TEST_CHARGE_DISABLED'; end if;
  if v_wallet.test_claimed then raise exception 'TEST_CHARGE_ALREADY_CLAIMED'; end if;
  v_delta:=1000;
 else
  if p_item_id is null or p_item_id not in ('bait','shell') then raise exception 'INVALID_ITEM'; end if;
  v_count:=coalesce((v_wallet.inventory->>p_item_id)::integer,0);
  v_price:=case p_item_id when 'bait' then 100 else 300 end;
  if p_action='buy' then
   if v_wallet.gold<v_price then raise exception 'INSUFFICIENT_GOLD'; end if;
   v_delta:=-v_price; v_count:=v_count+1;
  else
   if v_count<1 then raise exception 'INSUFFICIENT_INVENTORY'; end if;
   v_delta:=v_price*6/10; v_count:=v_count-1;
  end if;
  v_wallet.inventory:=jsonb_set(v_wallet.inventory,array[p_item_id],to_jsonb(v_count));
 end if;
 if v_wallet.gold+v_delta>1000000000 then raise exception 'GOLD_LIMIT'; end if;
 update public.player_wallets set gold=gold+v_delta,inventory=v_wallet.inventory,test_claimed=test_claimed or p_action='charge',updated_at=now() where user_id=v_uid;
 insert into public.gold_transactions(user_id,operation_id,action,item_id,delta) values(v_uid,p_operation_id,p_action,p_item_id,v_delta);
 return app_private.get_gold_wallet() || jsonb_build_object('delta',v_delta);
end $$;
create function public.get_gold_wallet() returns jsonb language sql security invoker set search_path='' as $$select app_private.get_gold_wallet()$$;
create function public.trade_gold(p_operation_id uuid,p_action text,p_item_id text default null) returns jsonb language sql security invoker set search_path='' as $$select app_private.trade_gold(p_operation_id,p_action,p_item_id)$$;
revoke all on function app_private.get_gold_wallet(),public.get_gold_wallet(),app_private.trade_gold(uuid,text,text),public.trade_gold(uuid,text,text) from public,anon;
grant execute on function app_private.get_gold_wallet(),public.get_gold_wallet(),app_private.trade_gold(uuid,text,text),public.trade_gold(uuid,text,text) to authenticated;
notify pgrst,'reload schema';

set constraints all immediate;
set constraints all deferred;

-- SOURCE: 09-aquarium/01-backgrounds.sql
-- Apply after 08. Upload images manually to the public aquarium-backgrounds bucket.

insert into storage.buckets(id,name,public,file_size_limit,allowed_mime_types)
values('aquarium-backgrounds','aquarium-backgrounds',true,10485760,array['image/png','image/webp'])
on conflict(id) do nothing;
create table public.aquarium_backgrounds (
 id text primary key, name text not null, price integer not null check(price>=0), image_path text not null unique
);
insert into public.aquarium_backgrounds values
 ('default','맑은 물빛',0,'default.png'),('coral','산호 정원',100,'coral.png'),
 ('moon','달빛 바다',300,'moon.png'),('pearl','진주 동굴',500,'pearl.png');
create table public.player_aquariums (
 user_id uuid primary key references auth.users(id) on delete cascade,
 background_id text not null default 'default' references public.aquarium_backgrounds(id)
);
create table public.owned_aquarium_backgrounds (
 user_id uuid not null references auth.users(id) on delete cascade,
 background_id text not null references public.aquarium_backgrounds(id),
 purchased_at timestamptz not null default now(),primary key(user_id,background_id)
);
alter table public.aquarium_backgrounds enable row level security;
alter table public.player_aquariums enable row level security;
alter table public.owned_aquarium_backgrounds enable row level security;
revoke all on public.aquarium_backgrounds,public.player_aquariums,public.owned_aquarium_backgrounds from public,anon,authenticated;
grant select on public.aquarium_backgrounds,public.player_aquariums,public.owned_aquarium_backgrounds to authenticated;
create policy catalog_read on public.aquarium_backgrounds for select to authenticated using(true);
create policy aquarium_owner_read on public.player_aquariums for select to authenticated using(user_id=(select auth.uid()));
create policy backgrounds_owner_read on public.owned_aquarium_backgrounds for select to authenticated using(user_id=(select auth.uid()));
create function app_private.aquarium_state() returns jsonb language plpgsql security definer set search_path='' as $$
declare v_uid uuid:=auth.uid();
begin
 if v_uid is null then raise exception 'AUTH_REQUIRED'; end if;
 insert into public.player_aquariums(user_id) values(v_uid) on conflict do nothing;
 return jsonb_build_object('background',(select background_id from public.player_aquariums where user_id=v_uid),
 'owned',coalesce((select jsonb_agg(background_id) from public.owned_aquarium_backgrounds where user_id=v_uid),'[]'::jsonb),
 'catalog',(select jsonb_agg(to_jsonb(b) order by b.price) from public.aquarium_backgrounds b));
end $$;
create function app_private.aquarium_background(p_id text,p_action text,p_operation_id uuid default null) returns jsonb
language plpgsql security definer set search_path='' as $$
declare v_uid uuid:=auth.uid(); v_item public.aquarium_backgrounds; v_wallet public.player_wallets; v_old public.gold_transactions;
begin
 if v_uid is null then raise exception 'AUTH_REQUIRED'; end if;
 if p_action is null or p_action not in ('buy','equip') then raise exception 'INVALID_TRADE'; end if;
 select * into v_item from public.aquarium_backgrounds where id=p_id;
 if not found then raise exception 'INVALID_ITEM'; end if;
 perform app_private.get_gold_wallet();
 select * into v_wallet from public.player_wallets where user_id=v_uid for update;
 if p_action='equip' then
  if p_id<>'default' and not exists(select 1 from public.owned_aquarium_backgrounds where user_id=v_uid and background_id=p_id) then raise exception 'BACKGROUND_NOT_OWNED'; end if;
  insert into public.player_aquariums(user_id,background_id) values(v_uid,p_id) on conflict(user_id) do update set background_id=excluded.background_id;
  return app_private.aquarium_state();
 end if;
 if p_operation_id is null then raise exception 'INVALID_TRADE'; end if;
 select * into v_old from public.gold_transactions where user_id=v_uid and operation_id=p_operation_id;
 if found then
  if v_old.action<>'buy' or v_old.item_id is distinct from ('background:'||p_id) then raise exception 'OPERATION_CONFLICT'; end if;
  return app_private.get_gold_wallet() || jsonb_build_object('delta',0);
 end if;
 if p_id='default' or exists(select 1 from public.owned_aquarium_backgrounds where user_id=v_uid and background_id=p_id) then raise exception 'BACKGROUND_ALREADY_OWNED'; end if;
 if v_wallet.gold<v_item.price then raise exception 'INSUFFICIENT_GOLD'; end if;
 update public.player_wallets set gold=gold-v_item.price,updated_at=now() where user_id=v_uid;
 insert into public.owned_aquarium_backgrounds(user_id,background_id) values(v_uid,p_id);
 insert into public.gold_transactions(user_id,operation_id,action,item_id,delta) values(v_uid,p_operation_id,'buy','background:'||p_id,-v_item.price);
 return app_private.get_gold_wallet() || jsonb_build_object('delta',-v_item.price);
end $$;
create function public.aquarium_state() returns jsonb language sql security invoker set search_path='' as $$select app_private.aquarium_state()$$;
create function public.aquarium_background(p_id text,p_action text,p_operation_id uuid default null) returns jsonb language sql security invoker set search_path='' as $$select app_private.aquarium_background(p_id,p_action,p_operation_id)$$;
revoke all on function app_private.aquarium_state(),public.aquarium_state(),app_private.aquarium_background(text,text,uuid),public.aquarium_background(text,text,uuid) from public,anon;
grant execute on function app_private.aquarium_state(),public.aquarium_state(),app_private.aquarium_background(text,text,uuid),public.aquarium_background(text,text,uuid) to authenticated;
notify pgrst,'reload schema';

set constraints all immediate;
set constraints all deferred;

-- SOURCE: 10-aquarium-tanks/01-tanks.sql
-- Apply after 09. Existing equipped background becomes the user's free first tank.

create table public.aquarium_tanks (
 id uuid primary key default gen_random_uuid(),
 user_id uuid not null references auth.users(id) on delete cascade,
 name text not null default '나의 첫 어항' check(char_length(btrim(name)) between 1 and 20 and name !~ '[[:cntrl:]]'),
 background_id text not null default 'default' references public.aquarium_backgrounds(id),
 is_default boolean not null default false,
 created_at timestamptz not null default now()
);
create index aquarium_tanks_owner_idx on public.aquarium_tanks(user_id,created_at,id);
create unique index aquarium_tanks_one_default on public.aquarium_tanks(user_id) where is_default;
alter table public.aquarium_tanks enable row level security;
revoke all on public.aquarium_tanks from public,anon,authenticated;
grant select on public.aquarium_tanks to authenticated;
create policy tanks_owner_read on public.aquarium_tanks for select to authenticated using(user_id=(select auth.uid()));
insert into public.aquarium_tanks(user_id,background_id,is_default)
select user_id,background_id,true from public.player_aquariums;

create or replace function app_private.aquarium_state() returns jsonb language plpgsql security definer set search_path='' as $$
declare v_uid uuid:=auth.uid();
begin
 if v_uid is null then raise exception 'AUTH_REQUIRED'; end if;
 insert into public.player_aquariums(user_id) values(v_uid) on conflict do nothing;
 insert into public.aquarium_tanks(user_id,background_id,is_default)
 select v_uid,background_id,true from public.player_aquariums where user_id=v_uid
 on conflict(user_id) where is_default do nothing;
 return jsonb_build_object(
 'background',(select background_id from public.aquarium_tanks where user_id=v_uid and is_default),
 'tanks',coalesce((select jsonb_agg(to_jsonb(t) order by t.created_at,t.id) from public.aquarium_tanks t where user_id=v_uid),'[]'::jsonb),
 'tankPrice',200,
 'owned',coalesce((select jsonb_agg(background_id) from public.owned_aquarium_backgrounds where user_id=v_uid),'[]'::jsonb),
 'catalog',(select jsonb_agg(to_jsonb(b) order by b.price) from public.aquarium_backgrounds b));
end $$;
create function app_private.buy_aquarium_tank(p_operation_id uuid) returns jsonb
language plpgsql security definer set search_path='' as $$
declare v_uid uuid:=auth.uid(); v_wallet public.player_wallets; v_previous public.gold_transactions; v_number integer;
begin
 if v_uid is null then raise exception 'AUTH_REQUIRED'; end if;
 if p_operation_id is null then raise exception 'INVALID_TRADE'; end if;
 perform app_private.get_gold_wallet();
 select * into v_wallet from public.player_wallets where user_id=v_uid for update;
 select * into v_previous from public.gold_transactions where user_id=v_uid and operation_id=p_operation_id;
 if found then
  if v_previous.action<>'buy' or v_previous.item_id is distinct from 'aquarium:tank' then raise exception 'OPERATION_CONFLICT'; end if;
  return app_private.get_gold_wallet() || jsonb_build_object('delta',0);
 end if;
 if v_wallet.gold<200 then raise exception 'INSUFFICIENT_GOLD'; end if;
 perform app_private.aquarium_state();
 select count(*)+1 into v_number from public.aquarium_tanks where user_id=v_uid;
 update public.player_wallets set gold=gold-200,updated_at=now() where user_id=v_uid;
 insert into public.aquarium_tanks(user_id,name) values(v_uid,'어항 '||v_number::text);
 insert into public.gold_transactions(user_id,operation_id,action,item_id,delta) values(v_uid,p_operation_id,'buy','aquarium:tank',-200);
 return app_private.get_gold_wallet() || jsonb_build_object('delta',-200);
end $$;
create function app_private.manage_aquarium_tank(p_tank_id uuid,p_action text,p_value text) returns jsonb
language plpgsql security definer set search_path='' as $$
declare v_uid uuid:=auth.uid(); v_tank public.aquarium_tanks; v_name text;
begin
 if v_uid is null then raise exception 'AUTH_REQUIRED'; end if;
 select * into v_tank from public.aquarium_tanks where id=p_tank_id and user_id=v_uid for update;
 if not found then raise exception 'TANK_NOT_FOUND'; end if;
 if p_action='rename' then
  v_name:=btrim(p_value);
  if v_name is null or char_length(v_name) not between 1 and 20 or v_name ~ '[[:cntrl:]]' then raise exception 'INVALID_TANK_NAME'; end if;
  update public.aquarium_tanks set name=v_name where id=p_tank_id;
 elsif p_action='equip' then
  if p_value is null or not exists(select 1 from public.aquarium_backgrounds where id=p_value) then raise exception 'INVALID_ITEM'; end if;
  if p_value<>'default' and not exists(select 1 from public.owned_aquarium_backgrounds where user_id=v_uid and background_id=p_value) then raise exception 'BACKGROUND_NOT_OWNED'; end if;
  update public.aquarium_tanks set background_id=p_value where id=p_tank_id;
  if v_tank.is_default then update public.player_aquariums set background_id=p_value where user_id=v_uid; end if;
 else raise exception 'INVALID_TRADE';
 end if;
 return app_private.aquarium_state();
end $$;
create function public.buy_aquarium_tank(p_operation_id uuid) returns jsonb language sql security invoker set search_path='' as $$select app_private.buy_aquarium_tank(p_operation_id)$$;
create function public.manage_aquarium_tank(p_tank_id uuid,p_action text,p_value text) returns jsonb language sql security invoker set search_path='' as $$select app_private.manage_aquarium_tank(p_tank_id,p_action,p_value)$$;
revoke all on function app_private.buy_aquarium_tank(uuid),public.buy_aquarium_tank(uuid),app_private.manage_aquarium_tank(uuid,text,text),public.manage_aquarium_tank(uuid,text,text) from public,anon;
grant execute on function app_private.buy_aquarium_tank(uuid),public.buy_aquarium_tank(uuid),app_private.manage_aquarium_tank(uuid,text,text),public.manage_aquarium_tank(uuid,text,text) to authenticated;
-- Retire ambiguous old equip calls: all background changes must name a tank.
create or replace function public.aquarium_background(p_id text,p_action text,p_operation_id uuid default null) returns jsonb
language plpgsql security invoker set search_path='' as $$
begin
 if p_action='equip' then raise exception 'TANK_REQUIRED'; end if;
 return app_private.aquarium_background(p_id,p_action,p_operation_id);
end $$;
create or replace function app_private.aquarium_background(p_id text,p_action text,p_operation_id uuid default null) returns jsonb
language plpgsql security definer set search_path='' as $$
declare v_uid uuid:=auth.uid(); v_item public.aquarium_backgrounds; v_wallet public.player_wallets; v_old public.gold_transactions;
begin
 if v_uid is null then raise exception 'AUTH_REQUIRED'; end if;
 if p_action is null or p_action not in ('buy','equip') then raise exception 'INVALID_TRADE'; end if;
 select * into v_item from public.aquarium_backgrounds where id=p_id;
 if not found then raise exception 'INVALID_ITEM'; end if;
 perform app_private.get_gold_wallet();
 select * into v_wallet from public.player_wallets where user_id=v_uid for update;
 if p_action='equip' then raise exception 'TANK_REQUIRED'; end if;
 if p_operation_id is null then raise exception 'INVALID_TRADE'; end if;
 select * into v_old from public.gold_transactions where user_id=v_uid and operation_id=p_operation_id;
 if found then
  if v_old.action<>'buy' or v_old.item_id is distinct from ('background:'||p_id) then raise exception 'OPERATION_CONFLICT'; end if;
  return app_private.get_gold_wallet() || jsonb_build_object('delta',0);
 end if;
 if p_id='default' or exists(select 1 from public.owned_aquarium_backgrounds where user_id=v_uid and background_id=p_id) then raise exception 'BACKGROUND_ALREADY_OWNED'; end if;
 if v_wallet.gold<v_item.price then raise exception 'INSUFFICIENT_GOLD'; end if;
 update public.player_wallets set gold=gold-v_item.price,updated_at=now() where user_id=v_uid;
 insert into public.owned_aquarium_backgrounds(user_id,background_id) values(v_uid,p_id);
 insert into public.gold_transactions(user_id,operation_id,action,item_id,delta) values(v_uid,p_operation_id,'buy','background:'||p_id,-v_item.price);
 return app_private.get_gold_wallet() || jsonb_build_object('delta',-v_item.price);
end $$;

notify pgrst,'reload schema';

set constraints all immediate;
set constraints all deferred;

-- SOURCE: 11-regions/01-regions.sql
-- Apply after 10. Shared rarity enum is reusable for fish and items.

create type public.game_rarity as enum('common','rare','epic','mythic');
create table public.regions (
 id text primary key,name text not null,description text not null,
 rarity public.game_rarity not null,sort_order integer not null unique,
 image_path text not null unique,requires_map_fragment boolean not null default true
);
insert into public.regions values
('pongdang','퐁당섬 앞바다','햇살이 부서지는 잔잔한 바다. 작은 물고기들과 첫 낚시를 시작하는 곳이에요.','common',1,'pongdang.png',false),
('coral','산호빛 여울','파스텔빛 산호 사이로 빠른 물살이 흘러요. 날쌘 물고기들이 여울 속에 숨어 있어요.','common',2,'coral.png',true),
('mistmoon','안개달 해역','은빛 안개와 달빛이 겹치는 고요한 해역. 물결 너머 낯선 움직임이 느껴져요.','common',3,'mistmoon.png',true),
('starruins','별잠 유적','별빛을 품은 오래된 유적. 잠든 바다의 기억과 희귀한 생명이 머물러요.','rare',4,'starruins.png',true),
('dreamabyss','꿈먹는 심연','보랏빛 물결이 어둠 속으로 이어져요. 바다 깊이 감춰진 신비가 기다리고 있어요.','epic',5,'dreamabyss.png',true);
create table public.player_map_fragments (
 user_id uuid not null references auth.users(id) on delete cascade,
 region_id text not null references public.regions(id),
 acquired_at timestamptz not null default now(),primary key(user_id,region_id)
);
create table public.player_navigation (
 user_id uuid primary key references auth.users(id) on delete cascade,
 region_id text not null default 'pongdang' references public.regions(id)
);
alter table public.regions enable row level security;
alter table public.player_map_fragments enable row level security;
alter table public.player_navigation enable row level security;
revoke all on public.regions,public.player_map_fragments,public.player_navigation from public,anon,authenticated;
grant select on public.regions,public.player_map_fragments,public.player_navigation to authenticated;
create policy regions_catalog_read on public.regions for select to authenticated using(true);
create policy fragments_owner_read on public.player_map_fragments for select to authenticated using(user_id=(select auth.uid()));
create policy navigation_owner_read on public.player_navigation for select to authenticated using(user_id=(select auth.uid()));
insert into storage.buckets(id,name,public,file_size_limit,allowed_mime_types)
values('regions','regions',true,10485760,array['image/png','image/webp']) on conflict(id) do nothing;
create function app_private.region_map() returns jsonb language plpgsql security definer set search_path='' as $$
declare v_uid uuid:=auth.uid();
begin
 if v_uid is null then raise exception 'AUTH_REQUIRED'; end if;
 insert into public.player_navigation(user_id) values(v_uid) on conflict do nothing;
 return jsonb_build_object('currentRegion',(select region_id from public.player_navigation where user_id=v_uid),
 'regions',(select jsonb_agg(to_jsonb(r)||jsonb_build_object('unlocked',not r.requires_map_fragment or f.region_id is not null,'hasFragment',f.region_id is not null) order by r.sort_order)
 from public.regions r left join public.player_map_fragments f on f.region_id=r.id and f.user_id=v_uid));
end $$;
create function app_private.travel_region(p_region_id text) returns jsonb language plpgsql security definer set search_path='' as $$
declare v_uid uuid:=auth.uid(); v_region public.regions;
begin
 if v_uid is null then raise exception 'AUTH_REQUIRED'; end if;
 select * into v_region from public.regions where id=p_region_id;
 if not found then raise exception 'REGION_NOT_FOUND'; end if;
 if v_region.requires_map_fragment then
  perform 1 from public.player_map_fragments where user_id=v_uid and region_id=p_region_id for share;
  if not found then raise exception 'REGION_LOCKED'; end if;
 end if;
 insert into public.player_navigation(user_id,region_id) values(v_uid,p_region_id)
 on conflict(user_id) do update set region_id=excluded.region_id;
 return app_private.region_map();
end $$;
create function public.region_map() returns jsonb language sql security invoker set search_path='' as $$select app_private.region_map()$$;
create function public.travel_region(p_region_id text) returns jsonb language sql security invoker set search_path='' as $$select app_private.travel_region(p_region_id)$$;
revoke all on function app_private.region_map(),public.region_map(),app_private.travel_region(text),public.travel_region(text) from public,anon;
grant execute on function app_private.region_map(),public.region_map(),app_private.travel_region(text),public.travel_region(text) to authenticated;
notify pgrst,'reload schema';

set constraints all immediate;
set constraints all deferred;

-- SOURCE: 12-region-travel/01-travel.sql
-- Apply after 11. Development-only own-account lock controls; disable before release.

create table app_private.region_settings (
 id boolean primary key default true check(id), test_lock_controls boolean not null default true
);
insert into app_private.region_settings(id) values(true);
alter table app_private.region_settings enable row level security;
revoke all on app_private.region_settings from public,anon,authenticated;
create or replace function app_private.region_map() returns jsonb language plpgsql security definer set search_path='' as $$
declare v_uid uuid:=auth.uid();
begin
 if v_uid is null then raise exception 'AUTH_REQUIRED'; end if;
 insert into public.player_navigation(user_id) values(v_uid) on conflict do nothing;
 return jsonb_build_object('currentRegion',(select region_id from public.player_navigation where user_id=v_uid),
 'canTestLocks',coalesce((select test_lock_controls from app_private.region_settings where id),false),
 'regions',(select jsonb_agg(to_jsonb(r)||jsonb_build_object('unlocked',not r.requires_map_fragment or f.region_id is not null,'hasFragment',f.region_id is not null) order by r.sort_order)
 from public.regions r left join public.player_map_fragments f on f.region_id=r.id and f.user_id=v_uid));
end $$;
create or replace function app_private.travel_region(p_region_id text) returns jsonb language plpgsql security definer set search_path='' as $$
declare v_uid uuid:=auth.uid(); v_region public.regions;
begin
 if v_uid is null then raise exception 'AUTH_REQUIRED'; end if;
 perform pg_advisory_xact_lock(hashtextextended('region:'||v_uid::text,0));
 select * into v_region from public.regions where id=p_region_id;
 if not found then raise exception 'REGION_NOT_FOUND'; end if;
 if v_region.requires_map_fragment and not exists(select 1 from public.player_map_fragments where user_id=v_uid and region_id=p_region_id) then raise exception 'REGION_LOCKED'; end if;
 insert into public.player_navigation(user_id,region_id) values(v_uid,p_region_id)
 on conflict(user_id) do update set region_id=excluded.region_id;
 return app_private.region_map();
end $$;
create function app_private.set_region_test_lock(p_region_id text,p_locked boolean) returns jsonb language plpgsql security definer set search_path='' as $$
declare v_uid uuid:=auth.uid(); v_region public.regions;
begin
 if v_uid is null then raise exception 'AUTH_REQUIRED'; end if;
 if not coalesce((select test_lock_controls from app_private.region_settings where id),false) then raise exception 'TEST_CONTROLS_DISABLED'; end if;
 if p_locked is null then raise exception 'INVALID_LOCK_STATE'; end if;
 perform pg_advisory_xact_lock(hashtextextended('region:'||v_uid::text,0));
 select * into v_region from public.regions where id=p_region_id;
 if not found then raise exception 'REGION_NOT_FOUND'; end if;
 if not v_region.requires_map_fragment then raise exception 'DEFAULT_REGION_ALWAYS_OPEN'; end if;
 if p_locked then
  delete from public.player_map_fragments where user_id=v_uid and region_id=p_region_id;
  update public.player_navigation set region_id='pongdang' where user_id=v_uid and region_id=p_region_id;
 else
  insert into public.player_map_fragments(user_id,region_id) values(v_uid,p_region_id) on conflict do nothing;
 end if;
 return app_private.region_map();
end $$;
create function public.set_region_test_lock(p_region_id text,p_locked boolean) returns jsonb language sql security invoker set search_path='' as $$select app_private.set_region_test_lock(p_region_id,p_locked)$$;
revoke all on function app_private.set_region_test_lock(text,boolean),public.set_region_test_lock(text,boolean) from public,anon;
grant execute on function app_private.set_region_test_lock(text,boolean),public.set_region_test_lock(text,boolean) to authenticated;
notify pgrst,'reload schema';

set constraints all immediate;
set constraints all deferred;

-- SOURCE: 13-fishing/01-fishing.sql
-- Apply after 12. One cast consumes exactly one bait, including failed casts.

create table public.fishing_baits (
 id text primary key,name text not null,description text not null,price integer not null check(price>0),
 image_path text not null,sort_order integer not null unique,
 common_bp integer not null check(common_bp>=0),rare_bp integer not null check(rare_bp>=0),
 epic_bp integer not null check(epic_bp>=0),mythic_bp integer not null check(mythic_bp>=0),
 failure_bp integer not null check(failure_bp>=0),
 check(common_bp+rare_bp+epic_bp+mythic_bp+failure_bp=10000)
);
insert into public.fishing_baits values
('bait','일반 미끼','기본 확률로 바다에 도전해요.',30,'/items/baits/normal.png',1,3000,1000,100,30,5870),
('bait_special','특수 미끼','실패 없이 최소 희귀 등급을 보장해요.',300,'/items/baits/special.png',2,0,9870,100,30,0),
('bait_safe','안전 미끼','기본 실패 확률을 20% 줄여요. (58.7% → 46.96%)',100,'/items/baits/safe.png',3,4174,1000,100,30,4696);
create table public.fishing_attempts (
 user_id uuid not null references auth.users(id) on delete cascade,operation_id uuid not null,
 region_id text not null references public.regions(id),bait_id text not null references public.fishing_baits(id),
 rarity public.game_rarity,created_at timestamptz not null default now(),primary key(user_id,operation_id)
);
create index fishing_attempts_recent on public.fishing_attempts(user_id,created_at desc);
create table public.player_catch_counts (
 user_id uuid not null references auth.users(id) on delete cascade,rarity public.game_rarity not null,
 quantity integer not null check(quantity>0),primary key(user_id,rarity)
);
alter table public.fishing_baits enable row level security;
alter table public.fishing_attempts enable row level security;
alter table public.player_catch_counts enable row level security;
revoke all on public.fishing_baits,public.fishing_attempts,public.player_catch_counts from public,anon,authenticated;
grant select on public.fishing_baits,public.fishing_attempts,public.player_catch_counts to authenticated;
create policy baits_catalog_read on public.fishing_baits for select to authenticated using(true);
create policy attempts_owner_read on public.fishing_attempts for select to authenticated using(user_id=(select auth.uid()));
create policy catch_counts_owner_read on public.player_catch_counts for select to authenticated using(user_id=(select auth.uid()));

-- Pure resolver for deterministic boundary tests. Never exposed to clients.
create function app_private.resolve_fishing(p_bait_id text,p_roll integer) returns public.game_rarity
language plpgsql stable set search_path='' as $$
declare b public.fishing_baits;
begin
 if p_roll is null or p_roll<0 or p_roll>=10000 then raise exception 'INVALID_ROLL'; end if;
 select * into b from public.fishing_baits where id=p_bait_id;
 if not found then raise exception 'INVALID_BAIT'; end if;
 if p_roll<b.mythic_bp then return 'mythic'; end if;
 if p_roll<b.mythic_bp+b.epic_bp then return 'epic'; end if;
 if p_roll<b.mythic_bp+b.epic_bp+b.rare_bp then return 'rare'; end if;
 if p_roll<b.mythic_bp+b.epic_bp+b.rare_bp+b.common_bp then return 'common'; end if;
 return null;
end $$;
revoke all on function app_private.resolve_fishing(text,integer) from public,anon,authenticated;
create function app_private.fishing_state() returns jsonb language plpgsql security definer set search_path='' as $$
declare v_uid uuid:=auth.uid();
begin
 if v_uid is null then raise exception 'AUTH_REQUIRED'; end if;
 return jsonb_build_object('baits',(select jsonb_agg(to_jsonb(b) order by b.sort_order) from public.fishing_baits b),
 'catches',coalesce((select jsonb_object_agg(rarity,quantity) from public.player_catch_counts where user_id=v_uid),'{}'::jsonb),
 'recent',coalesce((select jsonb_agg(to_jsonb(a) order by a.created_at desc) from (select operation_id,region_id,bait_id,rarity,created_at from public.fishing_attempts where user_id=v_uid order by created_at desc limit 10) a),'[]'::jsonb));
end $$;
create function app_private.buy_fishing_bait(p_bait_id text,p_operation_id uuid) returns jsonb language plpgsql security definer set search_path='' as $$
declare v_uid uuid:=auth.uid(); b public.fishing_baits; w public.player_wallets; prev public.gold_transactions;
begin
 if v_uid is null then raise exception 'AUTH_REQUIRED'; end if;
 if p_operation_id is null then raise exception 'INVALID_TRADE'; end if;
 select * into b from public.fishing_baits where id=p_bait_id;
 if not found then raise exception 'INVALID_BAIT'; end if;
 perform app_private.get_gold_wallet();
 select * into w from public.player_wallets where user_id=v_uid for update;
 select * into prev from public.gold_transactions where user_id=v_uid and operation_id=p_operation_id;
 if found then
  if prev.action<>'buy' or prev.item_id is distinct from ('fishing:'||p_bait_id) then raise exception 'OPERATION_CONFLICT'; end if;
  return app_private.get_gold_wallet()||jsonb_build_object('delta',0);
 end if;
 if w.gold<b.price then raise exception 'INSUFFICIENT_GOLD'; end if;
 update public.player_wallets set gold=gold-b.price,
 inventory=jsonb_set(inventory,array[p_bait_id],to_jsonb(coalesce((inventory->>p_bait_id)::integer,0)+1)),updated_at=now() where user_id=v_uid;
 insert into public.gold_transactions(user_id,operation_id,action,item_id,delta) values(v_uid,p_operation_id,'buy','fishing:'||p_bait_id,-b.price);
 return app_private.get_gold_wallet()||jsonb_build_object('delta',-b.price);
end $$;
create function app_private.cast_fishing(p_region_id text,p_bait_id text,p_operation_id uuid) returns jsonb language plpgsql security definer set search_path='' as $$
declare v_uid uuid:=auth.uid(); w public.player_wallets; a public.fishing_attempts; v_current text; v_required boolean; v_count integer; v_rarity public.game_rarity;
begin
 if v_uid is null then raise exception 'AUTH_REQUIRED'; end if;
 if p_operation_id is null then raise exception 'INVALID_TRADE'; end if;
 perform pg_advisory_xact_lock(hashtextextended('region:'||v_uid::text,0));
 perform app_private.get_gold_wallet();
 select * into w from public.player_wallets where user_id=v_uid for update;
 select * into a from public.fishing_attempts where user_id=v_uid and operation_id=p_operation_id;
 if found then
  if a.region_id is distinct from p_region_id or a.bait_id is distinct from p_bait_id then raise exception 'OPERATION_CONFLICT'; end if;
  return jsonb_build_object('attempt',to_jsonb(a),'replayed',true);
 end if;
 if not exists(select 1 from public.fishing_baits where id=p_bait_id) then raise exception 'INVALID_BAIT'; end if;
 select requires_map_fragment into v_required from public.regions where id=p_region_id;
 if not found then raise exception 'REGION_NOT_FOUND'; end if;
 select region_id into v_current from public.player_navigation where user_id=v_uid;
 if v_current is distinct from p_region_id then raise exception 'NOT_IN_REGION'; end if;
 if v_required and not exists(select 1 from public.player_map_fragments where user_id=v_uid and region_id=p_region_id) then raise exception 'REGION_LOCKED'; end if;
 v_count:=coalesce((w.inventory->>p_bait_id)::integer,0);
 if v_count<1 then raise exception 'NO_BAIT'; end if;
 v_rarity:=app_private.resolve_fishing(p_bait_id,floor(random()*10000)::integer);
 update public.player_wallets set inventory=jsonb_set(inventory,array[p_bait_id],to_jsonb(v_count-1)),updated_at=now() where user_id=v_uid;
 insert into public.fishing_attempts(user_id,operation_id,region_id,bait_id,rarity) values(v_uid,p_operation_id,p_region_id,p_bait_id,v_rarity) returning * into a;
 if v_rarity is not null then
  insert into public.player_catch_counts(user_id,rarity,quantity) values(v_uid,v_rarity,1)
  on conflict(user_id,rarity) do update set quantity=public.player_catch_counts.quantity+1;
 end if;
 return jsonb_build_object('attempt',to_jsonb(a),'replayed',false);
end $$;
create function public.fishing_state() returns jsonb language sql security invoker set search_path='' as $$select app_private.fishing_state()$$;
create function public.buy_fishing_bait(p_bait_id text,p_operation_id uuid) returns jsonb language sql security invoker set search_path='' as $$select app_private.buy_fishing_bait(p_bait_id,p_operation_id)$$;
create function public.cast_fishing(p_region_id text,p_bait_id text,p_operation_id uuid) returns jsonb language sql security invoker set search_path='' as $$select app_private.cast_fishing(p_region_id,p_bait_id,p_operation_id)$$;
revoke all on function app_private.fishing_state(),public.fishing_state(),app_private.buy_fishing_bait(text,uuid),public.buy_fishing_bait(text,uuid),app_private.cast_fishing(text,text,uuid),public.cast_fishing(text,text,uuid) from public,anon;
grant execute on function app_private.fishing_state(),public.fishing_state(),app_private.buy_fishing_bait(text,uuid),public.buy_fishing_bait(text,uuid),app_private.cast_fishing(text,text,uuid),public.cast_fishing(text,text,uuid) to authenticated;
create or replace function app_private.trade_gold(p_operation_id uuid,p_action text,p_item_id text default null) returns jsonb
language plpgsql security definer set search_path='' as $$
declare v_uid uuid:=auth.uid(); v_wallet public.player_wallets; v_previous public.gold_transactions; v_delta integer; v_count integer; v_price integer;
begin
 if v_uid is null then raise exception 'AUTH_REQUIRED'; end if;
 if p_operation_id is null or p_action is null or p_action not in ('charge','buy','sell') then raise exception 'INVALID_TRADE'; end if;
 insert into public.player_wallets(user_id) values(v_uid) on conflict do nothing;
 select * into v_wallet from public.player_wallets where user_id=v_uid for update;
 select * into v_previous from public.gold_transactions where user_id=v_uid and operation_id=p_operation_id;
 if found then
  if v_previous.action<>p_action or v_previous.item_id is distinct from p_item_id then raise exception 'OPERATION_CONFLICT'; end if;
  return app_private.get_gold_wallet() || jsonb_build_object('delta',0);
 end if;
 if p_action='charge' then
  if p_item_id is not null then raise exception 'INVALID_TRADE'; end if;
  if not coalesce((select test_charge_enabled from app_private.gold_settings where id),false) then raise exception 'TEST_CHARGE_DISABLED'; end if;
  if v_wallet.test_claimed then raise exception 'TEST_CHARGE_ALREADY_CLAIMED'; end if;
  v_delta:=1000;
 else
  if p_item_id is null or p_item_id not in ('bait','shell') then raise exception 'INVALID_ITEM'; end if;
  v_count:=coalesce((v_wallet.inventory->>p_item_id)::integer,0);
  v_price:=case p_item_id when 'bait' then 30 else 300 end;
  if p_action='buy' then
   if v_wallet.gold<v_price then raise exception 'INSUFFICIENT_GOLD'; end if;
   v_delta:=-v_price; v_count:=v_count+1;
  else
   if v_count<1 then raise exception 'INSUFFICIENT_INVENTORY'; end if;
   v_delta:=v_price*6/10; v_count:=v_count-1;
  end if;
  v_wallet.inventory:=jsonb_set(v_wallet.inventory,array[p_item_id],to_jsonb(v_count));
 end if;
 if v_wallet.gold+v_delta>1000000000 then raise exception 'GOLD_LIMIT'; end if;
 update public.player_wallets set gold=gold+v_delta,inventory=v_wallet.inventory,test_claimed=test_claimed or p_action='charge',updated_at=now() where user_id=v_uid;
 insert into public.gold_transactions(user_id,operation_id,action,item_id,delta) values(v_uid,p_operation_id,p_action,p_item_id,v_delta);
 return app_private.get_gold_wallet() || jsonb_build_object('delta',v_delta);
end $$;

notify pgrst,'reload schema';

set constraints all immediate;
set constraints all deferred;

-- SOURCE: 14-bait-catalog/01-baits.sql
-- Apply after 13. Existing bait inventory keys and fishing history are retained.

alter table public.fishing_baits alter column price drop not null;
alter table public.fishing_baits add column effect_kind text not null default 'fish' check(effect_kind in ('fish','decoration'));
alter table public.fishing_baits add column effect_description text not null default '';
update public.fishing_baits set
 name='퐁당 지렁이',
 description='퐁당섬의 촉촉한 모래와 풀숲에서만 서식하는 선홍빛 지렁이. 물속에서도 꼬물꼬물 움직여 물고기의 호기심을 자극한다. 매우 흔하고 구하기 쉬워, 섬의 초보 낚시꾼들이 가장 먼저 챙기는 미끼다.',
 effect_description='기본 확률로 낚시한다. 실패해도 미끼 1개를 소모한다.',
 image_path='/items/baits/pongdang-worm.png',price=30 where id='bait';
update public.fishing_baits set
 name='달빛 진주새우',
 description='달빛이 스며드는 얕은 바다에서 자라는 작은 진주새우. 반투명한 껍질 속 푸른 진주가 은은하게 빛나며, 평범한 먹이에는 다가오지 않던 진귀한 물고기까지 불러 모은다고 한다.',
 effect_description='실패 없이 최소 희귀 등급을 보장한다. 희귀 98.7% · 특급 1% · 신화 0.3%.',price=null where id='bait_special';
update public.fishing_baits set
 name='이슬잎 경단',
 description='새벽 이슬을 머금은 어린 잎에 향긋한 해초 반죽을 감싼 수제 미끼. 작은 쇠바늘에 단단히 붙어 쉽게 흩어지지 않고, 잎 사이로 퍼지는 순한 향이 경계심 많은 물고기를 안심시킨다.',
 effect_description='기본 실패 확률을 상대적으로 20% 줄인다. 실패 58.7% → 46.96%. 실패 시에도 소모된다.',
 image_path='/items/baits/dewleaf-dumpling.png',price=null where id='bait_safe';
insert into public.fishing_baits(id,name,description,price,image_path,sort_order,common_bp,rare_bp,epic_bp,mythic_bp,failure_bp,effect_kind,effect_description) values
('bait_magnet','심해 인력석','깊은 해구에서 건져 올린 푸른 자철석을 다듬어 만든 인양용 미끼. 물고기 대신 바다 아래 잠든 장식물에 반응하며, 오래전에 가라앉은 보물의 흔적을 조용히 끌어당긴다.',null,'/items/baits/abyss-lodestone.png',4,0,0,0,0,10000,'decoration','장식물 전용 미끼. 사용 시 장식물 획득을 보장하도록 준비 중이며, 현재는 사용하거나 소모할 수 없다.'),
('bait_epic','별잠의 유혹','별잠 유적의 틈에 맺힌 별가루를 자수정 조각에 봉인한 미끼. 물결에 닿으면 보랏빛 잔광이 길게 번져, 깊은 바다에 몸을 숨긴 비범한 생명까지 잠에서 깨운다고 전해진다.',null,'/items/baits/starlit-allure.png',5,0,0,9970,30,0,'fish','실패 없이 최소 특급 등급을 보장한다. 특급 99.7% · 신화 0.3%.');
create or replace function app_private.resolve_fishing(p_bait_id text,p_roll integer) returns public.game_rarity
language plpgsql stable set search_path='' as $$
declare b public.fishing_baits;
begin
 if p_roll is null or p_roll<0 or p_roll>=10000 then raise exception 'INVALID_ROLL'; end if;
 select * into b from public.fishing_baits where id=p_bait_id;
 if not found then raise exception 'INVALID_BAIT'; end if;
 if b.effect_kind='decoration' then raise exception 'DECORATION_NOT_READY'; end if;
 if p_roll<b.mythic_bp then return 'mythic'; end if;
 if p_roll<b.mythic_bp+b.epic_bp then return 'epic'; end if;
 if p_roll<b.mythic_bp+b.epic_bp+b.rare_bp then return 'rare'; end if;
 if p_roll<b.mythic_bp+b.epic_bp+b.rare_bp+b.common_bp then return 'common'; end if;
 return null;
end $$;

create or replace function app_private.buy_fishing_bait(p_bait_id text,p_operation_id uuid) returns jsonb language plpgsql security definer set search_path='' as $$
declare v_uid uuid:=auth.uid(); b public.fishing_baits; w public.player_wallets; prev public.gold_transactions;
begin
 if v_uid is null then raise exception 'AUTH_REQUIRED'; end if;
 if p_operation_id is null then raise exception 'INVALID_TRADE'; end if;
 select * into b from public.fishing_baits where id=p_bait_id;
 if not found then raise exception 'INVALID_BAIT'; end if;
 perform app_private.get_gold_wallet();
 select * into w from public.player_wallets where user_id=v_uid for update;
 select * into prev from public.gold_transactions where user_id=v_uid and operation_id=p_operation_id;
 if found then
  if prev.action<>'buy' or prev.item_id is distinct from ('fishing:'||p_bait_id) then raise exception 'OPERATION_CONFLICT'; end if;
  return app_private.get_gold_wallet()||jsonb_build_object('delta',0);
 end if;
 if b.price is null then raise exception 'BAIT_NOT_FOR_SALE'; end if;
 if w.gold<b.price then raise exception 'INSUFFICIENT_GOLD'; end if;
 update public.player_wallets set gold=gold-b.price,
 inventory=jsonb_set(inventory,array[p_bait_id],to_jsonb(coalesce((inventory->>p_bait_id)::integer,0)+1)),updated_at=now() where user_id=v_uid;
 insert into public.gold_transactions(user_id,operation_id,action,item_id,delta) values(v_uid,p_operation_id,'buy','fishing:'||p_bait_id,-b.price);
 return app_private.get_gold_wallet()||jsonb_build_object('delta',-b.price);
end $$;

create or replace function app_private.cast_fishing(p_region_id text,p_bait_id text,p_operation_id uuid) returns jsonb language plpgsql security definer set search_path='' as $$
declare v_uid uuid:=auth.uid(); w public.player_wallets; a public.fishing_attempts; v_current text; v_required boolean; v_count integer; v_rarity public.game_rarity;
begin
 if v_uid is null then raise exception 'AUTH_REQUIRED'; end if;
 if p_operation_id is null then raise exception 'INVALID_TRADE'; end if;
 perform pg_advisory_xact_lock(hashtextextended('region:'||v_uid::text,0));
 perform app_private.get_gold_wallet();
 select * into w from public.player_wallets where user_id=v_uid for update;
 select * into a from public.fishing_attempts where user_id=v_uid and operation_id=p_operation_id;
 if found then
  if a.region_id is distinct from p_region_id or a.bait_id is distinct from p_bait_id then raise exception 'OPERATION_CONFLICT'; end if;
  return jsonb_build_object('attempt',to_jsonb(a),'replayed',true);
 end if;
 if not exists(select 1 from public.fishing_baits where id=p_bait_id) then raise exception 'INVALID_BAIT'; end if;
 if exists(select 1 from public.fishing_baits where id=p_bait_id and effect_kind='decoration') then raise exception 'DECORATION_NOT_READY'; end if;
 select requires_map_fragment into v_required from public.regions where id=p_region_id;
 if not found then raise exception 'REGION_NOT_FOUND'; end if;
 select region_id into v_current from public.player_navigation where user_id=v_uid;
 if v_current is distinct from p_region_id then raise exception 'NOT_IN_REGION'; end if;
 if v_required and not exists(select 1 from public.player_map_fragments where user_id=v_uid and region_id=p_region_id) then raise exception 'REGION_LOCKED'; end if;
 v_count:=coalesce((w.inventory->>p_bait_id)::integer,0);
 if v_count<1 then raise exception 'NO_BAIT'; end if;
 v_rarity:=app_private.resolve_fishing(p_bait_id,floor(random()*10000)::integer);
 update public.player_wallets set inventory=jsonb_set(inventory,array[p_bait_id],to_jsonb(v_count-1)),updated_at=now() where user_id=v_uid;
 insert into public.fishing_attempts(user_id,operation_id,region_id,bait_id,rarity) values(v_uid,p_operation_id,p_region_id,p_bait_id,v_rarity) returning * into a;
 if v_rarity is not null then
  insert into public.player_catch_counts(user_id,rarity,quantity) values(v_uid,v_rarity,1)
  on conflict(user_id,rarity) do update set quantity=public.player_catch_counts.quantity+1;
 end if;
 return jsonb_build_object('attempt',to_jsonb(a),'replayed',false);
end $$;

notify pgrst,'reload schema';

set constraints all immediate;
set constraints all deferred;

-- SOURCE: 15-collectibles/01-collectibles.sql
-- Apply after 14. Requested reset: deletes ALL legacy fishing attempts and rarity counters.
-- Wallets, bait counts, gold history, tanks and backgrounds remain intact.

truncate table public.fishing_attempts;
create type public.collectible_kind as enum('fish','trash','decoration','map');
create table public.collectible_species (
 id text primary key,kind public.collectible_kind not null,name text not null,description text not null,
 swim_y_min numeric,swim_y_max numeric,speed numeric not null default 0 check(speed between 0 and 0.5),
 size integer not null check(size between 16 and 180),rarity public.game_rarity,
 sprite_paths text[] not null default '{}',thumbnail_path text not null,sell_price integer not null check(sell_price between 0 and 1000000),
 check((kind in ('decoration','map') and swim_y_min is null and swim_y_max is null and speed=0) or
 (kind in ('fish','trash') and swim_y_min>=0 and swim_y_max<=1 and swim_y_min<=swim_y_max and swim_y_min is not null and swim_y_max is not null and speed>0)),
 check((kind='fish' and cardinality(sprite_paths)=4) or(kind<>'fish' and cardinality(sprite_paths)=0)),
 check((kind in ('trash','map') and rarity is null) or(kind in ('fish','decoration') and rarity is not null))
);
create table public.collectible_habitats (
 species_id text not null references public.collectible_species(id) on delete cascade,
 region_id text not null references public.regions(id),primary key(species_id,region_id)
);
create index collectible_habitats_region on public.collectible_habitats(region_id,species_id);
create unique index aquarium_tanks_id_owner on public.aquarium_tanks(id,user_id);
create table public.player_collectibles (
 id uuid primary key default gen_random_uuid(),user_id uuid not null references auth.users(id) on delete cascade,
 species_id text not null references public.collectible_species(id),tank_id uuid, map_region_id text references public.regions(id),
 animation_seed integer not null default floor(random()*1000000)::integer,
 position_x numeric check(position_x between 0 and 1),position_y numeric check(position_y between 0 and 1),
 acquired_at timestamptz not null default now(),sold_at timestamptz,
 foreign key(tank_id,user_id) references public.aquarium_tanks(id,user_id)
);
create index collectibles_owner on public.player_collectibles(user_id,acquired_at desc) where sold_at is null;
create index collectibles_tank on public.player_collectibles(tank_id) where sold_at is null;
create table public.player_discoveries (
 user_id uuid not null references auth.users(id) on delete cascade,species_id text not null references public.collectible_species(id),
 discovered_at timestamptz not null default now(),primary key(user_id,species_id)
);
alter table public.fishing_attempts add column collectible_id uuid references public.player_collectibles(id);
alter table public.collectible_species enable row level security;
alter table public.collectible_habitats enable row level security;
alter table public.player_collectibles enable row level security;
alter table public.player_discoveries enable row level security;
revoke all on public.collectible_species,public.collectible_habitats,public.player_collectibles,public.player_discoveries from public,anon,authenticated;
grant select on public.collectible_species,public.collectible_habitats,public.player_collectibles,public.player_discoveries to authenticated;
create policy species_read on public.collectible_species for select to authenticated using(true);
create policy habitats_read on public.collectible_habitats for select to authenticated using(true);
create policy collectible_owner_read on public.player_collectibles for select to authenticated using(user_id=(select auth.uid()));
create policy discovery_owner_read on public.player_discoveries for select to authenticated using(user_id=(select auth.uid()));
insert into storage.buckets(id,name,public,file_size_limit,allowed_mime_types)
values('collectibles','collectibles',true,10485760,array['image/png','image/webp']) on conflict(id) do nothing;

insert into public.collectible_species(id,kind,name,description,swim_y_min,swim_y_max,speed,size,rarity,sprite_paths,thumbnail_path,sell_price) values
('pongul','fish','퐁울복','퐁당섬의 잔잔한 물결을 따라 헤엄치는 작은 복어. 볼에 햇살 같은 무늬가 있어 언제나 웃는 것처럼 보인다.',0.20,0.65,0.055,72,'common',array['fish/swim-1.png','fish/swim-2.png','fish/swim-3.png','fish/swim-4.png'],'fish/thumbnail.png',40),
('moon-angelfish','fish','달물결 엔젤피쉬','은빛 초승달 무늬를 두른 푸른 엔젤피쉬. 길게 늘어진 지느러미가 달빛 물결처럼 흔들린다.',0.25,0.70,0.050,80,'rare',array['rare/swim-1.png','rare/swim-2.png','rare/swim-3.png','rare/swim-4.png'],'rare/thumbnail.png',180),
('star-ray','fish','별꼬리 가오리','보랏빛 날개에 작은 별무늬가 반짝이는 가오리. 어둑한 물속을 밤하늘처럼 미끄러져 간다.',0.30,0.75,0.045,88,'epic',array['epic/swim-1.png','epic/swim-2.png','epic/swim-3.png','epic/swim-4.png'],'epic/thumbnail.png',600),
('dawn-arowana','fish','여명 아로와나','진주빛 금색 비늘 사이로 새벽빛이 번지는 전설의 물고기. 긴 지느러미가 흘러가는 꿈처럼 물결을 감싼다.',0.20,0.70,0.040,96,'mythic',array['mythic/swim-1.png','mythic/swim-2.png','mythic/swim-3.png','mythic/swim-4.png'],'mythic/thumbnail.png',2000),
('glass-bottle','trash','잊힌 유리병','파도에 오래 씻겨 모서리가 둥글어진 빈 병. 작은 해초가 붙은 채 바닷속에서 빙글빙글 떠다닌다.',0.40,0.80,0.020,55,null,'{}','trash/thumbnail.png',8),
('coral-house','decoration','산호빛 작은 집','분홍 산호와 매끈한 조약돌로 지어진 작은 집. 어항 한쪽에 놓으면 바다 친구들이 쉬어 가기 좋다.',null,null,0,94,'rare','{}','decorations/thumbnail.png',120),
('ocean-map','map','잊힌 항로 조각','물결을 따라 떠내려온 작은 해도 조각. 아직 열리지 않은 항로의 이름과 바다의 기억이 담겨 있다.',null,null,0,60,null,'{}','map/thumbnail.png',0);
-- Sample content is available in every initial region; habitats support any subset later.
insert into public.collectible_habitats(species_id,region_id) select s.id,r.id from public.collectible_species s cross join public.regions r;

create function app_private.species_payload(p_species_id text,p_map_region_id text default null) returns jsonb language sql stable set search_path='' as $$
 select to_jsonb(s)||case when s.kind='map' then jsonb_build_object('name',r.name||' 지도 조각','rarity',r.rarity,'map_region_id',r.id) else '{}'::jsonb end
 from public.collectible_species s left join public.regions r on r.id=p_map_region_id where s.id=p_species_id
$$;
revoke all on function app_private.species_payload(text,text) from public,anon,authenticated;
create function app_private.owned_collectibles() returns jsonb language plpgsql security definer set search_path='' as $$
declare v_uid uuid:=auth.uid();
begin
 if v_uid is null then raise exception 'AUTH_REQUIRED'; end if;
 return coalesce((select jsonb_agg(to_jsonb(c)||jsonb_build_object('species',app_private.species_payload(s.id,c.map_region_id)) order by c.acquired_at desc)
 from public.player_collectibles c join public.collectible_species s on s.id=c.species_id where c.user_id=v_uid and c.sold_at is null),'[]'::jsonb);
end $$;
revoke all on function app_private.owned_collectibles() from public,anon,authenticated;
create function app_private.collection_state() returns jsonb language plpgsql security definer set search_path='' as $$
declare v_uid uuid:=auth.uid();
begin
 if v_uid is null then raise exception 'AUTH_REQUIRED'; end if;
 return jsonb_build_object('items',app_private.owned_collectibles(),
 'catalog',(select coalesce(jsonb_agg(to_jsonb(s)||jsonb_build_object(
 'discovered',d.species_id is not null,'habitats',coalesce((select jsonb_agg(jsonb_build_object('id',r.id,'name',r.name) order by r.sort_order) from public.collectible_habitats h join public.regions r on r.id=h.region_id where h.species_id=s.id),'[]'::jsonb)) order by s.kind,s.id),'[]'::jsonb)
 from public.collectible_species s left join public.player_discoveries d on d.species_id=s.id and d.user_id=v_uid));
end $$;
create or replace function app_private.fishing_state() returns jsonb language plpgsql security definer set search_path='' as $$
begin
 if auth.uid() is null then raise exception 'AUTH_REQUIRED'; end if;
 return jsonb_build_object('baits',(select jsonb_agg(to_jsonb(b) order by b.sort_order) from public.fishing_baits b),'items',app_private.owned_collectibles());
end $$;
create or replace function app_private.cast_fishing(p_region_id text,p_bait_id text,p_operation_id uuid) returns jsonb language plpgsql security definer set search_path='' as $$
declare v_uid uuid:=auth.uid(); w public.player_wallets; a public.fishing_attempts; s public.collectible_species;
 v_current text; v_required boolean; v_count integer; v_rarity public.game_rarity; v_tank uuid; v_item uuid; v_decoration boolean; v_map_region text; v_species_id text;
begin
 if v_uid is null then raise exception 'AUTH_REQUIRED'; end if;
 if p_operation_id is null then raise exception 'INVALID_TRADE'; end if;
 perform pg_advisory_xact_lock(hashtextextended('region:'||v_uid::text,0));
 perform app_private.get_gold_wallet();
 select * into w from public.player_wallets where user_id=v_uid for update;
 select * into a from public.fishing_attempts where user_id=v_uid and operation_id=p_operation_id;
 if found then
  if a.region_id is distinct from p_region_id or a.bait_id is distinct from p_bait_id then raise exception 'OPERATION_CONFLICT'; end if;
  select c.species_id,c.map_region_id into v_species_id,v_map_region from public.player_collectibles c where c.id=a.collectible_id;
  select * into s from public.collectible_species where id=v_species_id;
  return jsonb_build_object('attempt',to_jsonb(a)||jsonb_build_object('species',case when s.id is null then null else app_private.species_payload(s.id,v_map_region) end),'replayed',true);
 end if;
 select effect_kind='decoration' into v_decoration from public.fishing_baits where id=p_bait_id;
 if not found then raise exception 'INVALID_BAIT'; end if;
 select requires_map_fragment into v_required from public.regions where id=p_region_id;
 if not found then raise exception 'REGION_NOT_FOUND'; end if;
 select region_id into v_current from public.player_navigation where user_id=v_uid;
 if v_current is distinct from p_region_id then raise exception 'NOT_IN_REGION'; end if;
 if v_required and not exists(select 1 from public.player_map_fragments where user_id=v_uid and region_id=p_region_id) then raise exception 'REGION_LOCKED'; end if;
 v_count:=coalesce((w.inventory->>p_bait_id)::integer,0);
 if v_count<1 then raise exception 'NO_BAIT'; end if;
 if not v_decoration then v_rarity:=app_private.resolve_fishing(p_bait_id,floor(random()*10000)::integer); end if;
 if v_decoration or v_rarity is not null then
  select c.id,r.id into v_species_id,v_map_region
  from public.collectible_species c join public.collectible_habitats h on h.species_id=c.id
  left join public.regions r on c.kind='map' and r.id=h.region_id
  where
   (h.region_id=p_region_id and ((v_decoration and c.kind='decoration') or
     (not v_decoration and ((c.kind='fish' and c.rarity=v_rarity) or(c.kind='trash' and v_rarity='common')))))
   or (not v_decoration and c.kind='map' and r.requires_map_fragment and r.rarity=v_rarity
     and not exists(select 1 from public.player_map_fragments f where f.user_id=v_uid and f.region_id=r.id))
  order by random() limit 1;  if not found then raise exception 'NO_COLLECTIBLE_FOR_REGION'; end if;
  select * into s from public.collectible_species where id=v_species_id;
  if s.kind<>'map' then
   perform app_private.aquarium_state();
   select id into v_tank from public.aquarium_tanks where user_id=v_uid and is_default;
  else
   insert into public.player_map_fragments(user_id,region_id) values(v_uid,v_map_region) on conflict do nothing;
  end if;
  insert into public.player_collectibles(user_id,species_id,tank_id,map_region_id) values(v_uid,s.id,v_tank,v_map_region) returning id into v_item;
  insert into public.player_discoveries(user_id,species_id) values(v_uid,s.id) on conflict do nothing;
 end if;
 update public.player_wallets set inventory=jsonb_set(inventory,array[p_bait_id],to_jsonb(v_count-1)),updated_at=now() where user_id=v_uid;
 insert into public.fishing_attempts(user_id,operation_id,region_id,bait_id,rarity,collectible_id)
 values(v_uid,p_operation_id,p_region_id,p_bait_id,coalesce(s.rarity,(select rarity from public.regions where id=v_map_region)),v_item) returning * into a;
 return jsonb_build_object('attempt',to_jsonb(a)||jsonb_build_object('species',case when s.id is null then null else app_private.species_payload(s.id,v_map_region) end),'replayed',false);
end $$;
create function public.collection_state() returns jsonb language sql security invoker set search_path='' as $$select app_private.collection_state()$$;
revoke all on function app_private.collection_state(),public.collection_state() from public,anon;
grant execute on function app_private.collection_state(),public.collection_state() to authenticated;

update public.fishing_baits set effect_description='물고기 대신 서식 지역의 장식물을 반드시 끌어올린다. 획득한 장식물은 첫 어항에 보관된다.' where id='bait_magnet';
drop table public.player_catch_counts;
create or replace function app_private.aquarium_state() returns jsonb language plpgsql security definer set search_path='' as $$
declare v_uid uuid:=auth.uid();
begin
 if v_uid is null then raise exception 'AUTH_REQUIRED'; end if;
 insert into public.player_aquariums(user_id) values(v_uid) on conflict do nothing;
 insert into public.aquarium_tanks(user_id,background_id,is_default)
 select v_uid,background_id,true from public.player_aquariums where user_id=v_uid
 on conflict(user_id) where is_default do nothing;
 return jsonb_build_object(
 'background',(select background_id from public.aquarium_tanks where user_id=v_uid and is_default),
 'tanks',coalesce((select jsonb_agg(to_jsonb(t) order by t.created_at,t.id) from public.aquarium_tanks t where user_id=v_uid),'[]'::jsonb),
 'inhabitants',app_private.owned_collectibles(),
 'tankPrice',200,
 'owned',coalesce((select jsonb_agg(background_id) from public.owned_aquarium_backgrounds where user_id=v_uid),'[]'::jsonb),
 'catalog',(select jsonb_agg(to_jsonb(b) order by b.price) from public.aquarium_backgrounds b));
end $$;

notify pgrst,'reload schema';

set constraints all immediate;
set constraints all deferred;

-- SOURCE: 16-cartoon-collectibles/01-cartoon-collectibles.sql
-- Apply AFTER 15, even if the old 15 catalog was already installed.
-- Replaces art/layout and rarity rules; existing ownership, wallets and tanks are preserved.

alter table public.collectible_species add column sprite_sheet_path text;
-- 15 used automatically named checks: identify only the retired sprite/rarity checks.
do $$ declare c record; begin
 for c in select conname from pg_constraint where conrelid='public.collectible_species'::regclass and contype='c'
 and (pg_get_constraintdef(oid) like '%sprite_paths%' or pg_get_constraintdef(oid) like '%rarity%') loop
  execute format('alter table public.collectible_species drop constraint %I',c.conname);
 end loop;
end $$;
update public.collectible_species set rarity='common' where kind in ('trash','decoration','map');
update public.collectible_species set sprite_sheet_path=case id
 when 'pongul' then 'fish/normal/pongul_sprite.png' when 'moon-angelfish' then 'fish/rare/moon-angelfish_sprite.png'
 when 'star-ray' then 'fish/epic/star-ray_sprite.png' when 'dawn-arowana' then 'fish/mythic/dawn-arowana_sprite.png' end,
 thumbnail_path=case id
 when 'pongul' then 'fish/normal/pongul_thumbnail.png' when 'moon-angelfish' then 'fish/rare/moon-angelfish_thumbnail.png'
 when 'star-ray' then 'fish/epic/star-ray_thumbnail.png' when 'dawn-arowana' then 'fish/mythic/dawn-arowana_thumbnail.png'
 when 'glass-bottle' then 'trash/normal/glass-bottle_thumbnail.png' when 'coral-house' then 'decorations/normal/coral-house_thumbnail.png'
 when 'ocean-map' then 'map/normal/ocean-map_thumbnail.png' else thumbnail_path end;
alter table public.collectible_species drop column sprite_paths;
alter table public.collectible_species alter column rarity set not null;
alter table public.collectible_species add constraint collectible_sheet_layout check
 ((kind='fish' and sprite_sheet_path is not null and btrim(sprite_sheet_path)<>'') or(kind<>'fish' and sprite_sheet_path is null));
alter table public.collectible_species add constraint collectible_nonfish_common check(kind='fish' or rarity='common');
-- This sample has only a COMMON map: its destinations are common, still-locked regions.
-- Habitat rows for maps describe eligible destinations; fish/trash/decoration rows describe catch locations.
delete from public.collectible_habitats h using public.regions r
 where h.species_id='ocean-map' and r.id=h.region_id and (r.rarity<>'common' or not r.requires_map_fragment);
create or replace function app_private.species_payload(p_species_id text,p_map_region_id text default null) returns jsonb language sql stable set search_path='' as $$
 select to_jsonb(s)||case when s.kind='map' then jsonb_build_object('name',r.name||' 지도 조각','map_region_id',r.id) else '{}'::jsonb end
 from public.collectible_species s left join public.regions r on r.id=p_map_region_id where s.id=p_species_id
$$;

create or replace function app_private.cast_fishing(p_region_id text,p_bait_id text,p_operation_id uuid) returns jsonb language plpgsql security definer set search_path='' as $$
declare v_uid uuid:=auth.uid(); w public.player_wallets; a public.fishing_attempts; s public.collectible_species;
 v_current text; v_required boolean; v_count integer; v_rarity public.game_rarity; v_tank uuid; v_item uuid; v_decoration boolean; v_map_region text; v_species_id text;
begin
 if v_uid is null then raise exception 'AUTH_REQUIRED'; end if;
 if p_operation_id is null then raise exception 'INVALID_TRADE'; end if;
 perform pg_advisory_xact_lock(hashtextextended('region:'||v_uid::text,0));
 perform app_private.get_gold_wallet();
 select * into w from public.player_wallets where user_id=v_uid for update;
 select * into a from public.fishing_attempts where user_id=v_uid and operation_id=p_operation_id;
 if found then
  if a.region_id is distinct from p_region_id or a.bait_id is distinct from p_bait_id then raise exception 'OPERATION_CONFLICT'; end if;
  select c.species_id,c.map_region_id into v_species_id,v_map_region from public.player_collectibles c where c.id=a.collectible_id;
  select * into s from public.collectible_species where id=v_species_id;
  return jsonb_build_object('attempt',to_jsonb(a)||jsonb_build_object('species',case when s.id is null then null else app_private.species_payload(s.id,v_map_region) end),'replayed',true);
 end if;
 select effect_kind='decoration' into v_decoration from public.fishing_baits where id=p_bait_id;
 if not found then raise exception 'INVALID_BAIT'; end if;
 select requires_map_fragment into v_required from public.regions where id=p_region_id;
 if not found then raise exception 'REGION_NOT_FOUND'; end if;
 select region_id into v_current from public.player_navigation where user_id=v_uid;
 if v_current is distinct from p_region_id then raise exception 'NOT_IN_REGION'; end if;
 if v_required and not exists(select 1 from public.player_map_fragments where user_id=v_uid and region_id=p_region_id) then raise exception 'REGION_LOCKED'; end if;
 v_count:=coalesce((w.inventory->>p_bait_id)::integer,0);
 if v_count<1 then raise exception 'NO_BAIT'; end if;
 if not v_decoration then v_rarity:=app_private.resolve_fishing(p_bait_id,floor(random()*10000)::integer); end if;
 if v_decoration or v_rarity is not null then
  select c.id,r.id into v_species_id,v_map_region
  from public.collectible_species c join public.collectible_habitats h on h.species_id=c.id
  left join public.regions r on c.kind='map' and r.id=h.region_id
  where
   (h.region_id=p_region_id and ((v_decoration and c.kind='decoration') or
     (not v_decoration and ((c.kind='fish' and c.rarity=v_rarity) or(c.kind='trash' and c.rarity=v_rarity)))))
   or (not v_decoration and c.kind='map' and c.rarity=v_rarity and r.requires_map_fragment and r.rarity=c.rarity
     and not exists(select 1 from public.player_map_fragments f where f.user_id=v_uid and f.region_id=r.id))
  order by random() limit 1;
  if not found then raise exception 'NO_COLLECTIBLE_FOR_REGION'; end if;
  select * into s from public.collectible_species where id=v_species_id;
  if s.kind<>'map' then
   perform app_private.aquarium_state();
   select id into v_tank from public.aquarium_tanks where user_id=v_uid and is_default;
  else
   insert into public.player_map_fragments(user_id,region_id) values(v_uid,v_map_region) on conflict do nothing;
  end if;
  insert into public.player_collectibles(user_id,species_id,tank_id,map_region_id) values(v_uid,s.id,v_tank,v_map_region) returning id into v_item;
  insert into public.player_discoveries(user_id,species_id) values(v_uid,s.id) on conflict do nothing;
 end if;
 update public.player_wallets set inventory=jsonb_set(inventory,array[p_bait_id],to_jsonb(v_count-1)),updated_at=now() where user_id=v_uid;
 insert into public.fishing_attempts(user_id,operation_id,region_id,bait_id,rarity,collectible_id)
 values(v_uid,p_operation_id,p_region_id,p_bait_id,coalesce(s.rarity,(select rarity from public.regions where id=v_map_region)),v_item) returning * into a;
 return jsonb_build_object('attempt',to_jsonb(a)||jsonb_build_object('species',case when s.id is null then null else app_private.species_payload(s.id,v_map_region) end),'replayed',false);
end $$;

notify pgrst,'reload schema';

set constraints all immediate;
set constraints all deferred;

-- SOURCE: 17-collectible-paths/01-paths.sql
-- Apply after 16. Safe to repeat; changes only asset paths, preserves all progress.

update public.collectible_species set sprite_sheet_path=case id
 when 'pongul' then 'fish/normal/pongul_sprite.png' when 'moon-angelfish' then 'fish/rare/moon-angelfish_sprite.png'
 when 'star-ray' then 'fish/epic/star-ray_sprite.png' when 'dawn-arowana' then 'fish/mythic/dawn-arowana_sprite.png' else sprite_sheet_path end,
 thumbnail_path=case id
 when 'pongul' then 'fish/normal/pongul_thumbnail.png' when 'moon-angelfish' then 'fish/rare/moon-angelfish_thumbnail.png'
 when 'star-ray' then 'fish/epic/star-ray_thumbnail.png' when 'dawn-arowana' then 'fish/mythic/dawn-arowana_thumbnail.png'
 when 'glass-bottle' then 'trash/normal/glass-bottle_thumbnail.png' when 'coral-house' then 'decorations/normal/coral-house_thumbnail.png'
 when 'ocean-map' then 'map/normal/ocean-map_thumbnail.png' else thumbnail_path end;
notify pgrst,'reload schema';

set constraints all immediate;
set constraints all deferred;

-- SOURCE: 18-common-ocean-fish/01-common-ocean-fish.sql
-- Apply after 16/17, after uploading the ten PNGs to collectibles/fish/normal/.
-- Repeatable content seed. Existing ownership and progress are preserved.

insert into public.collectible_species
  (id,kind,name,description,swim_y_min,swim_y_max,speed,size,rarity,sprite_sheet_path,thumbnail_path,sell_price)
values
  ('silver-anchovy','fish','은빛 멸치','가늘고 작은 몸에 반짝이는 은빛 비늘을 가진 물고기. 꼬리를 부지런히 흔들며 헤엄칠 때마다 작은 빛이 일렁인다.',0.15,0.45,0.085,48,'common','fish/normal/silver-anchovy_sprite.png','fish/normal/silver-anchovy_thumbnail.png',20),
  ('striped-mackerel','fish','줄무늬 고등어','푸른 등에 짙은 물결무늬가 새겨진 물고기. 날렵한 몸으로 바닷속을 빠르게 가로지르는 활발한 개체.',0.25,0.65,0.075,76,'common','fish/normal/striped-mackerel_sprite.png','fish/normal/striped-mackerel_thumbnail.png',40),
  ('plump-horse-mackerel','fish','통통 전갱이','은빛 몸과 연노란 꼬리가 특징인 물고기. 지느러미를 부지런히 움직이며 주변을 호기심 있게 돌아다닌다.',0.30,0.70,0.065,68,'common','fish/normal/plump-horse-mackerel_sprite.png','fish/normal/plump-horse-mackerel_thumbnail.png',35),
  ('sand-goby','fish','모래 망둑어','모래빛 몸에 작은 얼룩이 흩어진 물고기. 바닥 가까이에서 꼬리를 살랑이며 느긋하게 움직이는 모습이 귀엽다.',0.70,0.90,0.030,54,'common','fish/normal/sand-goby_sprite.png','fish/normal/sand-goby_thumbnail.png',25),
  ('round-filefish','fish','동글 쥐치','납작하고 둥근 몸에 작은 입을 가진 물고기. 작은 지느러미를 팔랑이며 헤엄치고, 주변을 콕콕 건드리며 탐색한다.',0.35,0.75,0.040,64,'common','fish/normal/round-filefish_sprite.png','fish/normal/round-filefish_thumbnail.png',30)
on conflict(id) do update set
  kind=excluded.kind,name=excluded.name,description=excluded.description,
  swim_y_min=excluded.swim_y_min,swim_y_max=excluded.swim_y_max,
  speed=excluded.speed,size=excluded.size,rarity=excluded.rarity,
  sprite_sheet_path=excluded.sprite_sheet_path,thumbnail_path=excluded.thumbnail_path,
  sell_price=excluded.sell_price;

insert into public.collectible_habitats(species_id,region_id)
select s.id,r.id
from public.collectible_species s cross join public.regions r
where s.id in ('silver-anchovy','striped-mackerel','plump-horse-mackerel','sand-goby','round-filefish')
  and r.id in ('pongdang','coral','mistmoon')
on conflict(species_id,region_id) do nothing;


-- Verification: expect five rows, each with the three initial habitats.
select s.id,s.name,s.rarity,s.sprite_sheet_path,s.thumbnail_path,
  array_agg(h.region_id order by h.region_id) as habitats
from public.collectible_species s
left join public.collectible_habitats h on h.species_id=s.id
where s.id in ('silver-anchovy','striped-mackerel','plump-horse-mackerel','sand-goby','round-filefish')
group by s.id order by s.id;

set constraints all immediate;
set constraints all deferred;

-- SOURCE: 19-rare-ocean-fish/01-rare-ocean-fish.sql
-- Requires 16/17 catalog schema. Upload ten PNGs to collectibles/fish/rare/ first.
-- Repeatable seed; preserves existing species and all player progress.

insert into public.collectible_species
  (id,kind,name,description,swim_y_min,swim_y_max,speed,size,rarity,sprite_sheet_path,thumbnail_path,sell_price)
values
  ('blue-sailfish','fish','푸른 돛새치','긴 주둥이와 커다란 돛 모양 등지느러미를 가진 물고기. 푸른 몸을 펼치며 바닷속을 시원하게 가로지른다.',.20,.70,0.065,112,'common','fish/rare/blue-sailfish_sprite.png','fish/rare/blue-sailfish_thumbnail.png',220),
  ('coral-seabream','fish','산호빛 참돔','통통하고 넓은 몸에 산호빛 비늘이 반짝이는 물고기. 큼직한 지느러미를 살랑이며 여유롭게 헤엄친다.',.20,.70,0.045,96,'common','fish/rare/coral-seabream_sprite.png','fish/rare/coral-seabream_thumbnail.png',180),
  ('spotted-giant-grouper','fish','얼룩 왕그루퍼','두툼한 몸과 큰 입, 둥근 꼬리를 가진 물고기. 연갈색 몸의 초콜릿빛 얼룩과 느긋한 움직임이 듬직하다.',.55,.85,0.03,120,'common','fish/rare/spotted-giant-grouper_sprite.png','fish/rare/spotted-giant-grouper_thumbnail.png',260),
  ('silver-yellowtail','fish','은빛 방어','굵고 길쭉한 은빛 몸에 노란 옆줄이 빛나는 물고기. 힘찬 꼬리로 물살을 가르며 묵직하게 나아간다.',.20,.70,0.06,108,'common','fish/rare/silver-yellowtail_sprite.png','fish/rare/silver-yellowtail_thumbnail.png',200),
  ('mint-mahi-mahi','fish','민트 만새기','높고 둥근 이마와 길게 이어진 등지느러미를 가진 물고기. 민트빛 몸과 연노란 지느러미가 물결 속에서 반짝인다.',.20,.70,0.055,116,'common','fish/rare/mint-mahi-mahi_sprite.png','fish/rare/mint-mahi-mahi_thumbnail.png',240)
on conflict(id) do update set
  kind=excluded.kind,name=excluded.name,description=excluded.description,
  swim_y_min=excluded.swim_y_min,swim_y_max=excluded.swim_y_max,
  speed=excluded.speed,size=excluded.size,rarity=excluded.rarity,
  sprite_sheet_path=excluded.sprite_sheet_path,thumbnail_path=excluded.thumbnail_path,
  sell_price=excluded.sell_price;
insert into public.collectible_habitats(species_id,region_id)
select s.id,r.id from public.collectible_species s cross join public.regions r
where s.id in ('blue-sailfish','coral-seabream','spotted-giant-grouper','silver-yellowtail','mint-mahi-mahi')
  and r.id in ('pongdang','coral','mistmoon','starruins','dreamabyss')
on conflict(species_id,region_id) do nothing;

-- Expect five common species, each with five habitats.
select s.id,s.name,s.rarity,s.size,s.sprite_sheet_path,s.thumbnail_path,
  array_agg(h.region_id order by h.region_id) as habitats
from public.collectible_species s left join public.collectible_habitats h on h.species_id=s.id
where s.id in ('blue-sailfish','coral-seabream','spotted-giant-grouper','silver-yellowtail','mint-mahi-mahi')
group by s.id order by s.id;

set constraints all immediate;
set constraints all deferred;

-- SOURCE: 20-large-fish-common/01-large-fish-common.sql
-- Run after 19. Repeatable; preserves images, habitats and owned collectibles.

update public.collectible_species as s
set rarity='common', sell_price=prices.sell_price
from (values
  ('blue-sailfish',220),
  ('coral-seabream',180),
  ('spotted-giant-grouper',260),
  ('silver-yellowtail',200),
  ('mint-mahi-mahi',240)
) as prices(id,sell_price)
where s.id=prices.id and s.kind='fish';

-- Expect five rows with common rarity. Existing fish/rare paths are intentional.
select id,name,rarity,sell_price from public.collectible_species
where id in ('blue-sailfish','coral-seabream','spotted-giant-grouper','silver-yellowtail','mint-mahi-mahi')
order by sell_price;

set constraints all immediate;
set constraints all deferred;

-- SOURCE: 21-rare-sharks-whales/01-rare-sharks-whales.sql
-- Requires 16/17 schema. Upload ten PNGs to collectibles/fish/rare/ first.
-- Sharks and whales use game kind fish (aquarium swimmer), not biological classification.
-- Repeatable seed; preserves existing species and all player progress.

insert into public.collectible_species
  (id,kind,name,description,swim_y_min,swim_y_max,speed,size,rarity,sprite_sheet_path,thumbnail_path,sell_price)
values
  ('blue-great-white','fish','푸른 백상아리','묵직한 몸과 뾰족한 등지느러미를 가진 상어. 푸른 회색 등 아래 크림빛 배가 드러나고, 작은 이빨 사이로 장난스러운 미소가 보인다.',0.15,0.80,0.055,136,'rare','fish/rare/blue-great-white_sprite.png','fish/rare/blue-great-white_thumbnail.png',380),
  ('sand-hammerhead','fish','모래 귀상어','양옆으로 넓게 펼쳐진 머리가 특징인 상어. 모래빛 몸과 민트빛 지느러미로 물살을 가르며 주변을 천천히 살핀다.',0.15,0.80,0.05,128,'rare','fish/rare/sand-hammerhead_sprite.png','fish/rare/sand-hammerhead_thumbnail.png',340),
  ('star-spotted-whale-shark','fish','별점 고래상어','넓고 둥근 머리와 거대한 몸을 가진 상어. 남색 등에 작은 흰 점들이 별처럼 빛나며 느긋하게 바다를 누빈다.',0.15,0.80,0.035,160,'rare','fish/rare/star-spotted-whale-shark_sprite.png','fish/rare/star-spotted-whale-shark_thumbnail.png',480),
  ('night-orca','fish','밤빛 범고래','짙은 보랏빛 몸에 하얀 눈 옆 무늬와 높은 등지느러미가 돋보이는 고래. 넓은 꼬리로 물살을 밀며 힘차게 헤엄친다.',0.15,0.80,0.045,148,'rare','fish/rare/night-orca_sprite.png','fish/rare/night-orca_thumbnail.png',450),
  ('cloud-humpback','fish','구름 혹등고래','둥근 청회색 몸과 긴 가슴지느러미를 가진 고래. 하얀 배와 넓은 꼬리를 펼쳐 구름처럼 느긋하게 물속을 지나간다.',0.15,0.80,0.03,172,'rare','fish/rare/cloud-humpback_sprite.png','fish/rare/cloud-humpback_thumbnail.png',520)
on conflict(id) do update set
  kind=excluded.kind,name=excluded.name,description=excluded.description,
  swim_y_min=excluded.swim_y_min,swim_y_max=excluded.swim_y_max,
  speed=excluded.speed,size=excluded.size,rarity=excluded.rarity,
  sprite_sheet_path=excluded.sprite_sheet_path,thumbnail_path=excluded.thumbnail_path,
  sell_price=excluded.sell_price;
insert into public.collectible_habitats(species_id,region_id)
select s.id,r.id from public.collectible_species s cross join public.regions r
where s.id in ('blue-great-white','sand-hammerhead','star-spotted-whale-shark','night-orca','cloud-humpback')
  and r.id in ('pongdang','coral','mistmoon','starruins','dreamabyss')
on conflict(species_id,region_id) do nothing;

-- Expect five rare species with five habitats each.
select s.id,s.name,s.rarity,s.size,s.sell_price,s.sprite_sheet_path,s.thumbnail_path,
  array_agg(h.region_id order by h.region_id) as habitats
from public.collectible_species s left join public.collectible_habitats h on h.species_id=s.id
where s.id in ('blue-great-white','sand-hammerhead','star-spotted-whale-shark','night-orca','cloud-humpback')
group by s.id order by s.id;

set constraints all immediate;
set constraints all deferred;

-- SOURCE: 22-aquarium-management/01-management.sql
-- Requires 16/17 collectible schema. Optional catalog seeds 18~21 are independent.
-- Repeatable. No reset. Ownership and wallet changes are performed only through RPCs.

create or replace function app_private.place_collectible(p_collectible_id uuid,p_tank_id uuid,p_x numeric,p_y numeric)
returns jsonb language plpgsql security definer set search_path='' as $$
declare v_uid uuid:=auth.uid(); v_item public.player_collectibles;
begin
 if v_uid is null then raise exception 'AUTH_REQUIRED'; end if;
 if p_x is null or p_y is null or not(p_x between 0 and 1) or not(p_y between 0 and 1) then raise exception 'INVALID_POSITION'; end if;
 if not exists(select 1 from public.aquarium_tanks where id=p_tank_id and user_id=v_uid) then raise exception 'TANK_NOT_FOUND'; end if;
 select * into v_item from public.player_collectibles where id=p_collectible_id and user_id=v_uid and sold_at is null and (to_jsonb(player_collectibles)->>'escrow_gift_id') is null for update;
 if not found or v_item.tank_id is distinct from p_tank_id then raise exception 'COLLECTIBLE_NOT_FOUND'; end if;
 if not exists(select 1 from public.collectible_species where id=v_item.species_id and kind in ('fish','trash','decoration')) then raise exception 'INVALID_ITEM'; end if;
 update public.player_collectibles set position_x=p_x,position_y=p_y where id=v_item.id;
 return jsonb_build_object('id',v_item.id,'position_x',p_x,'position_y',p_y);
end $$;

create or replace function app_private.sell_collectibles(p_collectible_ids uuid[],p_operation_id uuid)
returns jsonb language plpgsql security definer set search_path='' as $$
declare v_uid uuid:=auth.uid(); v_ids uuid[]; v_key text; v_wallet public.player_wallets;
 v_previous public.gold_transactions; v_count integer; v_price bigint;
begin
 if v_uid is null then raise exception 'AUTH_REQUIRED'; end if;
 if p_operation_id is null or coalesce(cardinality(p_collectible_ids),0) not between 1 and 100 then raise exception 'INVALID_TRADE'; end if;
 select array_agg(id order by id) into v_ids from (select distinct unnest(p_collectible_ids) as id) q;
 if cardinality(v_ids)<>cardinality(p_collectible_ids) or array_position(v_ids,null) is not null then raise exception 'INVALID_TRADE'; end if;
 v_key:='collectibles:'||array_to_string(v_ids,',');
 perform app_private.get_gold_wallet();
 -- Same lock order as other gold operations: wallet, then collectibles ordered by ID.
 select * into v_wallet from public.player_wallets where user_id=v_uid for update;
 select * into v_previous from public.gold_transactions where user_id=v_uid and operation_id=p_operation_id;
 if found then
  if v_previous.action<>'sell' or v_previous.item_id is distinct from v_key then raise exception 'OPERATION_CONFLICT'; end if;
  return app_private.get_gold_wallet()||jsonb_build_object('delta',0);
 end if;
 perform 1 from public.player_collectibles where user_id=v_uid and id=any(v_ids) order by id for update;
 select count(*),coalesce(sum(s.sell_price),0) into v_count,v_price
 from public.player_collectibles c join public.collectible_species s on s.id=c.species_id
 where c.user_id=v_uid and c.id=any(v_ids) and c.sold_at is null and (to_jsonb(c)->>'escrow_gift_id') is null and s.kind in ('fish','trash','decoration') and s.sell_price>0;
 if v_count<>cardinality(v_ids) then raise exception 'COLLECTIBLE_NOT_FOUND'; end if;
 if v_wallet.gold::bigint+v_price>1000000000 then raise exception 'GOLD_LIMIT'; end if;
 update public.player_collectibles set sold_at=now(),tank_id=null where user_id=v_uid and id=any(v_ids);
 update public.player_wallets set gold=gold+v_price::integer,updated_at=now() where user_id=v_uid;
 insert into public.gold_transactions(user_id,operation_id,action,item_id,delta) values(v_uid,p_operation_id,'sell',v_key,v_price::integer);
 return app_private.get_gold_wallet()||jsonb_build_object('delta',v_price);
end $$;

create or replace function public.place_collectible(p_collectible_id uuid,p_tank_id uuid,p_x numeric,p_y numeric)
returns jsonb language sql security invoker set search_path='' as $$select app_private.place_collectible(p_collectible_id,p_tank_id,p_x,p_y)$$;
create or replace function public.sell_collectibles(p_collectible_ids uuid[],p_operation_id uuid)
returns jsonb language sql security invoker set search_path='' as $$select app_private.sell_collectibles(p_collectible_ids,p_operation_id)$$;
revoke all on function app_private.place_collectible(uuid,uuid,numeric,numeric),public.place_collectible(uuid,uuid,numeric,numeric),app_private.sell_collectibles(uuid[],uuid),public.sell_collectibles(uuid[],uuid) from public,anon;
grant execute on function app_private.place_collectible(uuid,uuid,numeric,numeric),public.place_collectible(uuid,uuid,numeric,numeric),app_private.sell_collectibles(uuid[],uuid),public.sell_collectibles(uuid[],uuid) to authenticated;
notify pgrst,'reload schema';

set constraints all immediate;
set constraints all deferred;

-- SOURCE: 23-collectible-gifts/01-gifts.sql
-- Apply AFTER 22. Repeatable; no player data reset.

create table if not exists public.collectible_gifts (
 id uuid primary key default gen_random_uuid(),
 sender_id uuid references public.player_profiles(id) on delete set null,
 recipient_id uuid references public.player_profiles(id) on delete set null,
 sender_name text not null,recipient_name text not null,
 operation_id uuid not null,collectible_ids uuid[] not null check(cardinality(collectible_ids) between 1 and 20),
 species jsonb not null,quantity integer not null check(quantity between 1 and 20),
 message text not null default '' check(char_length(message)<=300),
 status text not null default 'pending' check(status in ('pending','claimed')),
 reaction text check(reaction in ('thumbs_up','heart','thanks','laugh','celebrate')),
 created_at timestamptz not null default now(),claimed_at timestamptz,reacted_at timestamptz,
 unique(sender_id,operation_id),check(sender_id is null or recipient_id is null or sender_id<>recipient_id)
);
create index if not exists gifts_inbox on public.collectible_gifts(recipient_id,created_at desc);
create index if not exists gifts_outbox on public.collectible_gifts(sender_id,created_at desc);
alter table public.collectible_gifts enable row level security;
revoke all on public.collectible_gifts from public,anon,authenticated;
grant select on public.collectible_gifts to authenticated;
drop policy if exists gifts_participant_read on public.collectible_gifts;
create policy gifts_participant_read on public.collectible_gifts for select to authenticated using(sender_id=(select auth.uid()) or recipient_id=(select auth.uid()));
alter table public.player_collectibles add column if not exists escrow_gift_id uuid references public.collectible_gifts(id);
drop policy if exists collectible_owner_read on public.player_collectibles;
create policy collectible_owner_read on public.player_collectibles for select to authenticated using(user_id=(select auth.uid()) and escrow_gift_id is null);

alter table public.notifications add column if not exists gift_id uuid references public.collectible_gifts(id) on delete cascade;
do $$declare c record;begin
 for c in select conname from pg_constraint where conrelid='public.notifications'::regclass and contype='c' and (pg_get_constraintdef(oid) like '%category%' or pg_get_constraintdef(oid) like '%kind%') loop
  execute format('alter table public.notifications drop constraint %I',c.conname);
 end loop;
end $$;
alter table public.notifications add constraint notification_categories check(
 (category='friend' and kind in ('friend_request','friend_accepted') and request_id is not null and gift_id is null) or
 (category='general' and kind in ('announcement','reward','system') and request_id is null and gift_id is null) or
 (category='gift' and kind in ('gift_received','gift_claimed','gift_reaction') and request_id is null and gift_id is not null));
create unique index if not exists gift_notification_once on public.notifications(recipient_id,kind,gift_id) where gift_id is not null;

create or replace function app_private.send_collectible_gift(p_recipient_id uuid,p_collectible_ids uuid[],p_message text,p_operation_id uuid)
returns jsonb language plpgsql security definer set search_path='' as $$
declare v_uid uuid:=auth.uid(); v_ids uuid[]; g public.collectible_gifts; v_count integer; v_species text; v_name text; v_recipient text; v_message text:=btrim(coalesce(p_message,''));
begin
 if v_uid is null then raise exception 'AUTH_REQUIRED'; end if;
 if p_recipient_id is null or p_recipient_id=v_uid then raise exception 'INVALID_RECIPIENT'; end if;
 if p_operation_id is null or coalesce(cardinality(p_collectible_ids),0) not between 1 and 20 or char_length(v_message)>300 then raise exception 'INVALID_GIFT'; end if;
 select array_agg(id order by id) into v_ids from(select distinct unnest(p_collectible_ids) as id) q;
 if cardinality(v_ids)<>cardinality(p_collectible_ids) or array_position(v_ids,null) is not null then raise exception 'INVALID_GIFT'; end if;
 perform pg_advisory_xact_lock(hashtextextended('gift-send:'||v_uid::text,0));
 select * into g from public.collectible_gifts where sender_id=v_uid and operation_id=p_operation_id;
 if found then
  if g.recipient_id is distinct from p_recipient_id or g.collectible_ids<>v_ids or g.message<>v_message then raise exception 'OPERATION_CONFLICT'; end if;
  return to_jsonb(g);
 end if;
 perform 1 from public.friend_requests where status='accepted' and ((sender_id=v_uid and recipient_id=p_recipient_id) or(sender_id=p_recipient_id and recipient_id=v_uid)) for share;
 if not found then raise exception 'GIFT_FRIEND_REQUIRED'; end if;
 if (select count(*) from public.collectible_gifts where sender_id=v_uid and created_at>now()-interval '1 minute')>=5 then raise exception 'GIFT_RATE_LIMIT'; end if;
 select nickname into v_name from public.player_profiles where id=v_uid;
 select nickname into v_recipient from public.player_profiles where id=p_recipient_id;
 if v_name is null or v_recipient is null then raise exception 'INVALID_RECIPIENT'; end if;
 perform 1 from public.player_collectibles where user_id=v_uid and id=any(v_ids) order by id for update;
 select count(*),min(c.species_id) into v_count,v_species from public.player_collectibles c join public.collectible_species s on s.id=c.species_id
 where c.user_id=v_uid and c.id=any(v_ids) and c.sold_at is null and c.escrow_gift_id is null and s.kind in ('fish','trash','decoration');
 if v_count<>cardinality(v_ids) or (select count(distinct species_id) from public.player_collectibles where id=any(v_ids))<>1 then raise exception 'COLLECTIBLE_NOT_FOUND'; end if;
 insert into public.collectible_gifts(sender_id,recipient_id,sender_name,recipient_name,operation_id,collectible_ids,species,quantity,message)
 values(v_uid,p_recipient_id,v_name,v_recipient,p_operation_id,v_ids,app_private.species_payload(v_species),v_count,v_message) returning * into g;
 -- Recipient owns reserved items, so deletion of the sender cannot destroy the gift.
 update public.player_collectibles set tank_id=null,user_id=p_recipient_id,escrow_gift_id=g.id,position_x=null,position_y=null where id=any(v_ids);
 insert into public.notifications(recipient_id,actor_id,category,kind,title,body,gift_id)
 values(p_recipient_id,v_uid,'gift','gift_received','선물을 받았습니다',v_name||'님이 '||(g.species->>'name')||' ×'||v_count||'를 보냈어요.',g.id);
 return to_jsonb(g);
end $$;

create or replace function app_private.claim_collectible_gift(p_gift_id uuid) returns jsonb language plpgsql security definer set search_path='' as $$
declare v_uid uuid:=auth.uid();g public.collectible_gifts;v_tank uuid;v_count integer;
begin
 if v_uid is null then raise exception 'AUTH_REQUIRED'; end if;
 select * into g from public.collectible_gifts where id=p_gift_id and recipient_id=v_uid for update;
 if not found then raise exception 'GIFT_NOT_FOUND'; end if;
 if g.status='claimed' then return to_jsonb(g); end if;
 perform app_private.aquarium_state();
 select id into v_tank from public.aquarium_tanks where user_id=v_uid and is_default;
 perform 1 from public.player_collectibles where user_id=v_uid and escrow_gift_id=g.id order by id for update;
 select count(*) into v_count from public.player_collectibles where user_id=v_uid and escrow_gift_id=g.id and sold_at is null;
 if v_count<>g.quantity then raise exception 'GIFT_UNAVAILABLE'; end if;
 update public.player_collectibles set tank_id=v_tank,escrow_gift_id=null where user_id=v_uid and escrow_gift_id=g.id;
 insert into public.player_discoveries(user_id,species_id) values(v_uid,g.species->>'id') on conflict do nothing;
 update public.collectible_gifts set status='claimed',claimed_at=now() where id=g.id returning * into g;
 update public.notifications set read_at=coalesce(read_at,now()) where recipient_id=v_uid and gift_id=g.id and kind='gift_received';
 if g.sender_id is not null then
  insert into public.notifications(recipient_id,actor_id,category,kind,title,body,gift_id) values(g.sender_id,v_uid,'gift','gift_claimed','선물을 받았어요',g.recipient_name||'님이 보낸 선물을 받았어요.',g.id) on conflict do nothing;
 end if;
 return to_jsonb(g);
end $$;

create or replace function app_private.react_to_collectible_gift(p_gift_id uuid,p_reaction text) returns jsonb language plpgsql security definer set search_path='' as $$
declare v_uid uuid:=auth.uid();g public.collectible_gifts;v_title text;
begin
 if v_uid is null then raise exception 'AUTH_REQUIRED'; end if;
 if p_reaction is null or p_reaction not in ('thumbs_up','heart','thanks','laugh','celebrate') then raise exception 'INVALID_REACTION'; end if;
 select * into g from public.collectible_gifts where id=p_gift_id and recipient_id=v_uid for update;
 if not found then raise exception 'GIFT_NOT_FOUND'; end if;
 if g.status<>'claimed' then raise exception 'GIFT_NOT_CLAIMED'; end if;
 if g.reaction is not null then
  if g.reaction<>p_reaction then raise exception 'GIFT_ALREADY_REACTED'; end if;
  return to_jsonb(g);
 end if;
 update public.collectible_gifts set reaction=p_reaction,reacted_at=now() where id=g.id returning * into g;
 v_title:=case p_reaction when 'thumbs_up' then '따봉을 보냈어요' when 'heart' then '하트를 보냈어요' when 'thanks' then '고마움을 보냈어요' when 'laugh' then '웃음을 보냈어요' else '축하를 보냈어요' end;
 if g.sender_id is not null then
  insert into public.notifications(recipient_id,actor_id,category,kind,title,body,gift_id) values(g.sender_id,v_uid,'gift','gift_reaction',v_title,g.recipient_name||'님이 선물에 답장했어요.',g.id) on conflict do nothing;
 end if;
 return to_jsonb(g);
end $$;

create or replace function app_private.gift_mailbox(p_direction text default 'received',p_offset integer default 0) returns jsonb language plpgsql security definer set search_path='' as $$
declare v_uid uuid:=auth.uid();v_total integer;v_items jsonb;
begin
 if v_uid is null then raise exception 'AUTH_REQUIRED'; end if;
 if p_direction is null or p_direction not in ('received','sent') or p_offset is null or p_offset<0 then raise exception 'INVALID_GIFT'; end if;
 select count(*) into v_total from public.collectible_gifts where (p_direction='received' and recipient_id=v_uid) or(p_direction='sent' and sender_id=v_uid);
 select coalesce(jsonb_agg(to_jsonb(q) order by q.created_at desc,q.id),'[]'::jsonb) into v_items from(select * from public.collectible_gifts where (p_direction='received' and recipient_id=v_uid) or(p_direction='sent' and sender_id=v_uid) order by created_at desc,id limit 30 offset p_offset) q;
 return jsonb_build_object('items',v_items,'total',v_total);
end $$;
create or replace function app_private.gift_detail(p_gift_id uuid) returns jsonb language plpgsql security definer set search_path='' as $$
declare g public.collectible_gifts;v_uid uuid:=auth.uid();
begin
 if v_uid is null then raise exception 'AUTH_REQUIRED'; end if;
 select * into g from public.collectible_gifts where id=p_gift_id and (sender_id=v_uid or recipient_id=v_uid);
 if not found then raise exception 'GIFT_NOT_FOUND'; end if;
 return to_jsonb(g);
end $$;

create or replace function public.send_collectible_gift(p_recipient_id uuid,p_collectible_ids uuid[],p_message text,p_operation_id uuid) returns jsonb language sql security invoker set search_path='' as $$select app_private.send_collectible_gift(p_recipient_id,p_collectible_ids,p_message,p_operation_id)$$;
create or replace function public.claim_collectible_gift(p_gift_id uuid) returns jsonb language sql security invoker set search_path='' as $$select app_private.claim_collectible_gift(p_gift_id)$$;
create or replace function public.react_to_collectible_gift(p_gift_id uuid,p_reaction text) returns jsonb language sql security invoker set search_path='' as $$select app_private.react_to_collectible_gift(p_gift_id,p_reaction)$$;
create or replace function public.gift_mailbox(p_direction text default 'received',p_offset integer default 0) returns jsonb language sql security invoker set search_path='' as $$select app_private.gift_mailbox(p_direction,p_offset)$$;
create or replace function public.gift_detail(p_gift_id uuid) returns jsonb language sql security invoker set search_path='' as $$select app_private.gift_detail(p_gift_id)$$;
revoke all on function app_private.send_collectible_gift(uuid,uuid[],text,uuid),public.send_collectible_gift(uuid,uuid[],text,uuid),app_private.claim_collectible_gift(uuid),public.claim_collectible_gift(uuid),app_private.react_to_collectible_gift(uuid,text),public.react_to_collectible_gift(uuid,text),app_private.gift_mailbox(text,integer),public.gift_mailbox(text,integer),app_private.gift_detail(uuid),public.gift_detail(uuid) from public,anon;
grant execute on function app_private.send_collectible_gift(uuid,uuid[],text,uuid),public.send_collectible_gift(uuid,uuid[],text,uuid),app_private.claim_collectible_gift(uuid),public.claim_collectible_gift(uuid),app_private.react_to_collectible_gift(uuid,text),public.react_to_collectible_gift(uuid,text),app_private.gift_mailbox(text,integer),public.gift_mailbox(text,integer),app_private.gift_detail(uuid),public.gift_detail(uuid) to authenticated;

-- Reserved items must be excluded from all existing ownership and trade operations.

create or replace function app_private.owned_collectibles() returns jsonb language plpgsql security definer set search_path='' as $$
declare v_uid uuid:=auth.uid();
begin
 if v_uid is null then raise exception 'AUTH_REQUIRED'; end if;
 return coalesce((select jsonb_agg(to_jsonb(c)||jsonb_build_object('species',app_private.species_payload(s.id,c.map_region_id)) order by c.acquired_at desc)
 from public.player_collectibles c join public.collectible_species s on s.id=c.species_id where c.user_id=v_uid and c.sold_at is null and c.escrow_gift_id is null),'[]'::jsonb);
end $$;

create or replace function app_private.place_collectible(p_collectible_id uuid,p_tank_id uuid,p_x numeric,p_y numeric)
returns jsonb language plpgsql security definer set search_path='' as $$
declare v_uid uuid:=auth.uid(); v_item public.player_collectibles;
begin
 if v_uid is null then raise exception 'AUTH_REQUIRED'; end if;
 if p_x is null or p_y is null or not(p_x between 0 and 1) or not(p_y between 0 and 1) then raise exception 'INVALID_POSITION'; end if;
 if not exists(select 1 from public.aquarium_tanks where id=p_tank_id and user_id=v_uid) then raise exception 'TANK_NOT_FOUND'; end if;
 select * into v_item from public.player_collectibles where id=p_collectible_id and user_id=v_uid and sold_at is null and escrow_gift_id is null for update;
 if not found or v_item.tank_id is distinct from p_tank_id then raise exception 'COLLECTIBLE_NOT_FOUND'; end if;
 if not exists(select 1 from public.collectible_species where id=v_item.species_id and kind in ('fish','trash','decoration')) then raise exception 'INVALID_ITEM'; end if;
 update public.player_collectibles set position_x=p_x,position_y=p_y where id=v_item.id;
 return jsonb_build_object('id',v_item.id,'position_x',p_x,'position_y',p_y);
end $$;

create or replace function app_private.sell_collectibles(p_collectible_ids uuid[],p_operation_id uuid)
returns jsonb language plpgsql security definer set search_path='' as $$
declare v_uid uuid:=auth.uid(); v_ids uuid[]; v_key text; v_wallet public.player_wallets;
 v_previous public.gold_transactions; v_count integer; v_price bigint;
begin
 if v_uid is null then raise exception 'AUTH_REQUIRED'; end if;
 if p_operation_id is null or coalesce(cardinality(p_collectible_ids),0) not between 1 and 100 then raise exception 'INVALID_TRADE'; end if;
 select array_agg(id order by id) into v_ids from (select distinct unnest(p_collectible_ids) as id) q;
 if cardinality(v_ids)<>cardinality(p_collectible_ids) or array_position(v_ids,null) is not null then raise exception 'INVALID_TRADE'; end if;
 v_key:='collectibles:'||array_to_string(v_ids,',');
 perform app_private.get_gold_wallet();
 -- Same lock order as other gold operations: wallet, then collectibles ordered by ID.
 select * into v_wallet from public.player_wallets where user_id=v_uid for update;
 select * into v_previous from public.gold_transactions where user_id=v_uid and operation_id=p_operation_id;
 if found then
  if v_previous.action<>'sell' or v_previous.item_id is distinct from v_key then raise exception 'OPERATION_CONFLICT'; end if;
  return app_private.get_gold_wallet()||jsonb_build_object('delta',0);
 end if;
 perform 1 from public.player_collectibles where user_id=v_uid and id=any(v_ids) order by id for update;
 select count(*),coalesce(sum(s.sell_price),0) into v_count,v_price
 from public.player_collectibles c join public.collectible_species s on s.id=c.species_id
 where c.user_id=v_uid and c.id=any(v_ids) and c.sold_at is null and c.escrow_gift_id is null and s.kind in ('fish','trash','decoration') and s.sell_price>0;
 if v_count<>cardinality(v_ids) then raise exception 'COLLECTIBLE_NOT_FOUND'; end if;
 if v_wallet.gold::bigint+v_price>1000000000 then raise exception 'GOLD_LIMIT'; end if;
 update public.player_collectibles set sold_at=now(),tank_id=null where user_id=v_uid and id=any(v_ids);
 update public.player_wallets set gold=gold+v_price::integer,updated_at=now() where user_id=v_uid;
 insert into public.gold_transactions(user_id,operation_id,action,item_id,delta) values(v_uid,p_operation_id,'sell',v_key,v_price::integer);
 return app_private.get_gold_wallet()||jsonb_build_object('delta',v_price);
end $$;

create or replace function public.place_collectible(p_collectible_id uuid,p_tank_id uuid,p_x numeric,p_y numeric)
returns jsonb language sql security invoker set search_path='' as $$select app_private.place_collectible(p_collectible_id,p_tank_id,p_x,p_y)$$;
create or replace function public.sell_collectibles(p_collectible_ids uuid[],p_operation_id uuid)
returns jsonb language sql security invoker set search_path='' as $$select app_private.sell_collectibles(p_collectible_ids,p_operation_id)$$;
revoke all on function app_private.place_collectible(uuid,uuid,numeric,numeric),public.place_collectible(uuid,uuid,numeric,numeric),app_private.sell_collectibles(uuid[],uuid),public.sell_collectibles(uuid[],uuid) from public,anon;
grant execute on function app_private.place_collectible(uuid,uuid,numeric,numeric),public.place_collectible(uuid,uuid,numeric,numeric),app_private.sell_collectibles(uuid[],uuid),public.sell_collectibles(uuid[],uuid) to authenticated;

notify pgrst,'reload schema';

set constraints all immediate;
set constraints all deferred;

-- SOURCE: 24-common-decorations/01-common-decorations.sql
-- Requires renamed decoration kind. Existing DB: run 25 first, then this seed.
-- Upload the three transparent PNGs to collectibles/decorations/normal/ first.
-- Repeatable catalog seed; existing player progress is preserved.

insert into public.collectible_species
  (id,kind,name,description,swim_y_min,swim_y_max,speed,size,rarity,sprite_sheet_path,thumbnail_path,sell_price)
values
  ('apricot-starfish','decoration','살구 불가사리','통통한 다섯 팔을 펼친 살구색 불가사리. 수조 벽에 착 붙어 느긋하게 바다를 구경한다.',null,null,0,52,'common',null,'decorations/normal/apricot-starfish_thumbnail.png',35),
  ('round-barnacle-cluster','decoration','동글 따개비 무리','작고 동그란 따개비들이 옹기종기 모여 있다. 벽 한쪽에 붙이면 소박한 바다 풍경이 된다.',null,null,0,46,'common',null,'decorations/normal/round-barnacle-cluster_thumbnail.png',25),
  ('rusty-mini-anchor','decoration','녹슨 꼬마 닻','붉은 녹이 슬고 고리에 짧은 밧줄이 남은 작은 닻. 작은 배가 남기고 간 작은 흔적이다.',null,null,0,58,'common',null,'decorations/normal/rusty-mini-anchor_thumbnail.png',45)
on conflict(id) do update set
  kind=excluded.kind,name=excluded.name,description=excluded.description,
  swim_y_min=excluded.swim_y_min,swim_y_max=excluded.swim_y_max,
  speed=excluded.speed,size=excluded.size,rarity=excluded.rarity,
  sprite_sheet_path=excluded.sprite_sheet_path,thumbnail_path=excluded.thumbnail_path,
  sell_price=excluded.sell_price;

insert into public.collectible_habitats(species_id,region_id)
select s.id,r.id from public.collectible_species s cross join public.regions r
where s.id in ('apricot-starfish','round-barnacle-cluster','rusty-mini-anchor')
  and r.id in ('pongdang','coral','mistmoon','starruins','dreamabyss')
on conflict(species_id,region_id) do nothing;

-- Expect three common decorations, each with five habitats.
select s.id,s.name,s.kind,s.rarity,s.size,s.sell_price,s.thumbnail_path,
  array_agg(h.region_id order by h.region_id) as habitats
from public.collectible_species s left join public.collectible_habitats h on h.species_id=s.id
where s.id in ('apricot-starfish','round-barnacle-cluster','rusty-mini-anchor')
group by s.id order by s.id;

set constraints all immediate;
set constraints all deferred;

-- SOURCE: 25-decoration-editing/01-decoration-editing.sql
-- Apply after 23. Works with both the legacy and renamed catalog; repeatable.
-- Upload/move Storage images to decorations/ before switching the application.

do $$
begin
 if exists(select 1 from pg_enum e join pg_type t on t.oid=e.enumtypid join pg_namespace n on n.oid=t.typnamespace
   where n.nspname='public' and t.typname='collectible_kind' and e.enumlabel='structure') then
  alter type public.collectible_kind rename value 'structure' to 'decoration';
 end if;
end $$;

alter table public.player_collectibles add column if not exists rotation numeric not null default 0;
alter table public.player_collectibles add column if not exists scale numeric not null default 1;
do $$
begin
 if not exists(select 1 from pg_constraint where conrelid='public.player_collectibles'::regclass and conname='decoration_rotation_range') then
  alter table public.player_collectibles add constraint decoration_rotation_range check(rotation between 0 and 360);
 end if;
 if not exists(select 1 from pg_constraint where conrelid='public.player_collectibles'::regclass and conname='decoration_scale_range') then
  alter table public.player_collectibles add constraint decoration_scale_range check(scale between 0.5 and 2);
 end if;
end $$;

update public.collectible_species
set thumbnail_path='decorations/'||substr(thumbnail_path,length('structures/')+1)
where kind='decoration' and thumbnail_path like 'structures/%';
update public.collectible_gifts set species=jsonb_set(species,'{kind}','"decoration"'::jsonb)
where species->>'kind'='structure';
update public.collectible_gifts set species=jsonb_set(species,'{thumbnail_path}',to_jsonb('decorations/'||substr(species->>'thumbnail_path',length('structures/')+1)))
where species->>'kind'='decoration' and species->>'thumbnail_path' like 'structures/%';
update public.fishing_baits set effect_description=replace(effect_description,'구조물','장식물')
where effect_description like '%구조물%';

-- Enum rename updates stored enum values/constraints, but legacy PL/pgSQL bodies
-- keep their text. Refresh only the four existing functions containing kind checks.
-- CREATE OR REPLACE preserves their existing ownership and execute grants.
do $$
declare f record; definition text;
begin
 for f in select p.oid from pg_proc p join pg_namespace n on n.oid=p.pronamespace
  where n.nspname='app_private' and p.proname in ('cast_fishing','send_collectible_gift','place_collectible','sell_collectibles') loop
  definition:=pg_get_functiondef(f.oid);
  if strpos(definition,'''structure''')>0 then
   execute replace(definition,'''structure''','''decoration''');
  end if;
 end loop;
end $$;

create or replace function app_private.arrange_decoration(p_collectible_id uuid,p_tank_id uuid,p_x numeric,p_y numeric,p_rotation numeric,p_scale numeric)
returns jsonb language plpgsql security definer set search_path='' as $$
declare v_uid uuid:=auth.uid();v_item public.player_collectibles;
begin
 if v_uid is null then raise exception 'AUTH_REQUIRED'; end if;
 if p_x is null or p_y is null or not(p_x between 0 and 1) or not(p_y between 0 and 1) then raise exception 'INVALID_POSITION'; end if;
 if p_rotation is null or not(p_rotation between 0 and 360) or p_scale is null or not(p_scale between 0.5 and 2) then raise exception 'INVALID_TRANSFORM'; end if;
 if not exists(select 1 from public.aquarium_tanks where id=p_tank_id and user_id=v_uid) then raise exception 'TANK_NOT_FOUND'; end if;
 select * into v_item from public.player_collectibles
 where id=p_collectible_id and user_id=v_uid and sold_at is null and escrow_gift_id is null for update;
 if not found or v_item.tank_id is distinct from p_tank_id then raise exception 'COLLECTIBLE_NOT_FOUND'; end if;
 if not exists(select 1 from public.collectible_species where id=v_item.species_id and kind='decoration') then raise exception 'INVALID_ITEM'; end if;
 update public.player_collectibles set position_x=p_x,position_y=p_y,rotation=mod(p_rotation,360),scale=p_scale where id=v_item.id;
 return jsonb_build_object('id',v_item.id,'position_x',p_x,'position_y',p_y,'rotation',mod(p_rotation,360),'scale',p_scale);
end $$;
create or replace function public.arrange_decoration(p_collectible_id uuid,p_tank_id uuid,p_x numeric,p_y numeric,p_rotation numeric,p_scale numeric)
returns jsonb language sql security invoker set search_path='' as $$
 select app_private.arrange_decoration(p_collectible_id,p_tank_id,p_x,p_y,p_rotation,p_scale)
$$;
revoke all on function app_private.arrange_decoration(uuid,uuid,numeric,numeric,numeric,numeric),public.arrange_decoration(uuid,uuid,numeric,numeric,numeric,numeric) from public,anon,authenticated;
grant execute on function app_private.arrange_decoration(uuid,uuid,numeric,numeric,numeric,numeric),public.arrange_decoration(uuid,uuid,numeric,numeric,numeric,numeric) to authenticated;
notify pgrst,'reload schema';

select id,name,kind,thumbnail_path from public.collectible_species where kind='decoration' order by id;

set constraints all immediate;
set constraints all deferred;

-- SOURCE: 26-collectible-storage/01-storage.sql
-- Apply after 25 (and optionally 24). Repeatable; preserves existing placements.

create index if not exists collectible_storage_lookup on public.player_collectibles(user_id,acquired_at desc,id)
where sold_at is null and escrow_gift_id is null and tank_id is null;
create index if not exists collectible_tank_occupancy on public.player_collectibles(tank_id)
where sold_at is null and escrow_gift_id is null and tank_id is not null;

create or replace function app_private.aquarium_state() returns jsonb language plpgsql security definer set search_path='' as $$
declare v_uid uuid:=auth.uid();
begin
 if v_uid is null then raise exception 'AUTH_REQUIRED'; end if;
 insert into public.player_aquariums(user_id) values(v_uid) on conflict do nothing;
 insert into public.aquarium_tanks(user_id,background_id,is_default)
 select v_uid,background_id,true from public.player_aquariums where user_id=v_uid
 on conflict(user_id) where is_default do nothing;
 return jsonb_build_object(
 'background',(select background_id from public.aquarium_tanks where user_id=v_uid and is_default),
 'tanks',coalesce((select jsonb_agg(to_jsonb(t) order by t.created_at,t.id) from public.aquarium_tanks t where user_id=v_uid),'[]'::jsonb),
 'inhabitants',coalesce((select jsonb_agg(to_jsonb(c)||jsonb_build_object('species',app_private.species_payload(c.species_id,c.map_region_id)) order by c.acquired_at,c.id)
   from public.player_collectibles c join public.collectible_species s on s.id=c.species_id
   where c.user_id=v_uid and c.sold_at is null and c.escrow_gift_id is null and c.tank_id is not null and s.kind in ('fish','trash','decoration')),'[]'::jsonb),
 'storageCount',(select count(*) from public.player_collectibles c join public.collectible_species s on s.id=c.species_id
   where c.user_id=v_uid and c.sold_at is null and c.escrow_gift_id is null and c.tank_id is null and s.kind in ('fish','trash','decoration')),
 'tankCapacity',50,'tankPrice',200,
 'owned',coalesce((select jsonb_agg(background_id) from public.owned_aquarium_backgrounds where user_id=v_uid),'[]'::jsonb),
 'catalog',(select jsonb_agg(to_jsonb(b) order by b.price) from public.aquarium_backgrounds b));
end $$;

create or replace function app_private.collectible_storage(p_offset integer default 0,p_query text default '',p_kind text default 'all')
returns jsonb language plpgsql stable security definer set search_path='' as $$
declare v_uid uuid:=auth.uid();v_total integer;v_items jsonb;v_query text:=btrim(coalesce(p_query,''));
begin
 if v_uid is null then raise exception 'AUTH_REQUIRED'; end if;
 if p_offset is null or p_offset<0 or char_length(v_query)>60 or p_kind is null or p_kind not in ('all','fish','trash','decoration') then raise exception 'INVALID_STORAGE_QUERY'; end if;
 select count(*) into v_total from public.player_collectibles c join public.collectible_species s on s.id=c.species_id
 where c.user_id=v_uid and c.tank_id is null and c.sold_at is null and c.escrow_gift_id is null
   and s.kind in ('fish','trash','decoration') and (p_kind='all' or s.kind::text=p_kind) and strpos(s.name,v_query)>0;
 select coalesce(jsonb_agg(to_jsonb(q)||jsonb_build_object('species',app_private.species_payload(q.species_id,q.map_region_id)) order by q.acquired_at desc,q.id),'[]'::jsonb) into v_items
 from (select c.* from public.player_collectibles c join public.collectible_species s on s.id=c.species_id
 where c.user_id=v_uid and c.tank_id is null and c.sold_at is null and c.escrow_gift_id is null
   and s.kind in ('fish','trash','decoration') and (p_kind='all' or s.kind::text=p_kind) and strpos(s.name,v_query)>0
 order by c.acquired_at desc,c.id limit 50 offset p_offset) q;
 return jsonb_build_object('items',v_items,'total',v_total,'pageSize',50);
end $$;

create or replace function app_private.move_collectibles(p_collectible_ids uuid[],p_tank_id uuid default null)
returns jsonb language plpgsql security definer set search_path='' as $$
declare v_uid uuid:=auth.uid();v_ids uuid[];v_count integer;v_occupancy integer;v_added integer;
begin
 if v_uid is null then raise exception 'AUTH_REQUIRED'; end if;
 if coalesce(cardinality(p_collectible_ids),0) not between 1 and 50 then raise exception 'INVALID_SELECTION'; end if;
 select array_agg(id order by id) into v_ids from(select distinct unnest(p_collectible_ids) as id) q;
 if cardinality(v_ids)<>cardinality(p_collectible_ids) or array_position(v_ids,null) is not null then raise exception 'INVALID_SELECTION'; end if;
 -- Serialize admissions to the same tank before locking individuals in ID order.
 if p_tank_id is not null then
  perform 1 from public.aquarium_tanks where id=p_tank_id and user_id=v_uid for update;
  if not found then raise exception 'TANK_NOT_FOUND'; end if;
 end if;
 perform 1 from public.player_collectibles where id=any(v_ids) and user_id=v_uid order by id for update;
 select count(*) into v_count from public.player_collectibles c join public.collectible_species s on s.id=c.species_id
 where c.id=any(v_ids) and c.user_id=v_uid and c.sold_at is null and c.escrow_gift_id is null and s.kind in ('fish','trash','decoration');
 if v_count<>cardinality(v_ids) then raise exception 'COLLECTIBLE_NOT_FOUND'; end if;
 if p_tank_id is not null then
  if exists(select 1 from public.player_collectibles where id=any(v_ids) and tank_id is not null and tank_id<>p_tank_id) then raise exception 'STORAGE_REQUIRED'; end if;
  select count(*) into v_added from public.player_collectibles where id=any(v_ids) and tank_id is null;
  select count(*) into v_occupancy from public.player_collectibles where tank_id=p_tank_id and user_id=v_uid and sold_at is null and escrow_gift_id is null;
  if v_added>0 and v_occupancy+v_added>50 then raise exception 'TANK_FULL'; end if;
 end if;
 update public.player_collectibles set tank_id=p_tank_id,position_x=null,position_y=null
 where id=any(v_ids) and tank_id is distinct from p_tank_id;
 return app_private.aquarium_state();
end $$;

create or replace function public.collectible_storage(p_offset integer default 0,p_query text default '',p_kind text default 'all')
returns jsonb language sql security invoker set search_path='' as $$select app_private.collectible_storage(p_offset,p_query,p_kind)$$;
create or replace function public.move_collectibles(p_collectible_ids uuid[],p_tank_id uuid default null)
returns jsonb language sql security invoker set search_path='' as $$select app_private.move_collectibles(p_collectible_ids,p_tank_id)$$;
revoke all on function app_private.collectible_storage(integer,text,text),public.collectible_storage(integer,text,text),app_private.move_collectibles(uuid[],uuid),public.move_collectibles(uuid[],uuid) from public,anon,authenticated;
grant execute on function app_private.collectible_storage(integer,text,text),public.collectible_storage(integer,text,text),app_private.move_collectibles(uuid[],uuid),public.move_collectibles(uuid[],uuid) to authenticated;

create or replace function app_private.cast_fishing(p_region_id text,p_bait_id text,p_operation_id uuid) returns jsonb language plpgsql security definer set search_path='' as $$
declare v_uid uuid:=auth.uid(); w public.player_wallets; a public.fishing_attempts; s public.collectible_species;
 v_current text; v_required boolean; v_count integer; v_rarity public.game_rarity; v_tank uuid; v_item uuid; v_decoration boolean; v_map_region text; v_species_id text;
begin
 if v_uid is null then raise exception 'AUTH_REQUIRED'; end if;
 if p_operation_id is null then raise exception 'INVALID_TRADE'; end if;
 perform pg_advisory_xact_lock(hashtextextended('region:'||v_uid::text,0));
 perform app_private.get_gold_wallet();
 select * into w from public.player_wallets where user_id=v_uid for update;
 select * into a from public.fishing_attempts where user_id=v_uid and operation_id=p_operation_id;
 if found then
  if a.region_id is distinct from p_region_id or a.bait_id is distinct from p_bait_id then raise exception 'OPERATION_CONFLICT'; end if;
  select c.species_id,c.map_region_id into v_species_id,v_map_region from public.player_collectibles c where c.id=a.collectible_id;
  select * into s from public.collectible_species where id=v_species_id;
  return jsonb_build_object('attempt',to_jsonb(a)||jsonb_build_object('species',case when s.id is null then null else app_private.species_payload(s.id,v_map_region) end),'replayed',true);
 end if;
 select effect_kind='decoration' into v_decoration from public.fishing_baits where id=p_bait_id;
 if not found then raise exception 'INVALID_BAIT'; end if;
 select requires_map_fragment into v_required from public.regions where id=p_region_id;
 if not found then raise exception 'REGION_NOT_FOUND'; end if;
 select region_id into v_current from public.player_navigation where user_id=v_uid;
 if v_current is distinct from p_region_id then raise exception 'NOT_IN_REGION'; end if;
 if v_required and not exists(select 1 from public.player_map_fragments where user_id=v_uid and region_id=p_region_id) then raise exception 'REGION_LOCKED'; end if;
 v_count:=coalesce((w.inventory->>p_bait_id)::integer,0);
 if v_count<1 then raise exception 'NO_BAIT'; end if;
 if not v_decoration then v_rarity:=app_private.resolve_fishing(p_bait_id,floor(random()*10000)::integer); end if;
 if v_decoration or v_rarity is not null then
  select c.id,r.id into v_species_id,v_map_region
  from public.collectible_species c join public.collectible_habitats h on h.species_id=c.id
  left join public.regions r on c.kind='map' and r.id=h.region_id
  where
   (h.region_id=p_region_id and ((v_decoration and c.kind='decoration') or
     (not v_decoration and ((c.kind='fish' and c.rarity=v_rarity) or(c.kind='trash' and c.rarity=v_rarity)))))
   or (not v_decoration and c.kind='map' and c.rarity=v_rarity and r.requires_map_fragment and r.rarity=c.rarity
     and not exists(select 1 from public.player_map_fragments f where f.user_id=v_uid and f.region_id=r.id))
  order by random() limit 1;
  if not found then raise exception 'NO_COLLECTIBLE_FOR_REGION'; end if;
  select * into s from public.collectible_species where id=v_species_id;
  if s.kind='map' then
   insert into public.player_map_fragments(user_id,region_id) values(v_uid,v_map_region) on conflict do nothing;
  end if;
  insert into public.player_collectibles(user_id,species_id,tank_id,map_region_id) values(v_uid,s.id,v_tank,v_map_region) returning id into v_item;
  insert into public.player_discoveries(user_id,species_id) values(v_uid,s.id) on conflict do nothing;
 end if;
 update public.player_wallets set inventory=jsonb_set(inventory,array[p_bait_id],to_jsonb(v_count-1)),updated_at=now() where user_id=v_uid;
 insert into public.fishing_attempts(user_id,operation_id,region_id,bait_id,rarity,collectible_id)
 values(v_uid,p_operation_id,p_region_id,p_bait_id,coalesce(s.rarity,(select rarity from public.regions where id=v_map_region)),v_item) returning * into a;
 return jsonb_build_object('attempt',to_jsonb(a)||jsonb_build_object('species',case when s.id is null then null else app_private.species_payload(s.id,v_map_region) end),'replayed',false);
end $$;

create or replace function app_private.claim_collectible_gift(p_gift_id uuid) returns jsonb language plpgsql security definer set search_path='' as $$
declare v_uid uuid:=auth.uid();g public.collectible_gifts;v_tank uuid;v_count integer;
begin
 if v_uid is null then raise exception 'AUTH_REQUIRED'; end if;
 select * into g from public.collectible_gifts where id=p_gift_id and recipient_id=v_uid for update;
 if not found then raise exception 'GIFT_NOT_FOUND'; end if;
 if g.status='claimed' then return to_jsonb(g); end if;
 perform app_private.aquarium_state();
 perform 1 from public.player_collectibles where user_id=v_uid and escrow_gift_id=g.id order by id for update;
 select count(*) into v_count from public.player_collectibles where user_id=v_uid and escrow_gift_id=g.id and sold_at is null;
 if v_count<>g.quantity then raise exception 'GIFT_UNAVAILABLE'; end if;
 update public.player_collectibles set tank_id=null,escrow_gift_id=null where user_id=v_uid and escrow_gift_id=g.id;
 insert into public.player_discoveries(user_id,species_id) values(v_uid,g.species->>'id') on conflict do nothing;
 update public.collectible_gifts set status='claimed',claimed_at=now() where id=g.id returning * into g;
 update public.notifications set read_at=coalesce(read_at,now()) where recipient_id=v_uid and gift_id=g.id and kind='gift_received';
 if g.sender_id is not null then
  insert into public.notifications(recipient_id,actor_id,category,kind,title,body,gift_id) values(g.sender_id,v_uid,'gift','gift_claimed','선물을 받았어요',g.recipient_name||'님이 보낸 선물을 받았어요.',g.id) on conflict do nothing;
 end if;
 return to_jsonb(g);
end $$;

-- Fishing no longer downloads/renders the entire ownership inventory.
create or replace function app_private.fishing_state() returns jsonb language plpgsql security definer set search_path='' as $$
begin
 if auth.uid() is null then raise exception 'AUTH_REQUIRED'; end if;
 return jsonb_build_object('baits',(select jsonb_agg(to_jsonb(b) order by b.sort_order) from public.fishing_baits b));
end $$;

notify pgrst,'reload schema';

set constraints all immediate;
set constraints all deferred;

-- SOURCE: 27-new-decorations/01-new-decorations.sql
-- Apply after 25/26. Upload assets/storage-upload/new/decorations/ to
-- the collectibles bucket's decorations/ prefix before running this seed.
-- Repeatable; preserves ownership, discoveries and placements.

-- 16 restricted every non-fish item to common. Decorations now have rarities;
-- trash and base map catalog entries retain their existing common-only rule.
alter table public.collectible_species drop constraint if exists collectible_nonfish_common;
alter table public.collectible_species add constraint collectible_nonfish_common
  check (kind in ('fish','decoration') or rarity='common');

insert into public.collectible_species
  (id,kind,name,description,swim_y_min,swim_y_max,speed,size,rarity,sprite_sheet_path,thumbnail_path,sell_price)
values
  ('lavender-starfish','decoration','라벤더 불가사리','연보랏빛 다섯 팔에 작은 진주 같은 돌기가 돋아 있다. 어항 벽에 붙어 조용히 바다를 바라본다.',null,null,0,52,'common',null,'decorations/normal/lavender-starfish_thumbnail.png',35),
  ('mint-starfish','decoration','민트 불가사리','짧고 통통한 팔을 펼친 민트빛 불가사리. 작은 크림색 돌기가 시원한 바다 색과 어우러진다.',null,null,0,50,'common',null,'decorations/normal/mint-starfish_thumbnail.png',35),
  ('tiny-wooden-sign','decoration','꼬마 나무 팻말','파도에 닳은 작은 나무판에 물고기 모양이 새겨져 있다. 내 작은 바다에 아늑한 길잡이가 되어 준다.',null,null,0,54,'common',null,'decorations/normal/tiny-wooden-sign_thumbnail.png',40),
  ('ripple-coral-fragment','decoration','물결 산호 조각','살구빛과 분홍빛이 겹겹이 번지는 작은 부채 모양 산호. 물결처럼 굽은 가장자리에 바다의 시간이 남아 있다.',null,null,0,62,'rare',null,'decorations/rare/ripple-coral-fragment_thumbnail.png',150),
  ('butter-starfish','decoration','버터 불가사리','부드러운 버터빛 몸에 주황색 점이 콕콕 박힌 불가사리. 둥근 팔을 펼치면 작은 햇살을 붙여 둔 듯하다.',null,null,0,54,'rare',null,'decorations/rare/butter-starfish_thumbnail.png',140)
on conflict(id) do update set
  kind=excluded.kind,name=excluded.name,description=excluded.description,
  swim_y_min=excluded.swim_y_min,swim_y_max=excluded.swim_y_max,
  speed=excluded.speed,size=excluded.size,rarity=excluded.rarity,
  sprite_sheet_path=excluded.sprite_sheet_path,thumbnail_path=excluded.thumbnail_path,
  sell_price=excluded.sell_price;

insert into public.collectible_habitats(species_id,region_id)
select s.id,r.id from public.collectible_species s cross join public.regions r
where s.id in ('lavender-starfish','mint-starfish','tiny-wooden-sign','ripple-coral-fragment','butter-starfish')
  and r.id in ('pongdang','coral','mistmoon','starruins','dreamabyss')
on conflict(species_id,region_id) do nothing;

select s.id,s.name,s.kind,s.rarity,s.size,s.sell_price,s.thumbnail_path,
  array_agg(h.region_id order by h.region_id) as habitats
from public.collectible_species s left join public.collectible_habitats h on h.species_id=s.id
where s.id in ('lavender-starfish','mint-starfish','tiny-wooden-sign','ripple-coral-fragment','butter-starfish')
group by s.id order by s.id;

set constraints all immediate;
set constraints all deferred;

-- SOURCE: 28-coastal-decorations/01-coastal-decorations.sql
-- Apply after 27 (which enables rare decorations).
-- Upload the five flat PNGs in assets/storage-upload/new/ using the target
-- paths listed in assets/storage-upload/new/coastal-decorations.json.
-- Repeatable; preserves ownership, discoveries and placements.

insert into public.collectible_species
  (id,kind,name,description,swim_y_min,swim_y_max,speed,size,rarity,sprite_sheet_path,thumbnail_path,sell_price)
values
  ('lost-arrow-sign','decoration','길 잃은 화살표 팻말','파도에 닳은 나무 화살표에 작은 조개가 매달려 있다. 어디를 가리키는지는 잊었지만, 내 바다에서는 새로운 길의 시작이 된다.',null,null,0,56,'common',null,'decorations/normal/lost-arrow-sign_thumbnail.png',40),
  ('seashell-pinwheel','decoration','소라빛 바람개비','소라껍데기처럼 부드러운 빛깔을 두른 작은 바람개비. 바닷바람이 남긴 색을 간직한 채 물속에 아기자기한 쉼터를 꾸며 준다.',null,null,0,56,'common',null,'decorations/normal/seashell-pinwheel_thumbnail.png',40),
  ('pearl-bearing-clam','decoration','진주 품은 조개','살짝 열린 분홍빛 조개 안에 둥근 진주 한 알이 잠들어 있다. 오랜 시간 바다가 품어 온 작은 보물이다.',null,null,0,62,'common',null,'decorations/rare/pearl-bearing-clam_thumbnail.png',45),
  ('sleeping-mini-shipwreck','decoration','잠든 꼬마 난파선','돛을 잃고 바닷속에 내려앉은 작은 나무배. 부서진 선실 사이로 바다 친구들이 드나들며 새로운 이야기를 채워 간다.',null,null,0,90,'rare',null,'decorations/rare/sleeping-mini-shipwreck_thumbnail.png',190),
  ('sunken-mailbox','decoration','잠긴 우체통','미역 줄기가 느슨하게 감기고 작은 따개비가 붙은 오래된 우체통. 전하지 못한 바다의 소식을 조용히 간직하고 있다.',null,null,0,64,'rare',null,'decorations/rare/sunken-mailbox_thumbnail.png',170)
on conflict(id) do update set
  kind=excluded.kind,name=excluded.name,description=excluded.description,
  swim_y_min=excluded.swim_y_min,swim_y_max=excluded.swim_y_max,
  speed=excluded.speed,size=excluded.size,rarity=excluded.rarity,
  sprite_sheet_path=excluded.sprite_sheet_path,thumbnail_path=excluded.thumbnail_path,
  sell_price=excluded.sell_price;

insert into public.collectible_habitats(species_id,region_id)
select s.id,r.id from public.collectible_species s cross join public.regions r
where s.id in ('lost-arrow-sign','seashell-pinwheel','pearl-bearing-clam','sleeping-mini-shipwreck','sunken-mailbox')
  and r.id in ('pongdang','coral','mistmoon','starruins','dreamabyss')
on conflict(species_id,region_id) do nothing;

select s.id,s.name,s.kind,s.rarity,s.size,s.sell_price,s.thumbnail_path,
  array_agg(h.region_id order by h.region_id) as habitats
from public.collectible_species s left join public.collectible_habitats h on h.species_id=s.id
where s.id in ('lost-arrow-sign','seashell-pinwheel','pearl-bearing-clam','sleeping-mini-shipwreck','sunken-mailbox')
group by s.id order by s.id;

set constraints all immediate;
set constraints all deferred;

-- SOURCE: 29-statue-decorations/01-statue-decorations.sql
-- Apply after 28. Upload the four new flat PNGs in assets/storage-upload/new/
-- using statue-decorations.json's Storage paths. Existing clam image stays put.
-- Repeatable; preserves owned individuals, discoveries and placements.

update public.collectible_species set rarity='common',sell_price=45
where id='pearl-bearing-clam' and kind='decoration';

insert into public.collectible_species
  (id,kind,name,description,swim_y_min,swim_y_max,speed,size,rarity,sprite_sheet_path,thumbnail_path,sell_price)
values
  ('moonlit-jellyfish-lantern','decoration','달빛 해파리 풍등','해파리를 닮은 작은 풍등. 은은한 달빛을 머금고 바닷속 길을 밝혀 준다.',null,null,0,62,'rare',null,'decorations/rare/moonlit-jellyfish-lantern_thumbnail.png',160),
  ('coral-covered-treasure-chest','decoration','산호 덮인 보물상자','오래된 상자 위에 산호가 작은 정원을 만들었다. 뚜껑 사이에는 누군가의 반짝이는 기억이 남아 있다.',null,null,0,72,'rare',null,'decorations/rare/coral-covered-treasure-chest_thumbnail.png',190),
  ('sleeping-seahorse-statue','decoration','잠든 해마 석상','둥근 꼬리를 감고 잠든 작은 해마 석상. 오랫동안 같은 자리에서 바다 친구들의 꿈을 지켜 왔다.',null,null,0,68,'rare',null,'decorations/rare/sleeping-seahorse-statue_thumbnail.png',170),
  ('pongi-statue','decoration','퐁이 석상','작은 조개를 품고 앉은 퐁이의 모습을 돌에 새겼다. 머리 위 불가사리와 다정한 미소가 오래도록 내 작은 바다를 지켜 준다.',null,null,0,86,'epic',null,'decorations/epic/pongi-statue_thumbnail.png',600)
on conflict(id) do update set
  kind=excluded.kind,name=excluded.name,description=excluded.description,
  swim_y_min=excluded.swim_y_min,swim_y_max=excluded.swim_y_max,
  speed=excluded.speed,size=excluded.size,rarity=excluded.rarity,
  sprite_sheet_path=excluded.sprite_sheet_path,thumbnail_path=excluded.thumbnail_path,
  sell_price=excluded.sell_price;

insert into public.collectible_habitats(species_id,region_id)
select s.id,r.id from public.collectible_species s cross join public.regions r
where s.id in ('moonlit-jellyfish-lantern','coral-covered-treasure-chest','sleeping-seahorse-statue','pongi-statue')
  and r.id in ('pongdang','coral','mistmoon','starruins','dreamabyss')
on conflict(species_id,region_id) do nothing;

select s.id,s.name,s.kind,s.rarity,s.size,s.sell_price,s.thumbnail_path,
  array_agg(h.region_id order by h.region_id) as habitats
from public.collectible_species s left join public.collectible_habitats h on h.species_id=s.id
where s.id in ('pearl-bearing-clam','moonlit-jellyfish-lantern','coral-covered-treasure-chest','sleeping-seahorse-statue','pongi-statue')
group by s.id order by s.id;

set constraints all immediate;
set constraints all deferred;

-- SOURCE: 30-native-collectibles/01-native-collectibles.sql
-- Apply after 29. Repeatable; preserves ownership, placements and map unlocks.

alter table public.collectible_species add column if not exists native_region_id text references public.regions(id);
alter table public.collectible_species add column if not exists is_native boolean
  generated always as (native_region_id is not null) stored;
do $$ begin
 if not exists(select 1 from pg_constraint where conrelid='public.collectible_species'::regclass and conname='native_collectible_kind') then
  alter table public.collectible_species add constraint native_collectible_kind
   check(native_region_id is null or kind in ('fish','trash','decoration'));
 end if;
end $$;

-- Every habitat edit locks its parent catalog rows, serializing it with a
-- concurrent native-region change. ID order also handles species reassignment.
create or replace function app_private.lock_collectible_habitat_species()
returns trigger language plpgsql security invoker set search_path='' as $$
declare v_ids text[];
begin
 if tg_op='INSERT' then v_ids:=array[new.species_id];
 elsif tg_op='DELETE' then v_ids:=array[old.species_id];
 else v_ids:=array[old.species_id,new.species_id]; end if;
 perform 1 from public.collectible_species where id=any(v_ids) order by id for update;
 if tg_op='DELETE' then return old; end if;
 return new;
end $$;

-- Deferred validation permits setting the native region and replacing habitat
-- rows in one transaction, but never permits 0 or 2 habitats at commit.
create or replace function app_private.check_native_collectible_habitats()
returns trigger language plpgsql security invoker set search_path='' as $$
declare v_ids text[];v_id text;v_region text;v_count bigint;v_match bigint;
begin
 if tg_table_name='collectible_species' then
  if tg_op='DELETE' then v_ids:=array[old.id];
  elsif tg_op='INSERT' then v_ids:=array[new.id];
  else v_ids:=array[old.id,new.id]; end if;
 else
  if tg_op='DELETE' then v_ids:=array[old.species_id];
  elsif tg_op='INSERT' then v_ids:=array[new.species_id];
  else v_ids:=array[old.species_id,new.species_id]; end if;
 end if;
 for v_id in select distinct unnest(v_ids) loop
  select native_region_id into v_region from public.collectible_species where id=v_id;
  if found and v_region is not null then
   select count(*),count(*) filter(where region_id=v_region) into v_count,v_match
    from public.collectible_habitats where species_id=v_id;
   if v_count<>1 or v_match<>1 then
    raise exception 'NATIVE_HABITAT_REQUIRED: % must have exactly one habitat in %',v_id,v_region using errcode='23514';
   end if;
  end if;
 end loop;
 return null;
end $$;
drop trigger if exists collectible_habitat_species_lock on public.collectible_habitats;
create trigger collectible_habitat_species_lock before insert or update or delete on public.collectible_habitats
 for each row execute function app_private.lock_collectible_habitat_species();
drop trigger if exists native_species_habitats on public.collectible_species;
create constraint trigger native_species_habitats after insert or update on public.collectible_species
 deferrable initially deferred for each row execute function app_private.check_native_collectible_habitats();
drop trigger if exists native_habitat_count on public.collectible_habitats;
create constraint trigger native_habitat_count after insert or update or delete on public.collectible_habitats
 deferrable initially deferred for each row execute function app_private.check_native_collectible_habitats();
revoke all on function app_private.lock_collectible_habitat_species(),app_private.check_native_collectible_habitats() from public,anon,authenticated;

update public.collectible_species set rarity='rare' where id='coral-house' and kind='decoration';
update public.regions set rarity='rare' where id='mistmoon';
-- Map habitat entries describe destinations. The generic map's display rarity
-- is resolved from regions by species_payload; retain mistmoon's destination.
insert into public.collectible_habitats(species_id,region_id)
select id,'mistmoon' from public.collectible_species where id='ocean-map' and kind='map'
on conflict do nothing;
create or replace function app_private.species_payload(p_species_id text,p_map_region_id text default null)
returns jsonb language sql stable security invoker set search_path='' as $$
 select to_jsonb(s)||case when s.kind='map' then jsonb_build_object(
  'name',coalesce(r.name||' 지도 조각',s.name),'rarity',coalesce(r.rarity,s.rarity),'map_region_id',r.id)
  else '{}'::jsonb end
 from public.collectible_species s left join public.regions r on r.id=p_map_region_id where s.id=p_species_id
$$;
-- Map catalog rows are common templates; destination rarity controls rolls.
do $$ declare v_oid oid;v_definition text; begin
 for v_oid in select p.oid from pg_proc p join pg_namespace n on n.oid=p.pronamespace
  where n.nspname='app_private' and p.proname='cast_fishing' loop
  v_definition:=pg_get_functiondef(v_oid);
  v_definition:=replace(v_definition,
   'c.kind=''map'' and c.rarity=v_rarity and r.requires_map_fragment and r.rarity=c.rarity',
   'c.kind=''map'' and r.rarity=v_rarity and r.requires_map_fragment');
  v_definition:=replace(v_definition,
   'coalesce(s.rarity,(select rarity from public.regions where id=v_map_region))',
   'case when s.kind=''map'' then (select rarity from public.regions where id=v_map_region) else s.rarity end');
  execute v_definition;
 end loop;
end $$;
notify pgrst,'reload schema';

select id,name,rarity,is_native,native_region_id from public.collectible_species order by id;

set constraints all immediate;
set constraints all deferred;

-- SOURCE: 31-mistmoon-natives/01-mistmoon-natives.sql
-- Apply after 30; upload PNGs in assets/storage-upload/new/1052/ first.
-- Repeatable, preserves ownership and placements. Deferred native constraints
-- validate each species and its sole habitat together at commit.

create index if not exists collectible_species_native_region on public.collectible_species(native_region_id) where native_region_id is not null;
insert into public.collectible_species
 (id,kind,name,description,swim_y_min,swim_y_max,speed,size,rarity,sprite_sheet_path,thumbnail_path,sell_price,native_region_id)
values
 ('hazy-glass-marble','trash','흐릿한 유리구슬','안개달 해역의 은빛 모래에 오래 묻혀 뿌옇게 변한 구슬. 유리 속에는 지워지지 않는 초승달 무늬가 남아 있다.',.65,.90,.015,36,'common',null,'trash/normal/hazy-glass-marble_thumbnail.png',10,'mistmoon'),
 ('soaked-moonlight-postcard','trash','젖은 달빛 엽서','은빛 안개에 젖어 글씨가 모두 지워진 엽서. 희미한 초승달 그림만이 누군가의 밤을 기억한다.',.35,.75,.012,46,'common',null,'trash/normal/soaked-moonlight-postcard_thumbnail.png',12,'mistmoon'),
 ('silver-mist-goby','fish','은안개 망둑','반투명 은빛 몸에 안개빛 지느러미를 두른 작은 망둑. 안개달 해역의 물밑을 조용히 누비며 달빛을 좇는다.',.60,.88,.030,56,'rare','fish/rare/silver-mist-goby_sprite.png','fish/rare/silver-mist-goby_thumbnail.png',160,'mistmoon'),
 ('crescent-seahorse','fish','초승달 해마','연보랏빛 꼬리를 초승달처럼 감은 작은 해마. 안개가 내려앉은 밤이면 은빛 배를 반짝이며 느긋하게 헤엄친다.',.30,.70,.025,62,'rare','fish/rare/crescent-seahorse_sprite.png','fish/rare/crescent-seahorse_thumbnail.png',180,'mistmoon'),
 ('moon-sleep-waterlily','decoration','달잠 수련','은백색 꽃잎 사이에 푸른빛을 품은 작은 수련. 안개달 해역의 고요한 밤을 꽃 한 송이에 담았다.',null,null,0,62,'rare',null,'decorations/rare/moon-sleep-waterlily_thumbnail.png',160,'mistmoon'),
 ('mist-bell-windchime','decoration','안개종 풍경','작은 유리종 아래 달 모양 조각이 매달린 풍경. 안개달 해역의 잔물결을 따라 잊힌 자장가를 간직한다.',null,null,0,64,'rare',null,'decorations/rare/mist-bell-windchime_thumbnail.png',170,'mistmoon')
on conflict(id) do update set
 kind=excluded.kind,name=excluded.name,description=excluded.description,swim_y_min=excluded.swim_y_min,swim_y_max=excluded.swim_y_max,
 speed=excluded.speed,size=excluded.size,rarity=excluded.rarity,sprite_sheet_path=excluded.sprite_sheet_path,
 thumbnail_path=excluded.thumbnail_path,sell_price=excluded.sell_price,native_region_id=excluded.native_region_id;
delete from public.collectible_habitats
where species_id in ('hazy-glass-marble','soaked-moonlight-postcard','silver-mist-goby','crescent-seahorse','moon-sleep-waterlily','mist-bell-windchime') and region_id<>'mistmoon';
insert into public.collectible_habitats(species_id,region_id)
select id,'mistmoon' from public.collectible_species
where id in ('hazy-glass-marble','soaked-moonlight-postcard','silver-mist-goby','crescent-seahorse','moon-sleep-waterlily','mist-bell-windchime')
on conflict do nothing;

select id,name,kind,rarity,is_native,native_region_id from public.collectible_species where native_region_id='mistmoon' order by kind,id;

set constraints all immediate;
set constraints all deferred;

-- SOURCE: 32-regional-fishing/01-regional-fishing.sql
-- Apply after 31. Upload assets/storage-upload/new/regional-fishing/ first.
-- Repeatable; preserves ownership, placements, unlocks and operation IDs.

create or replace function app_private.apply_pongdang_native_region()
returns trigger language plpgsql security invoker set search_path='' as $$
begin
 if new.name like '%퐁당%' and new.kind in ('fish','trash','decoration') then new.native_region_id:='pongdang';end if;
 return new;
end $$;
drop trigger if exists pongdang_native_region on public.collectible_species;
create trigger pongdang_native_region before insert or update of name,kind,native_region_id on public.collectible_species
 for each row execute function app_private.apply_pongdang_native_region();
revoke all on function app_private.apply_pongdang_native_region() from public,anon,authenticated;
alter table public.collectible_species drop constraint if exists collectible_nonfish_common;
alter table public.collectible_species add constraint collectible_nonfish_common
 check(kind in ('fish','decoration','map') or rarity='common');

insert into public.collectible_species
 (id,kind,name,description,swim_y_min,swim_y_max,speed,size,rarity,sprite_sheet_path,thumbnail_path,sell_price,native_region_id)
values
 ('diver-pongdang','fish','잠수부 퐁당이','잠수복을 입고 퐁당 앞바다를 탐험하는 퐁당이. 둥근 헬멧 너머 미소를 지으며 물갈퀴와 꼬리를 움직여 헤엄친다.',.20,.75,.040,82,'epic','fish/epic/diver-pongdang-swimming_sprite.png','fish/epic/diver-pongdang-swimming_thumbnail.png',650,'pongdang'),
 ('pongdang-fish','fish','퐁당 물고기','살구빛 몸과 머리 위 분홍 불가사리가 퐁당이를 닮은 물고기. 퐁당 앞바다에서 둥근 지느러미를 팔랑이며 헤엄친다.',.25,.70,.045,66,'rare','fish/rare/pongdang-fish_sprite.png','fish/rare/pongdang-fish_thumbnail.png',180,'pongdang')
on conflict(id) do update set
 kind=excluded.kind,name=excluded.name,description=excluded.description,swim_y_min=excluded.swim_y_min,swim_y_max=excluded.swim_y_max,
 speed=excluded.speed,size=excluded.size,rarity=excluded.rarity,sprite_sheet_path=excluded.sprite_sheet_path,
 thumbnail_path=excluded.thumbnail_path,sell_price=excluded.sell_price,native_region_id=excluded.native_region_id;

update public.collectible_species set native_region_id='pongdang'
where name like '%퐁당%' and kind in ('fish','trash','decoration');
delete from public.collectible_habitats h using public.collectible_species s
where h.species_id=s.id and s.name like '%퐁당%' and s.kind in ('fish','trash','decoration') and h.region_id<>'pongdang';
insert into public.collectible_habitats(species_id,region_id)
select id,'pongdang' from public.collectible_species where name like '%퐁당%' and kind in ('fish','trash','decoration')
on conflict do nothing;

insert into public.collectible_species
 (id,kind,name,description,swim_y_min,swim_y_max,speed,size,rarity,sprite_sheet_path,thumbnail_path,sell_price)
select 'map-'||r.id,'map',r.name||' 지도 조각',r.name||'의 풍경과 항로가 그려진 지도 조각. 아직 잠긴 바다로 향하는 길을 알려 준다.',
 null,null,0,60,r.rarity,null,'map/'||case r.rarity when 'common' then 'normal' else r.rarity::text end||'/map-'||r.id||'_thumbnail.png',0
from public.regions r
on conflict(id) do update set name=excluded.name,description=excluded.description,rarity=excluded.rarity,thumbnail_path=excluded.thumbnail_path;
-- Map habitat rows are destinations, not native habitats. Keep legacy owned
-- ocean-map individuals, but retire that template from future rolls.
delete from public.collectible_habitats where species_id='ocean-map';
delete from public.collectible_habitats h using public.collectible_species s
where h.species_id=s.id and s.kind='map' and s.id<>('map-'||h.region_id) and s.id in (select 'map-'||id from public.regions);
insert into public.collectible_habitats(species_id,region_id)
select 'map-'||id,id from public.regions on conflict do nothing;

create or replace function app_private.regional_bait_odds(p_bait_id text,p_region_id text)
returns jsonb language plpgsql stable security invoker set search_path='' as $$
declare b public.fishing_baits;v_rank integer;v_success integer;v_c integer;v_r integer;v_e integer;v_m integer;
begin
 select * into b from public.fishing_baits where id=p_bait_id;
 if not found then raise exception 'INVALID_BAIT'; end if;
 select case rarity when 'common' then 0 when 'rare' then 1 when 'epic' then 2 else 3 end into v_rank from public.regions where id=p_region_id;
 if not found then raise exception 'REGION_NOT_FOUND'; end if;
 if b.effect_kind='decoration' then return jsonb_build_object('common_bp',0,'rare_bp',0,'epic_bp',0,'mythic_bp',0,'failure_bp',0); end if;
 v_success:=10000-b.failure_bp;
 if b.common_bp>0 then
  v_r:=1300+300*v_rank;v_e:=180+80*v_rank;v_m:=20+20*v_rank;
 elsif b.rare_bp>0 then
  v_r:=9870-50*v_rank;v_e:=100+40*v_rank;v_m:=30+10*v_rank;
 elsif b.epic_bp>0 then
  v_r:=0;v_e:=9970-20*v_rank;v_m:=30+20*v_rank;
 else v_r:=0;v_e:=0;v_m:=10000;end if;
 -- Integer basis points; all rounding remainder goes to the lowest allowed tier.
 v_m:=floor(v_success::numeric*v_m/10000);v_e:=floor(v_success::numeric*v_e/10000);
 if b.common_bp>0 then v_r:=floor(v_success::numeric*v_r/10000);v_c:=v_success-v_r-v_e-v_m;
 elsif b.rare_bp>0 then v_c:=0;v_r:=v_success-v_e-v_m;
 elsif b.epic_bp>0 then v_c:=0;v_r:=0;v_e:=v_success-v_m;
 else v_c:=0;v_r:=0;v_e:=0;v_m:=v_success;end if;
 return jsonb_build_object('common_bp',v_c,'rare_bp',v_r,'epic_bp',v_e,'mythic_bp',v_m,'failure_bp',b.failure_bp);
end $$;
create or replace function app_private.resolve_regional_fishing(p_bait_id text,p_region_id text,p_roll integer)
returns public.game_rarity language plpgsql stable security invoker set search_path='' as $$
declare o jsonb;v_m integer;v_e integer;v_r integer;v_c integer;
begin
 if p_roll is null or p_roll<0 or p_roll>=10000 then raise exception 'INVALID_ROLL'; end if;
 o:=app_private.regional_bait_odds(p_bait_id,p_region_id);
 if exists(select 1 from public.fishing_baits where id=p_bait_id and effect_kind='decoration') then raise exception 'DECORATION_NOT_READY'; end if;
 v_m:=(o->>'mythic_bp')::integer;v_e:=(o->>'epic_bp')::integer;v_r:=(o->>'rare_bp')::integer;v_c:=(o->>'common_bp')::integer;
 if p_roll<v_m then return 'mythic';elsif p_roll<v_m+v_e then return 'epic';elsif p_roll<v_m+v_e+v_r then return 'rare';elsif p_roll<v_m+v_e+v_r+v_c then return 'common';end if;
 return null;
end $$;

create or replace function app_private.pick_regional_collectible(p_region_id text,p_rarity public.game_rarity,p_decoration boolean,p_map_roll integer)
returns table(species_id text,map_region_id text) language plpgsql volatile security invoker set search_path='' as $$
begin
 if p_map_roll is null or p_map_roll<0 or p_map_roll>=10000 then raise exception 'INVALID_ROLL'; end if;
 if not p_decoration and p_map_roll<500 then
  return query select c.id,r.id from public.collectible_species c
   join public.collectible_habitats h on h.species_id=c.id join public.regions r on r.id=h.region_id
   where c.kind='map' and c.id='map-'||r.id and c.rarity=p_rarity and r.rarity=p_rarity and r.requires_map_fragment
    and not exists(select 1 from public.player_map_fragments f where f.user_id=auth.uid() and f.region_id=r.id)
   order by random() limit 1;
  if found then return;end if;
 end if;
 return query select c.id,null::text from public.collectible_species c join public.collectible_habitats h on h.species_id=c.id
 where h.region_id=p_region_id and ((p_decoration and c.kind='decoration') or(not p_decoration and c.kind in ('fish','trash') and c.rarity=p_rarity))
 order by random() limit 1;
end $$;
revoke all on function app_private.regional_bait_odds(text,text),app_private.resolve_regional_fishing(text,text,integer),app_private.pick_regional_collectible(text,public.game_rarity,boolean,integer) from public,anon,authenticated;

create or replace function app_private.fishing_state() returns jsonb language plpgsql security definer set search_path='' as $$
declare v_uid uuid:=auth.uid();v_region text;
begin
 if v_uid is null then raise exception 'AUTH_REQUIRED';end if;
 select region_id into v_region from public.player_navigation where user_id=v_uid;
 v_region:=coalesce(v_region,'pongdang');
 return jsonb_build_object('regionId',v_region,'regionName',(select name from public.regions where id=v_region),'mapChanceBp',500,
  'baits',(select jsonb_agg(to_jsonb(b)||app_private.regional_bait_odds(b.id,v_region) order by b.sort_order) from public.fishing_baits b));
end $$;

update public.fishing_baits set effect_description=case id
 when 'bait_special' then '실패 없이 최소 희귀를 보장해요. 상위 해역에서는 특급·신화 확률이 조금 높아져요.'
 when 'bait_epic' then '실패 없이 최소 특급을 보장해요. 상위 해역에서는 신화 확률이 조금 높아져요.'
 when 'bait_magnet' then '현재 해역에 서식하는 장식물을 반드시 획득해요. 지도는 나오지 않아요.'
 when 'bait_safe' then '기본 실패 확률을 상대적으로 20% 줄여요. 등급 확률은 해역에 따라 달라져요.'
 else '해역 등급이 높아질수록 희귀·특급·신화 확률이 조금 높아져요. 실패해도 미끼 1개를 소모해요.' end;

create or replace function app_private.cast_fishing(p_region_id text,p_bait_id text,p_operation_id uuid) returns jsonb language plpgsql security definer set search_path='' as $$
declare v_uid uuid:=auth.uid(); w public.player_wallets; a public.fishing_attempts; s public.collectible_species;
 v_current text; v_required boolean; v_count integer; v_rarity public.game_rarity; v_tank uuid; v_item uuid; v_decoration boolean; v_map_region text; v_species_id text;
begin
 if v_uid is null then raise exception 'AUTH_REQUIRED'; end if;
 if p_operation_id is null then raise exception 'INVALID_TRADE'; end if;
 perform pg_advisory_xact_lock(hashtextextended('region:'||v_uid::text,0));
 perform app_private.get_gold_wallet();
 select * into w from public.player_wallets where user_id=v_uid for update;
 select * into a from public.fishing_attempts where user_id=v_uid and operation_id=p_operation_id;
 if found then
  if a.region_id is distinct from p_region_id or a.bait_id is distinct from p_bait_id then raise exception 'OPERATION_CONFLICT'; end if;
  select c.species_id,c.map_region_id into v_species_id,v_map_region from public.player_collectibles c where c.id=a.collectible_id;
  select * into s from public.collectible_species where id=v_species_id;
  return jsonb_build_object('attempt',to_jsonb(a)||jsonb_build_object('species',case when s.id is null then null else app_private.species_payload(s.id,v_map_region) end),'replayed',true);
 end if;
 select effect_kind='decoration' into v_decoration from public.fishing_baits where id=p_bait_id;
 if not found then raise exception 'INVALID_BAIT'; end if;
 select requires_map_fragment into v_required from public.regions where id=p_region_id;
 if not found then raise exception 'REGION_NOT_FOUND'; end if;
 select region_id into v_current from public.player_navigation where user_id=v_uid;
 if v_current is distinct from p_region_id then raise exception 'NOT_IN_REGION'; end if;
 if v_required and not exists(select 1 from public.player_map_fragments where user_id=v_uid and region_id=p_region_id) then raise exception 'REGION_LOCKED'; end if;
 v_count:=coalesce((w.inventory->>p_bait_id)::integer,0);
 if v_count<1 then raise exception 'NO_BAIT'; end if;
 if not v_decoration then v_rarity:=app_private.resolve_regional_fishing(p_bait_id,p_region_id,floor(random()*10000)::integer); end if;
 if v_decoration or v_rarity is not null then
  select q.species_id,q.map_region_id into v_species_id,v_map_region
  from app_private.pick_regional_collectible(p_region_id,v_rarity,v_decoration,floor(random()*10000)::integer) q;
  if not found then raise exception 'NO_COLLECTIBLE_FOR_REGION'; end if;
  select * into s from public.collectible_species where id=v_species_id;
  if s.kind='map' then
   insert into public.player_map_fragments(user_id,region_id) values(v_uid,v_map_region) on conflict do nothing;
  end if;
  insert into public.player_collectibles(user_id,species_id,tank_id,map_region_id) values(v_uid,s.id,v_tank,v_map_region) returning id into v_item;
  insert into public.player_discoveries(user_id,species_id) values(v_uid,s.id) on conflict do nothing;
 end if;
 update public.player_wallets set inventory=jsonb_set(inventory,array[p_bait_id],to_jsonb(v_count-1)),updated_at=now() where user_id=v_uid;
 insert into public.fishing_attempts(user_id,operation_id,region_id,bait_id,rarity,collectible_id)
 values(v_uid,p_operation_id,p_region_id,p_bait_id,coalesce(s.rarity,(select rarity from public.regions where id=v_map_region)),v_item) returning * into a;
 return jsonb_build_object('attempt',to_jsonb(a)||jsonb_build_object('species',case when s.id is null then null else app_private.species_payload(s.id,v_map_region) end),'replayed',false);
end $$;


create or replace function app_private.collection_state() returns jsonb language plpgsql security definer set search_path='' as $$
declare v_uid uuid:=auth.uid();
begin
 if v_uid is null then raise exception 'AUTH_REQUIRED';end if;
 return jsonb_build_object('items',app_private.owned_collectibles(),
 'catalog',(select coalesce(jsonb_agg(to_jsonb(s)||jsonb_build_object(
 'discovered',d.species_id is not null,'habitats',coalesce((select jsonb_agg(jsonb_build_object('id',r.id,'name',r.name) order by r.sort_order)
 from public.collectible_habitats h join public.regions r on r.id=h.region_id where h.species_id=s.id),'[]'::jsonb)) order by s.kind,s.id),'[]'::jsonb)
 from public.collectible_species s left join public.player_discoveries d on d.species_id=s.id and d.user_id=v_uid where s.id<>'ocean-map'));
end $$;
notify pgrst,'reload schema';

set constraints all immediate;
set constraints all deferred;

-- SOURCE: 33-swimming-diver/01-swimming-diver.sql
-- Apply after 32. Upload the two new swimming-diver PNGs to collectibles/fish/epic/.
-- Updates only diver-pongdang; owned individuals and placements are preserved.

update public.collectible_species set kind='fish',
 description='잠수복을 입고 퐁당 앞바다를 탐험하는 퐁당이. 둥근 헬멧 너머 미소를 지으며 물갈퀴와 꼬리를 움직여 헤엄친다.',
 swim_y_min=.20,swim_y_max=.75,speed=.040,
 sprite_sheet_path='fish/epic/diver-pongdang-swimming_sprite.png',
 thumbnail_path='fish/epic/diver-pongdang-swimming_thumbnail.png'
where id='diver-pongdang';

-- This obsolete decoration image may be removed, including from gift snapshots.
update public.collectible_gifts g set species=g.species||jsonb_build_object(
 'kind',s.kind,'description',s.description,'swim_y_min',s.swim_y_min,'swim_y_max',s.swim_y_max,
 'speed',s.speed,'sprite_sheet_path',s.sprite_sheet_path,'thumbnail_path',s.thumbnail_path)
from public.collectible_species s where s.id='diver-pongdang' and g.species->>'id'=s.id;

select id,name,kind,rarity,speed,swim_y_min,swim_y_max,sprite_sheet_path,thumbnail_path
from public.collectible_species where id='diver-pongdang';

set constraints all immediate;
set constraints all deferred;

-- SOURCE: 34-remove-ocean-map/01-remove-ocean-map.sql
-- Apply after 32 (33 is independent). Repeatable.
-- Convert legacy owned maps to their destination-specific maps before removing
-- the obsolete template. Existing region unlocks and fishing history survive.

insert into public.player_discoveries(user_id,species_id,discovered_at)
select c.user_id,s.id,min(c.acquired_at)
from public.player_collectibles c join public.collectible_species s on s.id='map-'||c.map_region_id and s.kind='map'
where c.species_id='ocean-map'
group by c.user_id,s.id
on conflict(user_id,species_id) do nothing;

update public.player_collectibles c set species_id=s.id
from public.collectible_species s
where c.species_id='ocean-map' and s.id='map-'||c.map_region_id and s.kind='map';

-- A legacy map without a valid destination cannot be reassigned. Remove only
-- that obsolete individual; keep its attempt row and unlink the deleted item.
update public.fishing_attempts a set collectible_id=null
where collectible_id in (select id from public.player_collectibles where species_id='ocean-map');
delete from public.player_collectibles where species_id='ocean-map';
delete from public.player_discoveries where species_id='ocean-map';
delete from public.collectible_habitats where species_id='ocean-map';
delete from public.collectible_species where id='ocean-map';

select id,name,rarity,thumbnail_path from public.collectible_species where kind='map' order by id;

set constraints all immediate;
set constraints all deferred;

-- SOURCE: 35-collectible-movement/01-collectible-movement.sql
-- Apply after 34. Repeatable; existing ownership and placements are unchanged.

-- Existing deferred native-habitat triggers must finish each backfill statement
-- before the next ALTER TABLE in this migration.
set constraints all immediate;
do $$ begin
 if not exists(select 1 from information_schema.columns where table_schema='public' and table_name='collectible_species' and column_name='movement_type') then
  alter table public.collectible_species add column movement_type text not null default 'swim';
  update public.collectible_species set movement_type='fixed' where kind in ('decoration','map');
 end if;
 if not exists(select 1 from information_schema.columns where table_schema='public' and table_name='collectible_species' and column_name='flip_with_direction') then
  alter table public.collectible_species add column flip_with_direction boolean not null default true;
  update public.collectible_species set flip_with_direction=false where kind<>'fish';
 end if;
end $$;
alter table public.collectible_species add column if not exists travel_direction text not null default 'both';
do $$ begin
 if not exists(select 1 from pg_constraint where conrelid='public.collectible_species'::regclass and conname='collectible_movement_type') then
  alter table public.collectible_species add constraint collectible_movement_type check(movement_type in ('swim','pulse','crawl','fixed'));
 end if;
 if not exists(select 1 from pg_constraint where conrelid='public.collectible_species'::regclass and conname='collectible_travel_direction') then
  alter table public.collectible_species add constraint collectible_travel_direction check(travel_direction in ('both','left','right'));
 end if;
end $$;

-- New non-fish catalog rows inherit their category's existing visual behavior.
create or replace function app_private.default_collectible_movement()
returns trigger language plpgsql security invoker set search_path='' as $$
begin
 if new.kind in ('decoration','map') then
  new.movement_type:='fixed';new.flip_with_direction:=false;new.travel_direction:='both';
 elsif tg_op='INSERT' and new.kind='trash' then new.flip_with_direction:=false;
 elsif tg_op='UPDATE' and new.kind<>old.kind then
  new.movement_type:='swim';new.flip_with_direction:=(new.kind='fish');new.travel_direction:='both';
 end if;
 return new;
end $$;
drop trigger if exists collectible_movement_defaults on public.collectible_species;
create trigger collectible_movement_defaults before insert or update of kind on public.collectible_species
 for each row execute function app_private.default_collectible_movement();
revoke all on function app_private.default_collectible_movement() from public,anon,authenticated;
notify pgrst,'reload schema';

set constraints all immediate;
set constraints all deferred;

-- SOURCE: 36-pulse-crawl-species/01-pulse-crawl-species.sql
-- Apply after 35. Upload fish/normal and fish/rare PNGs from
-- assets/storage-upload/new/20261015-114904/ to collectibles first.
-- Repeatable; preserves owned individuals, discoveries and placements.

insert into public.collectible_species
 (id,kind,name,description,swim_y_min,swim_y_max,speed,size,rarity,sprite_sheet_path,thumbnail_path,sell_price,native_region_id,movement_type,flip_with_direction,travel_direction)
values
 ('moonbell-jellyfish','fish','달방울 해파리','반투명 연보라색 갓 안에 둥근 달무늬가 떠 있는 해파리. 안개달 해역에서 짧은 촉수를 모아 위로 솟았다 천천히 내려온다.',.20,.75,.030,60,'rare','fish/rare/moonbell-jellyfish_sprite.png','fish/rare/moonbell-jellyfish_thumbnail.png',170,'mistmoon','pulse',false,'both'),
 ('peach-umbrella-jellyfish','fish','복숭아 우산해파리','복숭아빛 우산 같은 갓 아래 크림색 촉수가 모여 있다. 몸을 오므리며 통통 떠올랐다 잔물결 사이로 느긋하게 내려온다.',.25,.80,.035,56,'common','fish/normal/peach-umbrella-jellyfish_sprite.png','fish/normal/peach-umbrella-jellyfish_thumbnail.png',35,null,'pulse',false,'both'),
 ('coral-claw-crab','fish','산호집게 꽃게','둥근 살구색 등딱지와 산호빛 집게를 가진 작은 꽃게. 산호빛 여울의 바닥을 옆으로 종종 걸으며 조개껍데기를 살핀다.',.86,.94,.030,64,'rare','fish/rare/coral-claw-crab_sprite.png','fish/rare/coral-claw-crab_thumbnail.png',180,'coral','crawl',false,'both'),
 ('pebble-hermit-crab','fish','조약돌 소라게','매끈한 회청색 소라집 아래 주황색 다리가 옹기종기 모여 있다. 바닥을 느릿느릿 오가며 집 밖으로 눈을 내민다.',.88,.96,.025,52,'common','fish/normal/pebble-hermit-crab_sprite.png','fish/normal/pebble-hermit-crab_thumbnail.png',30,null,'crawl',false,'both')
on conflict(id) do update set
 kind=excluded.kind,name=excluded.name,description=excluded.description,
 swim_y_min=excluded.swim_y_min,swim_y_max=excluded.swim_y_max,speed=excluded.speed,size=excluded.size,rarity=excluded.rarity,
 sprite_sheet_path=excluded.sprite_sheet_path,thumbnail_path=excluded.thumbnail_path,sell_price=excluded.sell_price,
 native_region_id=excluded.native_region_id,movement_type=excluded.movement_type,
 flip_with_direction=excluded.flip_with_direction,travel_direction=excluded.travel_direction;

delete from public.collectible_habitats h using public.collectible_species s
where h.species_id=s.id and s.id in ('moonbell-jellyfish','coral-claw-crab') and h.region_id<>s.native_region_id;
insert into public.collectible_habitats(species_id,region_id)
select s.id,s.native_region_id from public.collectible_species s where s.id in ('moonbell-jellyfish','coral-claw-crab')
on conflict do nothing;
insert into public.collectible_habitats(species_id,region_id)
select s.id,r.id from public.collectible_species s cross join public.regions r
where s.id in ('peach-umbrella-jellyfish','pebble-hermit-crab')
 and r.id in ('pongdang','coral','mistmoon','starruins','dreamabyss')
on conflict do nothing;

select s.id,s.name,s.rarity,s.is_native,s.native_region_id,s.movement_type,s.flip_with_direction,
 array_agg(h.region_id order by h.region_id) as habitats
from public.collectible_species s join public.collectible_habitats h on h.species_id=s.id
where s.id in ('moonbell-jellyfish','peach-umbrella-jellyfish','coral-claw-crab','pebble-hermit-crab')
group by s.id order by s.id;

set constraints all immediate;
set constraints all deferred;

-- SOURCE: 37-shared-sea-species/01-shared-sea-species.sql
-- Apply after 36. Upload the 36 PNGs from assets/storage-upload/new/20261015-124837/ first.
-- Repeatable; preserves ownership, discoveries and placements.

insert into public.collectible_species
 (id,kind,name,description,swim_y_min,swim_y_max,speed,size,rarity,sprite_sheet_path,thumbnail_path,sell_price,native_region_id,movement_type,flip_with_direction,travel_direction)
values
 ('bean-pufferfish','fish','콩알 복어','작은 콩처럼 동그란 몸에 짧은 가시가 돋아 있다. 노란 지느러미를 파닥이며 바다 친구들 사이를 오간다.',0.18,0.8,0.045,52,'common','fish/normal/bean-pufferfish_sprite.png','fish/normal/bean-pufferfish_thumbnail.png',35,null,'swim',true,'both'),
 ('orange-clownfish','fish','흰동가리','선명한 주황빛 몸에 하얀 띠가 둘러져 있다. 작은 지느러미를 부지런히 움직이며 느긋하게 헤엄친다.',0.18,0.8,0.045,54,'common','fish/normal/orange-clownfish_sprite.png','fish/normal/orange-clownfish_thumbnail.png',35,null,'swim',true,'both'),
 ('threadtail-shrimp','fish','실꼬리 새우','반투명한 몸 앞에서 실처럼 가는 수염이 살랑인다. 바닥을 종종 걸으며 모래 사이 작은 먹이를 찾는다.',0.86,0.95,0.022,48,'common','fish/normal/threadtail-shrimp_sprite.png','fish/normal/threadtail-shrimp_thumbnail.png',30,null,'crawl',true,'both'),
 ('button-urchin','fish','단추 성게','단추처럼 둥근 몸에 짧은 밤색 가시가 촘촘하다. 눈에 띄지 않을 만큼 천천히 바닥을 돌아다닌다.',0.86,0.95,0.022,46,'common','fish/normal/button-urchin_sprite.png','fish/normal/button-urchin_thumbnail.png',30,null,'crawl',false,'both'),
 ('soft-sea-cucumber','fish','말랑 해삼','말랑한 연갈색 몸에 작은 돌기가 오돌토돌 솟아 있다. 모래 위를 느릿느릿 지나며 바닥을 깨끗이 한다.',0.86,0.95,0.022,54,'common','fish/normal/soft-sea-cucumber_sprite.png','fish/normal/soft-sea-cucumber_thumbnail.png',30,null,'crawl',true,'both'),
 ('ribbon-eel','fish','리본 장어','가느다란 푸른 몸을 따라 노란 지느러미가 이어진다. 리본을 풀어 놓은 듯 부드럽게 몸을 굽히며 헤엄친다.',0.18,0.8,0.045,74,'common','fish/normal/ribbon-eel_sprite.png','fish/normal/ribbon-eel_thumbnail.png',45,null,'swim',true,'both'),
 ('pink-scallop','fish','분홍 가리비','분홍빛 부채 모양 껍데기를 살짝 열었다 닫는다. 물을 밀어 내며 작은 박자로 바닷속을 떠다닌다.',0.22,0.78,0.03,52,'common','fish/normal/pink-scallop_sprite.png','fish/normal/pink-scallop_thumbnail.png',35,null,'pulse',false,'both'),
 ('tiny-cuttlefish','fish','꼬마 갑오징어','둥근 몸 양옆에 물결 같은 지느러미가 달려 있다. 짧은 팔을 모으고 몸을 오므리며 통통 떠오른다.',0.22,0.78,0.03,56,'common','fish/normal/tiny-cuttlefish_sprite.png','fish/normal/tiny-cuttlefish_thumbnail.png',40,null,'pulse',false,'both'),
 ('peach-octopus','fish','복숭아 문어','복숭앗빛 둥근 머리 아래 통통한 여덟 팔이 모여 있다. 팔을 오므렸다 펼치며 물결에 몸을 맡긴다.',0.22,0.78,0.03,60,'common','fish/normal/peach-octopus_sprite.png','fish/normal/peach-octopus_thumbnail.png',45,null,'pulse',false,'both'),
 ('pearl-parrotfish','fish','진주 비늘돔','민트빛과 분홍빛 비늘에 진주 같은 윤기가 흐른다. 둥근 입으로 바위 표면을 살피며 잔잔한 바다를 누빈다.',0.18,0.8,0.045,70,'rare','fish/rare/pearl-parrotfish_sprite.png','fish/rare/pearl-parrotfish_thumbnail.png',170,null,'swim',true,'both'),
 ('blue-bronze-horseshoe-crab','fish','청금 투구게','오래된 청동을 닮은 등껍질 가장자리에 푸른빛이 돈다. 가느다란 꼬리를 끌며 바닥의 오래된 길을 더듬는다.',0.86,0.95,0.022,66,'rare','fish/rare/blue-bronze-horseshoe-crab_sprite.png','fish/rare/blue-bronze-horseshoe-crab_thumbnail.png',170,null,'crawl',false,'both'),
 ('glassfin-lionfish','fish','유리 지느러미 쏠배감펭','붉은 줄무늬 사이로 유리 같은 지느러미가 펼쳐진다. 가는 지느러미살마다 물빛이 맺혀 작은 부채처럼 반짝인다.',0.18,0.8,0.045,76,'rare','fish/rare/glassfin-lionfish_sprite.png','fish/rare/glassfin-lionfish_thumbnail.png',190,null,'swim',true,'both'),
 ('opal-nautilus','fish','오팔 앵무조개','크림색 나선 껍데기 안쪽으로 오팔빛이 은근히 번진다. 가느다란 촉수를 모으며 오래된 바다의 박자로 떠오른다.',0.22,0.78,0.03,64,'rare','fish/rare/opal-nautilus_sprite.png','fish/rare/opal-nautilus_thumbnail.png',180,null,'pulse',false,'both'),
 ('petal-nudibranch','fish','꽃잎 갯민숭달팽이','우윳빛 몸 위에 분홍 꽃잎 같은 아가미가 피어 있다. 작은 더듬이를 세우고 바닥에 부드러운 발자국을 남긴다.',0.86,0.95,0.022,58,'rare','fish/rare/petal-nudibranch_sprite.png','fish/rare/petal-nudibranch_thumbnail.png',160,null,'crawl',true,'both'),
 ('sea-crocodile','fish','바다악어','단단한 비늘과 긴 꼬리를 가진 바다의 여행자. 짧은 다리를 몸에 붙이고 물결 아래를 조용히 가로지른다.',0.18,0.8,0.045,88,'rare','fish/rare/sea-crocodile_sprite.png','fish/rare/sea-crocodile_thumbnail.png',210,null,'swim',true,'both'),
 ('starpattern-manta','fish','별무늬 만타','짙푸른 날개 위에 은빛 별자리가 이어진다. 금빛 가장자리와 작은 진주 같은 빛이 넓은 지느러미를 따라 흐른다.',0.18,0.8,0.045,104,'epic','fish/epic/starpattern-manta_sprite.png','fish/epic/starpattern-manta_thumbnail.png',680,null,'swim',false,'both'),
 ('aurora-eel','fish','오로라장어','길게 휘어진 몸 안으로 분홍빛과 보랏빛 오로라가 흐른다. 겹겹의 지느러미를 펼칠 때마다 은빛 비늘이 별처럼 빛난다.',0.18,0.8,0.045,102,'epic','fish/epic/aurora-eel_sprite.png','fish/epic/aurora-eel_thumbnail.png',700,null,'swim',true,'both'),
 ('dreaming-dumbo-octopus','fish','꿈꾸는 덤보문어','라벤더빛 몸에 은빛 꿈무늬가 수놓아져 있다. 귀 같은 지느러미와 진주빛 팔을 펼치며 달콤한 잠결에 바다를 떠돈다.',0.22,0.78,0.03,88,'epic','fish/epic/dreaming-dumbo-octopus_sprite.png','fish/epic/dreaming-dumbo-octopus_thumbnail.png',650,null,'pulse',false,'both')
on conflict(id) do update set
 kind=excluded.kind,name=excluded.name,description=excluded.description,
 swim_y_min=excluded.swim_y_min,swim_y_max=excluded.swim_y_max,speed=excluded.speed,size=excluded.size,rarity=excluded.rarity,
 sprite_sheet_path=excluded.sprite_sheet_path,thumbnail_path=excluded.thumbnail_path,sell_price=excluded.sell_price,
 native_region_id=excluded.native_region_id,movement_type=excluded.movement_type,
 flip_with_direction=excluded.flip_with_direction,travel_direction=excluded.travel_direction;

insert into public.collectible_habitats(species_id,region_id)
select s.id,r.id from public.collectible_species s cross join public.regions r
where s.id in ('bean-pufferfish','orange-clownfish','threadtail-shrimp','button-urchin','soft-sea-cucumber','ribbon-eel','pink-scallop','tiny-cuttlefish','peach-octopus','pearl-parrotfish','blue-bronze-horseshoe-crab','glassfin-lionfish','opal-nautilus','petal-nudibranch','sea-crocodile','starpattern-manta','aurora-eel','dreaming-dumbo-octopus')
 and r.id in ('pongdang','coral','mistmoon','starruins','dreamabyss')
on conflict(species_id,region_id) do nothing;

select s.id,s.name,s.rarity,s.is_native,s.movement_type,s.flip_with_direction,
 s.thumbnail_path,s.sprite_sheet_path,array_agg(h.region_id order by h.region_id) as habitats
from public.collectible_species s join public.collectible_habitats h on h.species_id=s.id
where s.id in ('bean-pufferfish','orange-clownfish','threadtail-shrimp','button-urchin','soft-sea-cucumber','ribbon-eel','pink-scallop','tiny-cuttlefish','peach-octopus','pearl-parrotfish','blue-bronze-horseshoe-crab','glassfin-lionfish','opal-nautilus','petal-nudibranch','sea-crocodile','starpattern-manta','aurora-eel','dreaming-dumbo-octopus')
group by s.id order by s.rarity,s.id;

set constraints all immediate;
set constraints all deferred;

-- SOURCE: 38-coral-natives/01-coral-natives.sql
-- Apply after 37. Upload 11 PNGs from assets/storage-upload/new/20261015-133650/ first.
-- Repeatable; preserves owned individuals, discoveries and placements.
-- Deferred native-habitat constraints validate the single habitat at commit.

insert into public.collectible_species
 (id,kind,name,description,swim_y_min,swim_y_max,speed,size,rarity,sprite_sheet_path,thumbnail_path,sell_price,native_region_id,movement_type,flip_with_direction,travel_direction)
values
 ('coral-bean-shrimp','fish','산호콩 새우','작은 콩처럼 통통한 살구빛 몸에 하얀 점이 박혀 있다. 산호빛 여울의 산호 틈을 종종 걸으며 먹이를 찾는다.',0.85,0.94,0.018,48,'common','fish/normal/coral-bean-shrimp_sprite.png','fish/normal/coral-bean-shrimp_thumbnail.png',35,'coral','crawl',true,'both'),
 ('pinkchin-blenny','fish','분홍턱 베도라치','크림색 몸 아래 분홍빛 턱을 내민 작은 베도라치. 머리 위 짧은 산호 모양 더듬이를 흔들며 산호빛 여울을 살핀다.',0.5,0.83,0.032,54,'common','fish/normal/pinkchin-blenny_sprite.png','fish/normal/pinkchin-blenny_thumbnail.png',40,'coral','swim',true,'both'),
 ('flower-coral-seadragon','fish','꽃산호 해룡','길게 휘어진 몸을 따라 분홍 산호꽃을 닮은 돌기가 피어 있다. 산호빛 여울의 가지 사이를 조용히 스쳐 지나간다.',0.24,0.73,0.025,72,'rare','fish/rare/flower-coral-seadragon_sprite.png','fish/rare/flower-coral-seadragon_thumbnail.png',185,'coral','swim',true,'both'),
 ('coralfan-butterflyfish','fish','산호부채 나비고기','둥근 몸에 살구빛과 민트빛 무늬가 부채처럼 겹친다. 산호빛 여울의 물살을 타면 넓은 지느러미가 꽃잎처럼 펼쳐진다.',0.2,0.76,0.035,68,'rare','fish/rare/coralfan-butterflyfish_sprite.png','fish/rare/coralfan-butterflyfish_thumbnail.png',175,'coral','swim',true,'both'),
 ('coral-flower-anemone','decoration','산호꽃 말미잘','분홍 촉수 끝에 작은 꽃봉오리 같은 방울이 맺혀 있다. 산호빛 여울에서 자라난 꽃 한 송이를 어항에 옮겨 둔 듯하다.',null,null,0,62,'rare',null,'decorations/rare/coral-flower-anemone_thumbnail.png',165,'coral','fixed',false,'both'),
 ('coral-crowned-turtle','fish','산호왕관 거북','등껍질 위에 작은 산호 정원이 자라는 거북. 머리의 산호 왕관과 반투명 지느러미에 여울의 빛이 은은하게 번진다.',0.2,0.73,0.028,96,'epic','fish/epic/coral-crowned-turtle_sprite.png','fish/epic/coral-crowned-turtle_thumbnail.png',680,'coral','swim',true,'both')
on conflict(id) do update set
 kind=excluded.kind,name=excluded.name,description=excluded.description,
 swim_y_min=excluded.swim_y_min,swim_y_max=excluded.swim_y_max,speed=excluded.speed,size=excluded.size,rarity=excluded.rarity,
 sprite_sheet_path=excluded.sprite_sheet_path,thumbnail_path=excluded.thumbnail_path,sell_price=excluded.sell_price,
 native_region_id=excluded.native_region_id,movement_type=excluded.movement_type,
 flip_with_direction=excluded.flip_with_direction,travel_direction=excluded.travel_direction;
delete from public.collectible_habitats
where species_id in ('coral-bean-shrimp','pinkchin-blenny','flower-coral-seadragon','coralfan-butterflyfish','coral-flower-anemone','coral-crowned-turtle') and region_id<>'coral';
insert into public.collectible_habitats(species_id,region_id)
select id,'coral' from public.collectible_species where id in ('coral-bean-shrimp','pinkchin-blenny','flower-coral-seadragon','coralfan-butterflyfish','coral-flower-anemone','coral-crowned-turtle')
on conflict(species_id,region_id) do nothing;

select s.id,s.name,s.kind,s.rarity,s.is_native,s.native_region_id,s.movement_type,
 array_agg(h.region_id order by h.region_id) as habitats
from public.collectible_species s join public.collectible_habitats h on h.species_id=s.id
where s.id in ('coral-bean-shrimp','pinkchin-blenny','flower-coral-seadragon','coralfan-butterflyfish','coral-flower-anemone','coral-crowned-turtle') group by s.id order by s.rarity,s.id;

set constraints all immediate;
set constraints all deferred;

commit;
