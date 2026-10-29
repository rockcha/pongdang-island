-- Format only notifications being delivered. Existing inbox/accounting rows
-- and device opt-in settings are preserved; no historical notices are replayed.
create function app_private.push_notification_payload(q app_private.push_deliveries,u uuid)
returns jsonb language plpgsql stable set search_path='' as $$
declare title text:=q.payload->>'title';body text:=q.payload->>'body';quantity integer;name text;expiry timestamptz;
begin
 case q.category
 when 'production' then
  select f.name,s.run_output,s.expires_at into name,quantity,expiry from app_private.production_sites s join public.production_facilities f on f.id=s.facility_id where s.id=q.source_id and s.user_id=u and s.started_at=q.source_started_at;
  title:='🔥 따끈한 연료가 준비됐어요';body:=coalesce(name,'생산소')||' · 연료 '||coalesce(quantity,0)||'개를 챙겨가세요.';
 when 'bait-production' then
  select coalesce(b.name,'미끼'),s.run_output,s.expires_at into name,quantity,expiry from app_private.bait_production_sites s left join public.fishing_baits b on b.id=s.run_bait_id where s.id=q.source_id and s.user_id=u and s.started_at=q.source_started_at;
  title:='🪱 미끼 도시락 완성!';body:=coalesce(name,'미끼')||' '||coalesce(quantity,0)||'개가 준비됐어요. 받고 낚시하러 가요.';
 when 'expedition' then
  select vessel_snapshot->>'name' into name from public.fishing_expeditions where id=q.source_id and user_id=u;
  title:='🐟 통발에 손님이 왔어요!';body:=coalesce(name,'통발')||'의 수확이 준비됐어요. 어떤 친구가 왔는지 확인해 보세요.';
 when 'harbor' then
  select vessel_snapshot->>'name' into name from public.harbor_voyages where id=q.source_id and user_id=u;
  title:='⛵ 배가 돌아왔어요!';body:=coalesce(name,'어선')||'이 돌아왔어요. 선원들이 가져온 선물을 확인해요.';
 when 'production-expiring' then
  select expires_at,run_output into expiry,quantity from app_private.production_sites where id=q.source_id and user_id=u and started_at=q.source_started_at;
  title:='⏳ 연료가 기다리고 있어요';body:='연료 '||coalesce(quantity,0)||'개 · 보관 종료까지 약 '||greatest(1,ceil(extract(epoch from expiry-now())/60)::integer)||'분 남았어요. 지금 챙겨주세요.';
 when 'bait-production-expiring' then
  select expires_at,run_output into expiry,quantity from app_private.bait_production_sites where id=q.source_id and user_id=u and started_at=q.source_started_at;
  title:='⏳ 미끼가 기다리고 있어요';body:='미끼 '||coalesce(quantity,0)||'개 · 보관 종료까지 약 '||greatest(1,ceil(extract(epoch from expiry-now())/60)::integer)||'분 남았어요. 지금 챙겨주세요.';
 when 'test' then
  title:='💌 퐁이가 소식을 가져왔어요';body:='테스트 알림이 도착했어요! 생산·수확·귀항 소식도 이렇게 알려드릴게요.';
 else null;
 end case;
 return q.payload||jsonb_build_object('category',q.category,'title',title,'body',body,'quantity',quantity,'expiresAt',coalesce(expiry,q.expires_at));
end$$;
revoke all on function app_private.push_notification_payload(app_private.push_deliveries,uuid) from public,anon,authenticated;

-- Return presentation data for the requesting account, never endpoints or keys.
-- Claiming on another device is reconciled when this app resumes as well.
create function app_private.web_push_active_notifications() returns jsonb
language plpgsql stable security definer set search_path='' as $$
declare u uuid:=auth.uid();result jsonb;
begin
 if u is null then raise exception 'AUTH_REQUIRED';end if;
 select coalesce(jsonb_agg(payload),'[]'::jsonb) into result from (
  select distinct on(q.payload->>'tag') app_private.push_notification_payload(q,u) payload
  from app_private.push_deliveries q join app_private.push_subscriptions s on s.id=q.subscription_id
  where s.user_id=u and q.category<>'test' and q.status in('pending','sending','sent')
   and q.expires_at>now() and app_private.push_delivery_current(q,u)
  order by q.payload->>'tag',q.id desc limit 500
 ) active;
 return result;
end$$;
revoke all on function app_private.web_push_active_notifications() from public,anon,authenticated;
grant execute on function app_private.web_push_active_notifications() to authenticated;
create function public.web_push_active_notifications() returns jsonb language sql set search_path='' as $$select app_private.web_push_active_notifications()$$;
revoke all on function public.web_push_active_notifications() from public,anon,authenticated;
grant execute on function public.web_push_active_notifications() to authenticated;

CREATE OR REPLACE FUNCTION app_private.web_push_device(p_action text, p_subscription jsonb, p_categories text[])
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''
AS $function$
declare u uuid:=auth.uid();e text:=p_subscription->>'endpoint';s app_private.push_subscriptions;n integer;
begin
 if u is null then raise exception 'AUTH_REQUIRED';end if;
 if p_action is null or p_action not in('state','save','delete','test') or e is null or length(e)>2048 then raise exception 'INVALID_PUSH_DEVICE';end if;
 select * into s from app_private.push_subscriptions where endpoint=e and user_id=u for update;
 if p_action='state' then return jsonb_build_object('registered',s.id is not null,'categories',coalesce(s.categories,array[]::text[]));end if;
 if p_action='delete' then delete from app_private.push_subscriptions where id=s.id;return jsonb_build_object('registered',false);end if;
 if p_action='test' then
  if coalesce(p_subscription->>'delaySeconds','0') not in('0','30') then raise exception 'INVALID_PUSH_DEVICE';end if;
  if s.id is null then raise exception 'PUSH_NOT_REGISTERED';end if;
  if s.last_test_at>clock_timestamp()-interval '1 minute' then raise exception 'PUSH_TEST_RATE_LIMIT';end if;
  update app_private.push_subscriptions set last_test_at=clock_timestamp() where id=s.id;
  insert into app_private.push_deliveries(subscription_id,category,payload,expires_at,available_at)
  values(s.id,'test',jsonb_build_object('userId',u,'title','퐁당! 알림이 도착했어요','body','이 기기에서 생산 완료·통발·귀항 소식을 받을 수 있어요.','url','/settings','tag','push-test:'||gen_random_uuid()),clock_timestamp()+interval '5 minutes',clock_timestamp()+case when p_subscription->>'delaySeconds'='30' then interval '30 seconds' else interval '0 seconds' end);
  return jsonb_build_object('queued',true);
 end if;
 if e !~ '^https://(fcm\.googleapis\.com|([a-z0-9-]+\.)*push\.services\.mozilla\.com|([a-z0-9-]+\.)*push\.apple\.com|([a-z0-9-]+\.)*notify\.windows\.com)/[^[:space:]#]+$'
 or coalesce(p_subscription#>>'{keys,p256dh}','') !~ '^[A-Za-z0-9_-]{87}=?$'
 or coalesce(p_subscription#>>'{keys,auth}','') !~ '^[A-Za-z0-9_-]{22}={0,2}$'
 or p_categories is null or not(p_categories<@array['production','bait-production','expedition','harbor','production-expiring','bait-production-expiring','voyage-bets']::text[])
 or cardinality(p_categories)>7 then raise exception 'INVALID_PUSH_DEVICE';end if;
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
end $function$
;
CREATE OR REPLACE FUNCTION app_private.claim_web_push(p_limit integer DEFAULT 20)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''
AS $function$
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
 ) select coalesce(jsonb_agg(jsonb_build_object('id',q.id,'leaseToken',q.lease_token,'payload',app_private.push_notification_payload(q,s.user_id),'subscription',jsonb_build_object('endpoint',s.endpoint,'keys',jsonb_build_object('p256dh',s.p256dh,'auth',s.auth)))),'[]'::jsonb)
 into result from claimed q join app_private.push_subscriptions s on s.id=q.subscription_id;
 -- Finished payloads are short-lived; never retain a growing delivery history.
 delete from app_private.push_deliveries where finished_at<clock_timestamp()-interval '7 days';
 return result;
end $function$
;
