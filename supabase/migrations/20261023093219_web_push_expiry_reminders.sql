begin;
-- New categories are opt-in; existing subscriptions and defaults stay intact.
alter table app_private.push_subscriptions drop constraint push_subscriptions_categories_check;
alter table app_private.push_subscriptions add constraint push_subscriptions_categories_check check(categories <@ array['production','bait-production','expedition','harbor','production-expiring','bait-production-expiring']::text[]);
alter table app_private.push_deliveries drop constraint push_deliveries_category_check;
alter table app_private.push_deliveries add constraint push_deliveries_category_check check(category in ('production','bait-production','expedition','harbor','test','production-expiring','bait-production-expiring'));
create unique index push_delivery_expiring_run on app_private.push_deliveries(subscription_id,category,source_id,source_started_at)
 where category in ('production-expiring','bait-production-expiring');
create index production_sites_expiring_push on app_private.production_sites(expires_at,user_id) where started_at is not null;
create index bait_sites_expiring_push on app_private.bait_production_sites(expires_at,user_id) where started_at is not null;

create or replace function app_private.web_push_device(p_action text,p_subscription jsonb,p_categories text[])
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
 or p_categories is null or not (p_categories <@ array['production','bait-production','expedition','harbor','production-expiring','bait-production-expiring']::text[])
 or cardinality(p_categories)>6 then raise exception 'INVALID_PUSH_DEVICE';end if;
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

-- No inbox history or old notifications are needed for this time-sensitive push.
create function app_private.enqueue_expiring_production_push() returns integer
language plpgsql security definer set search_path='' as $$
declare n integer; stamp timestamptz:=clock_timestamp();
begin
 with runs as (
  select s.id,s.user_id,s.started_at,s.expires_at,'production-expiring'::text category,'/production'::text path,
   '연료 보관 만료가 얼마 남지 않았어요!'::text title,
   f.name||'의 연료 보관이 약 5분 뒤 끝나요. 만료 전에 수령해 주세요.' body
  from app_private.production_sites s join public.production_facilities f on f.id=s.facility_id
  where s.started_at is not null and s.completes_at<=stamp and s.expires_at>stamp and s.expires_at<=stamp+interval '5 minutes'
  union all
  select s.id,s.user_id,s.started_at,s.expires_at,'bait-production-expiring','/bait-production',
   '미끼가 상하기 전에 받아 주세요!',f.name||'의 미끼 보관이 약 5분 뒤 끝나요. 상하기 전에 수령해 주세요.'
  from app_private.bait_production_sites s join public.bait_production_facilities f on f.id=s.facility_id
  where s.started_at is not null and s.completes_at<=stamp and s.expires_at>stamp and s.expires_at<=stamp+interval '5 minutes'
 )
 insert into app_private.push_deliveries(subscription_id,category,source_id,source_started_at,payload,expires_at)
 select d.id,r.category,r.id,r.started_at,
  jsonb_build_object('userId',r.user_id,'title',r.title,'body',r.body,'url',r.path,'tag',r.category||':'||r.id||':'||r.started_at,'expiresAt',r.expires_at),r.expires_at
 from runs r join app_private.push_subscriptions d on d.user_id=r.user_id and r.category=any(d.categories)
 where not exists(select 1 from app_private.push_deliveries q where q.subscription_id=d.id and q.category=r.category and q.source_id=r.id and q.source_started_at=r.started_at)
 order by r.expires_at,r.id,d.id limit 500
 on conflict(subscription_id,category,source_id,source_started_at) where category in ('production-expiring','bait-production-expiring') do nothing;
 get diagnostics n=row_count;return n;
end $$;
revoke all on function app_private.enqueue_expiring_production_push() from public,anon,authenticated;

create or replace function app_private.push_delivery_current(q app_private.push_deliveries,u uuid) returns boolean language sql stable set search_path='' as $$
 select case q.category
 when 'test' then true
 when 'production-expiring' then exists(select 1 from app_private.production_sites where id=q.source_id and user_id=u and started_at=q.source_started_at and completes_at<=now() and expires_at>now() and expires_at<=now()+interval '5 minutes')
 when 'bait-production-expiring' then exists(select 1 from app_private.bait_production_sites where id=q.source_id and user_id=u and started_at=q.source_started_at and completes_at<=now() and expires_at>now() and expires_at<=now()+interval '5 minutes')
 when 'production' then exists(select 1 from app_private.production_sites where id=q.source_id and user_id=u and started_at=q.source_started_at and completes_at<=now() and expires_at>now())
 when 'bait-production' then exists(select 1 from app_private.bait_production_sites where id=q.source_id and user_id=u and started_at=q.source_started_at and completes_at<=now() and expires_at>now())
 when 'expedition' then exists(select 1 from public.fishing_expeditions where id=q.source_id and user_id=u and claimed_at is null and returns_at<=now())
 when 'harbor' then exists(select 1 from public.harbor_voyages where id=q.source_id and user_id=u and claimed_at is null and returns_at<=now())
 else false end
$$;

create or replace function app_private.dispatch_web_push() returns void language plpgsql security definer set search_path='' as $$
declare target text; secret text;
begin
 perform app_private.notify_due_bait_production_sites();
 perform app_private.enqueue_expiring_production_push();
 if not exists(select 1 from pg_catalog.pg_extension where extname='pg_net') or to_regclass('vault.decrypted_secrets') is null then return;end if;
 execute 'select decrypted_secret from vault.decrypted_secrets where name=$1 limit 1' into target using 'web_push_worker_url';
 execute 'select decrypted_secret from vault.decrypted_secrets where name=$1 limit 1' into secret using 'web_push_cron_secret';
 if target is null or secret is null then return;end if;
 execute 'select net.http_post(url:=$1,headers:=$2,body:=''{}''::jsonb,timeout_milliseconds:=5000)'
 using target,jsonb_build_object('Content-Type','application/json','x-push-worker-key',secret);
end $$;

notify pgrst,'reload schema';
commit;
