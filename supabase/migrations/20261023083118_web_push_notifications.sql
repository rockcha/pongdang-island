begin;

-- Device capabilities and encrypted push material never appear in the Data API.
create table app_private.push_subscriptions (
 id uuid primary key default gen_random_uuid(),
 user_id uuid not null references auth.users(id) on delete cascade,
 endpoint text not null unique check(length(endpoint) between 30 and 2048),
 p256dh text not null check(p256dh ~ '^[A-Za-z0-9_-]{87}=?$'),
 auth text not null check(auth ~ '^[A-Za-z0-9_-]{22}={0,2}$'),
 categories text[] not null default array['production','bait-production','expedition','harbor']::text[],
 created_at timestamptz not null default now(), updated_at timestamptz not null default now(),
 last_test_at timestamptz,
 check(categories <@ array['production','bait-production','expedition','harbor']::text[])
);
create index push_subscriptions_user on app_private.push_subscriptions(user_id);
alter table app_private.push_subscriptions enable row level security;
revoke all on app_private.push_subscriptions from public,anon,authenticated;

create table app_private.push_deliveries (
 id bigint generated always as identity primary key,
 subscription_id uuid not null references app_private.push_subscriptions(id) on delete cascade,
 notification_id uuid references public.notifications(id) on delete cascade,
 category text not null check(category in ('production','bait-production','expedition','harbor','test')),
 source_id uuid, source_started_at timestamptz,
 payload jsonb not null,
 status text not null default 'pending' check(status in ('pending','sending','sent','skipped','failed')),
 attempts integer not null default 0 check(attempts between 0 and 5),
 available_at timestamptz not null default now(), expires_at timestamptz not null default now()+interval '1 hour',
 lease_token uuid, locked_until timestamptz, finished_at timestamptz, last_status integer,
 unique(subscription_id,notification_id)
);
create index push_delivery_pending on app_private.push_deliveries(available_at,id) where status in ('pending','sending');
create index push_delivery_notice on app_private.push_deliveries(notification_id);
alter table app_private.push_deliveries enable row level security;
revoke all on app_private.push_deliveries from public,anon,authenticated;
revoke all on sequence app_private.push_deliveries_id_seq from public,anon,authenticated;

create function app_private.web_push_device(p_action text,p_subscription jsonb,p_categories text[])
returns jsonb language plpgsql security definer set search_path='' as $$
declare u uuid:=auth.uid(); e text:=p_subscription->>'endpoint'; s app_private.push_subscriptions; n integer;
begin
 if u is null then raise exception 'AUTH_REQUIRED';end if;
 if p_action is null or p_action not in ('state','save','delete','test') or e is null or length(e)>2048 then raise exception 'INVALID_PUSH_DEVICE';end if;
 select * into s from app_private.push_subscriptions where endpoint=e and user_id=u for update;
 if p_action='state' then return jsonb_build_object('registered',s.id is not null,'categories',coalesce(s.categories,array[]::text[]));end if;
 if p_action='delete' then delete from app_private.push_subscriptions where id=s.id;return jsonb_build_object('registered',false);end if;
 if p_action='test' then
  if s.id is null then raise exception 'PUSH_NOT_REGISTERED';end if;
  if s.last_test_at>clock_timestamp()-interval '1 minute' then raise exception 'PUSH_TEST_RATE_LIMIT';end if;
  update app_private.push_subscriptions set last_test_at=clock_timestamp() where id=s.id;
  insert into app_private.push_deliveries(subscription_id,category,payload,expires_at)
  values(s.id,'test',jsonb_build_object('userId',u,'title','퐁당! 알림이 도착했어요','body','이 기기에서 생산 완료·통발·귀항 소식을 받을 수 있어요.','url','/settings','tag','push-test:'||gen_random_uuid()),clock_timestamp()+interval '5 minutes');
  return jsonb_build_object('queued',true);
 end if;
 if e !~ '^https://(fcm\.googleapis\.com|([a-z0-9-]+\.)*push\.services\.mozilla\.com|([a-z0-9-]+\.)*push\.apple\.com|([a-z0-9-]+\.)*notify\.windows\.com)/[^[:space:]#]+$'
 or coalesce(p_subscription#>>'{keys,p256dh}','') !~ '^[A-Za-z0-9_-]{87}=?$'
 or coalesce(p_subscription#>>'{keys,auth}','') !~ '^[A-Za-z0-9_-]{22}={0,2}$'
 or p_categories is null or not (p_categories <@ array['production','bait-production','expedition','harbor']::text[])
 or cardinality(p_categories)>4 then raise exception 'INVALID_PUSH_DEVICE';end if;
 -- Serialize this user's cap, and never transfer another account's endpoint.
 perform 1 from auth.users where id=u for update;
 if exists(select 1 from app_private.push_subscriptions where endpoint=e and user_id<>u) then raise exception 'PUSH_DEVICE_CONFLICT';end if;
 select count(*) into n from app_private.push_subscriptions where user_id=u;
 if s.id is null and n>=10 then raise exception 'PUSH_DEVICE_LIMIT';end if;
 insert into app_private.push_subscriptions(user_id,endpoint,p256dh,auth,categories)
 values(u,e,p_subscription#>>'{keys,p256dh}',p_subscription#>>'{keys,auth}',p_categories)
 on conflict(endpoint) do update set p256dh=excluded.p256dh,auth=excluded.auth,categories=excluded.categories,updated_at=clock_timestamp()
 where app_private.push_subscriptions.user_id=u;
 get diagnostics n=row_count;
 if n=0 then raise exception 'PUSH_DEVICE_CONFLICT';end if;
 return jsonb_build_object('registered',true,'categories',p_categories);
end $$;
revoke all on function app_private.web_push_device(text,jsonb,text[]) from public,anon;
grant execute on function app_private.web_push_device(text,jsonb,text[]) to authenticated;
create function public.web_push_device(p_action text,p_subscription jsonb,p_categories text[] default array['production','bait-production','expedition','harbor']::text[])
returns jsonb language sql security invoker set search_path='' as $$select app_private.web_push_device(p_action,p_subscription,p_categories)$$;
revoke all on function public.web_push_device(text,jsonb,text[]) from public,anon;
grant execute on function public.web_push_device(text,jsonb,text[]) to authenticated;

-- A run timestamp avoids changing the existing start/claim accounting functions.
alter table app_private.bait_production_sites add column notified_started_at timestamptz;
alter table public.notifications add column bait_production_site_id uuid references app_private.bait_production_sites(id) on delete set null;
alter table public.notifications add column bait_production_started_at timestamptz;
create unique index notifications_bait_production_run on public.notifications(bait_production_site_id,bait_production_started_at) where bait_production_site_id is not null;
create function app_private.notify_due_bait_production_sites() returns integer language plpgsql security definer set search_path='' as $$
declare n integer;
begin
 with due as (
  select id from app_private.bait_production_sites where started_at is not null and notified_started_at is distinct from started_at
   and completes_at<=clock_timestamp() and expires_at>clock_timestamp() order by completes_at,id limit 500 for update skip locked
 ), marked as (
  update app_private.bait_production_sites s set notified_started_at=s.started_at from due where s.id=due.id returning s.*
 ) insert into public.notifications(recipient_id,category,kind,title,body,bait_production_site_id,bait_production_started_at)
 select s.user_id,'general','system','미끼 생산이 끝났어요!',f.name||'에서 '||b.name||' '||s.run_output||'개를 만들었어요. 보관 시간 안에 수령해 주세요.',s.id,s.started_at
 from marked s join public.bait_production_facilities f on f.id=s.facility_id join public.fishing_baits b on b.id=coalesce(s.run_bait_id,f.bait_id)
 on conflict(bait_production_site_id,bait_production_started_at) where bait_production_site_id is not null do nothing;
 get diagnostics n=row_count;return n;
end $$;
revoke all on function app_private.notify_due_bait_production_sites() from public,anon,authenticated;

create function app_private.enqueue_web_push() returns trigger language plpgsql security definer set search_path='' as $$
declare c text; path text; source uuid; started timestamptz;
begin
 if new.category<>'general' or new.kind<>'system' then return new;end if;
 if new.production_site_id is not null then c:='production';path:='/production';source:=new.production_site_id;started:=new.production_started_at;
 elsif new.bait_production_site_id is not null then c:='bait-production';path:='/bait-production';source:=new.bait_production_site_id;started:=new.bait_production_started_at;
 elsif new.expedition_id is not null then c:='expedition';path:='/expeditions';source:=new.expedition_id;
 elsif new.harbor_voyage_id is not null then c:='harbor';path:='/port';source:=new.harbor_voyage_id;
 else return new;end if;
 insert into app_private.push_deliveries(subscription_id,notification_id,category,source_id,source_started_at,payload)
 select s.id,new.id,c,source,started,jsonb_build_object('userId',new.recipient_id,'title',new.title,'body',new.body,'url',path,'tag','notice:'||new.id)
 from app_private.push_subscriptions s where s.user_id=new.recipient_id and c=any(s.categories)
 on conflict(subscription_id,notification_id) do nothing;
 return new;
end $$;
revoke all on function app_private.enqueue_web_push() from public,anon,authenticated;
create trigger enqueue_web_push after insert on public.notifications for each row execute function app_private.enqueue_web_push();

create function app_private.push_delivery_current(q app_private.push_deliveries,u uuid) returns boolean language sql stable set search_path='' as $$
 select case q.category
 when 'test' then true
 when 'production' then exists(select 1 from app_private.production_sites where id=q.source_id and user_id=u and started_at=q.source_started_at and completes_at<=now() and expires_at>now())
 when 'bait-production' then exists(select 1 from app_private.bait_production_sites where id=q.source_id and user_id=u and started_at=q.source_started_at and completes_at<=now() and expires_at>now())
 when 'expedition' then exists(select 1 from public.fishing_expeditions where id=q.source_id and user_id=u and claimed_at is null and returns_at<=now())
 when 'harbor' then exists(select 1 from public.harbor_voyages where id=q.source_id and user_id=u and claimed_at is null and returns_at<=now())
 else false end
$$;
revoke all on function app_private.push_delivery_current(app_private.push_deliveries,uuid) from public,anon,authenticated;

create function app_private.claim_web_push(p_limit integer default 20) returns jsonb language plpgsql security definer set search_path='' as $$
declare result jsonb;
begin
 update app_private.push_deliveries q set status='skipped',finished_at=clock_timestamp()
 from app_private.push_subscriptions s where s.id=q.subscription_id and q.status in ('pending','sending') and (q.locked_until is null or q.locked_until<clock_timestamp())
 and (q.expires_at<=clock_timestamp() or q.attempts>=5 or (q.category<>'test' and not(q.category=any(s.categories))) or not app_private.push_delivery_current(q,s.user_id));
 with due as (
  select q.id from app_private.push_deliveries q where q.status in ('pending','sending') and q.attempts<5
   and q.available_at<=clock_timestamp() and q.expires_at>clock_timestamp() and (q.locked_until is null or q.locked_until<clock_timestamp())
  order by q.available_at,q.id limit greatest(1,least(coalesce(p_limit,20),20)) for update skip locked
 ), claimed as (
  update app_private.push_deliveries q set status='sending',attempts=q.attempts+1,lease_token=gen_random_uuid(),locked_until=clock_timestamp()+interval '3 minutes'
  from due where q.id=due.id returning q.*
 ) select coalesce(jsonb_agg(jsonb_build_object('id',q.id,'leaseToken',q.lease_token,'payload',q.payload,'subscription',jsonb_build_object('endpoint',s.endpoint,'keys',jsonb_build_object('p256dh',s.p256dh,'auth',s.auth)))),'[]'::jsonb)
 into result from claimed q join app_private.push_subscriptions s on s.id=q.subscription_id;
 -- Finished payloads are short-lived; never retain a growing delivery history.
 delete from app_private.push_deliveries where finished_at<clock_timestamp()-interval '7 days';
 return result;
end $$;
revoke all on function app_private.claim_web_push(integer) from public,anon,authenticated;
grant execute on function app_private.claim_web_push(integer) to service_role;
create function public.claim_web_push(p_limit integer default 20) returns jsonb language sql security invoker set search_path='' as $$select app_private.claim_web_push(p_limit)$$;
revoke all on function public.claim_web_push(integer) from public,anon,authenticated;
grant execute on function public.claim_web_push(integer) to service_role;

create function app_private.finish_web_push(p_id bigint,p_lease_token uuid,p_status integer) returns void language plpgsql security definer set search_path='' as $$
declare q app_private.push_deliveries;
begin
 select * into q from app_private.push_deliveries where id=p_id and lease_token=p_lease_token and status='sending' for update;
 if not found then return;end if;
 if p_status in (404,410) then delete from app_private.push_subscriptions where id=q.subscription_id;return;end if;
 update app_private.push_deliveries set last_status=p_status,lease_token=null,locked_until=null,
  status=case when p_status between 200 and 299 then 'sent' when p_status in (400,401,403,413) or attempts>=5 then 'failed' else 'pending' end,
  finished_at=case when p_status between 200 and 299 or p_status in (400,401,403,413) or attempts>=5 then clock_timestamp() else null end,
  available_at=clock_timestamp()+make_interval(secs=>least(3600,30*power(2,attempts)::integer)) where id=q.id;
end $$;
revoke all on function app_private.finish_web_push(bigint,uuid,integer) from public,anon,authenticated;
grant execute on function app_private.finish_web_push(bigint,uuid,integer) to service_role;
create function public.finish_web_push(p_id bigint,p_lease_token uuid,p_status integer) returns void language sql security invoker set search_path='' as $$select app_private.finish_web_push(p_id,p_lease_token,p_status)$$;
revoke all on function public.finish_web_push(bigint,uuid,integer) from public,anon,authenticated;
grant execute on function public.finish_web_push(bigint,uuid,integer) to service_role;

-- The minute timer is inert until the private worker URL/secret are configured.
create function app_private.dispatch_web_push() returns void language plpgsql security definer set search_path='' as $$
declare target text; secret text;
begin
 perform app_private.notify_due_bait_production_sites();
 if not exists(select 1 from pg_catalog.pg_extension where extname='pg_net') or to_regclass('vault.decrypted_secrets') is null then return;end if;
 execute 'select decrypted_secret from vault.decrypted_secrets where name=$1 limit 1' into target using 'web_push_worker_url';
 execute 'select decrypted_secret from vault.decrypted_secrets where name=$1 limit 1' into secret using 'web_push_cron_secret';
 if target is null or secret is null then return;end if;
 execute 'select net.http_post(url:=$1,headers:=$2,body:=''{}''::jsonb,timeout_milliseconds:=5000)'
 using target,jsonb_build_object('Content-Type','application/json','x-push-worker-key',secret);
end $$;
revoke all on function app_private.dispatch_web_push() from public,anon,authenticated;

create function app_private.configure_web_push_worker(p_url text,p_secret text,p_keys jsonb default null) returns void language plpgsql security definer set search_path='' as $$
declare sid uuid; entry record;
begin
 if p_url !~ '^https://[a-z0-9]+\.supabase\.co/functions/v1/web-push$' or p_secret !~ '^[A-Za-z0-9_-]{43}$' then raise exception 'INVALID_PUSH_CONFIGURATION';end if;
 if to_regclass('vault.secrets') is null then raise exception 'VAULT_UNAVAILABLE';end if;
 execute 'select id from vault.secrets where name=$1 limit 1' into sid using 'web_push_worker_url';
 if sid is null then execute 'select vault.create_secret($1,$2)' using p_url,'web_push_worker_url';else execute 'select vault.update_secret($1,$2)' using sid,p_url;end if;
 execute 'select id from vault.secrets where name=$1 limit 1' into sid using 'web_push_cron_secret';
 if sid is null then execute 'select vault.create_secret($1,$2)' using p_secret,'web_push_cron_secret';else execute 'select vault.update_secret($1,$2)' using sid,p_secret;end if;
 if p_keys is not null then
  if coalesce(p_keys->>'WEB_PUSH_PUBLIC_KEY','') !~ '^[A-Za-z0-9_-]{87}$' or coalesce(p_keys->>'WEB_PUSH_PRIVATE_KEY','') !~ '^[A-Za-z0-9_-]{43}$'
   or coalesce(p_keys->>'WEB_PUSH_SUBJECT','') !~ '^(https://|mailto:)[^[:space:]]+$' then raise exception 'INVALID_PUSH_KEYS';end if;
  for entry in select * from jsonb_each_text(p_keys) where key in ('WEB_PUSH_PUBLIC_KEY','WEB_PUSH_PRIVATE_KEY','WEB_PUSH_SUBJECT') loop
   execute 'select id from vault.secrets where name=$1 limit 1' into sid using lower(entry.key);
   if sid is null then execute 'select vault.create_secret($1,$2)' using entry.value,lower(entry.key);else execute 'select vault.update_secret($1,$2)' using sid,entry.value;end if;
  end loop;
 end if;
end $$;
revoke all on function app_private.configure_web_push_worker(text,text,jsonb) from public,anon,authenticated;
grant execute on function app_private.configure_web_push_worker(text,text,jsonb) to service_role;
create function public.configure_web_push_worker(p_url text,p_secret text,p_keys jsonb default null) returns void language sql security invoker set search_path='' as $$select app_private.configure_web_push_worker(p_url,p_secret,p_keys)$$;
revoke all on function public.configure_web_push_worker(text,text,jsonb) from public,anon,authenticated;
grant execute on function public.configure_web_push_worker(text,text,jsonb) to service_role;
create function app_private.web_push_worker_configuration() returns jsonb language plpgsql security definer set search_path='' as $$
declare result jsonb;
begin
 if to_regclass('vault.decrypted_secrets') is null then return '{}'::jsonb;end if;
 execute 'select coalesce(jsonb_object_agg(upper(name),decrypted_secret),''{}''::jsonb) from vault.decrypted_secrets where name in (''web_push_public_key'',''web_push_private_key'',''web_push_subject'',''web_push_cron_secret'')' into result;
 return result;
end $$;
revoke all on function app_private.web_push_worker_configuration() from public,anon,authenticated;
grant execute on function app_private.web_push_worker_configuration() to service_role;
create function public.web_push_worker_configuration() returns jsonb language sql security invoker set search_path='' as $$select app_private.web_push_worker_configuration()$$;
revoke all on function public.web_push_worker_configuration() from public,anon,authenticated;
grant execute on function public.web_push_worker_configuration() to service_role;
grant usage on schema app_private to service_role;

do $$begin
 if exists(select 1 from pg_available_extensions where name='pg_net') and not exists(select 1 from pg_extension where extname='pg_net') then execute 'create extension pg_net with schema extensions';end if;
 if exists(select 1 from pg_extension where extname='pg_cron') then
  execute $job$select cron.schedule('web-push-delivery','* * * * *','select app_private.dispatch_web_push()')$job$;
 end if;
end $$;
notify pgrst,'reload schema';
commit;
