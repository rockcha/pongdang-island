begin;

create table app_private.voyage_bet_models (
 id text primary key check(length(id)=64),
 valid_from timestamptz not null,
 valid_until timestamptz,
 data jsonb not null check(jsonb_typeof(data)='object'),
 check(valid_until is null or valid_until>valid_from)
);
create index voyage_bet_models_period on app_private.voyage_bet_models(valid_from desc);
create table app_private.voyage_bet_rounds (
 id uuid primary key default gen_random_uuid(),
 voyage_day date not null,
 slot smallint not null check(slot in(9,19)),
 opens_at timestamptz not null,
 departs_at timestamptz not null,
 results_at timestamptz not null,
 settled_at timestamptz,
 unique(voyage_day,slot),
 check(departs_at=opens_at+interval '30 minutes'),
 check(results_at=departs_at+interval '3 hours')
);
create index voyage_bet_rounds_due on app_private.voyage_bet_rounds(results_at) where settled_at is null;
create table app_private.voyage_bet_plans (
 id uuid primary key default gen_random_uuid(),
 round_id uuid not null references app_private.voyage_bet_rounds(id),
 company_id text not null,
 model_id text not null references app_private.voyage_bet_models(id),
 bait_id text not null,
 count_per_region integer not null check(count_per_region between 1 and 200),
 regions text[] not null check(cardinality(regions)=3),
 target_sales integer not null check(target_sales>0),
 total_cost integer not null check(total_cost>0),
 actual_sales integer not null check(actual_sales>=0),
 result jsonb not null check(jsonb_typeof(result)='array'),
 unique(round_id,company_id),
 check(regions[1]<>regions[2] and regions[1]<>regions[3] and regions[2]<>regions[3])
);
create table app_private.voyage_bets (
 user_id uuid not null references auth.users(id) on delete cascade,
 plan_id uuid not null references app_private.voyage_bet_plans(id),
 side text not null check(side in('above','below')),
 stake integer not null check(stake between 0 and 500 and stake%100=0),
 payout integer check(payout between 0 and 950),
 paid_at timestamptz,
 updated_at timestamptz not null default clock_timestamp(),
 primary key(user_id,plan_id)
);
create index voyage_bets_plan on app_private.voyage_bets(plan_id,user_id);
create index voyage_bets_pending_payout on app_private.voyage_bets(user_id,plan_id) where payout>0 and paid_at is null;
create table app_private.voyage_bet_operations (
 user_id uuid not null references auth.users(id) on delete cascade,
 operation_id uuid not null,
 request jsonb not null,
 delta integer not null,
 created_at timestamptz not null default clock_timestamp(),
 primary key(user_id,operation_id)
);
alter table app_private.voyage_bet_models enable row level security;
alter table app_private.voyage_bet_rounds enable row level security;
alter table app_private.voyage_bet_plans enable row level security;
alter table app_private.voyage_bets enable row level security;
alter table app_private.voyage_bet_operations enable row level security;
revoke all on app_private.voyage_bet_models,app_private.voyage_bet_rounds,app_private.voyage_bet_plans,app_private.voyage_bets,app_private.voyage_bet_operations from public,anon,authenticated;

-- Draw from the immutable catalog snapshot. No player modifiers or discoveries.
create function app_private.voyage_bet_draw(m jsonb, bid text, region text)
returns text language plpgsql set search_path='' as $$
declare roll integer:=floor(random()*10000); b jsonb:=m->'baits'->bid; grade text; g jsonb; ids jsonb; sid text;
 shared_n integer;home_n integer;away_n integer;weight integer;
begin
 grade:=case when roll<(b->>'mythic')::int then 'mythic'
  when roll<(b->>'mythic')::int+(b->>'epic')::int then 'epic'
  when roll<(b->>'mythic')::int+(b->>'epic')::int+(b->>'rare')::int then 'rare' else 'common' end;
 g:=m->'pools'->bid->grade;
 shared_n:=jsonb_array_length(g->'shared');home_n:=jsonb_array_length(g->'home'->region);
 away_n:=jsonb_array_length(g->'native')-home_n;
 weight:=case when shared_n>0 then 80 else 0 end+case when home_n>0 then 25 else 0 end+case when away_n>0 then 5 else 0 end;
 if weight=0 then raise exception 'VOYAGE_MODEL_EMPTY';end if;
 roll:=floor(random()*weight);
 if shared_n>0 and roll<80 then ids:=g->'shared';
 elsif home_n>0 and roll<(case when shared_n>0 then 80 else 0 end)+25 then ids:=g->'home'->region;
 else
  ids:=g->'native';
  loop
   sid:=ids->>floor(random()*jsonb_array_length(ids))::int;
   exit when m->'species'->sid->>'region' is distinct from region;
  end loop;
  return sid;
 end if;
 return ids->>floor(random()*jsonb_array_length(ids))::int;
end $$;

create function app_private.voyage_bet_make_plans(p_round uuid,p_at timestamptz)
returns void language plpgsql set search_path='' as $$
declare model app_private.voyage_bet_models;company jsonb;opt jsonb;bid text;n integer;radius integer;
 places text[];place text;sid text;item jsonb;counts jsonb;items jsonb;results jsonb;total integer;sales integer;target integer;j integer;
begin
 select * into model from app_private.voyage_bet_models where valid_from<=p_at and (valid_until is null or valid_until>p_at) order by valid_from desc limit 1;
 if model.id is null then raise exception 'VOYAGE_MODEL_UNAVAILABLE';end if;
 for company in select value from jsonb_array_elements(model.data->'companies') loop
  select value into opt from jsonb_array_elements(model.data->'options') where value->>'companyId'=company->>'id' order by random() limit 1;
  bid:=opt->>'baitId';radius:=(jsonb_array_length(opt->'counts')-1)/2;
  n:=(opt->>'base')::int-radius+floor(random()*(radius+1))::int+floor(random()*(radius+1))::int;
  places:=array(select key from jsonb_each_text(model.data->'regions') order by random() limit 3);
  target:=(model.data->'targets'->>(bid||':'||n||':'||places[1]))::int;
  if target is null then raise exception 'VOYAGE_TARGET_UNAVAILABLE';end if;
  -- This target is conditional only on public information, not places[2:3].
  results:='[]'::jsonb;total:=0;
  foreach place in array places loop
   counts:='{}'::jsonb;sales:=0;
   for j in 1..n loop
    sid:=app_private.voyage_bet_draw(model.data,bid,place);
    sales:=sales+(model.data->'species'->sid->>'price')::int;
    counts:=jsonb_set(counts,array[sid],to_jsonb(coalesce((counts->>sid)::int,0)+1));
   end loop;
   select coalesce(jsonb_agg((model.data->'species'->e.key)||jsonb_build_object('quantity',e.value::int) order by (model.data->'species'->e.key->>'price')::int desc,e.key),'[]'::jsonb) into items from jsonb_each_text(counts)e;
   results:=results||jsonb_build_array(jsonb_build_object('regionId',place,'regionName',model.data->'regions'->>place,'sales',sales,'catches',items));
   total:=total+sales;
  end loop;
  insert into app_private.voyage_bet_plans(round_id,company_id,model_id,bait_id,count_per_region,regions,target_sales,total_cost,actual_sales,result)
  values(p_round,company->>'id',model.id,bid,n,places,target,3*n*(model.data->'baits'->bid->>'price')::int+(model.data->>'fuelCost')::int,total,results);
 end loop;
end $$;

-- Public payload is constructed field by field. Never expose model documents,
-- hidden region IDs, catches, actual sales, or another player's bets early.
create function app_private.voyage_bets_payload(u uuid,p_at timestamptz)
returns jsonb language plpgsql stable set search_path='' as $$
declare company_list jsonb;round_list jsonb;
begin
 select data->'companies' into company_list from app_private.voyage_bet_models order by valid_from limit 1;
 select coalesce(jsonb_agg(jsonb_build_object(
  'id',r.id,'opensAt',r.opens_at,'departsAt',r.departs_at,'resultsAt',r.results_at,
  'phase',case when p_at<r.opens_at then 'scheduled' when p_at<r.departs_at then 'open' when p_at<r.results_at then 'sailing' when r.settled_at is null then 'settling' else 'settled' end,
  'myStake',(select coalesce(sum(b.stake),0) from app_private.voyage_bets b join app_private.voyage_bet_plans p on p.id=b.plan_id where p.round_id=r.id and b.user_id=u),
  'plans',(select coalesce(jsonb_agg(jsonb_build_object(
   'id',p.id,'companyId',p.company_id,
   'bait',case when p_at>=r.opens_at then m.data->'baits'->p.bait_id else null end,
   'countPerRegion',case when p_at>=r.opens_at then p.count_per_region else null end,
   'publicRegion',case when p_at>=r.opens_at then jsonb_build_object('id',p.regions[1],'name',m.data->'regions'->>p.regions[1]) else null end,
   'targetSales',case when p_at>=r.opens_at then p.target_sales else null end,
   'totalCost',case when p_at>=r.opens_at then p.total_cost else null end,
   'result',case when p_at>=r.results_at then jsonb_build_object('sales',p.actual_sales,'profit',p.actual_sales-p.total_cost,'outcome',case when p.actual_sales>p.target_sales then 'above' when p.actual_sales<p.target_sales then 'below' else 'tie' end,'regions',p.result) else null end,
   'myBet',(select jsonb_build_object('side',b.side,'stake',b.stake,'payout',b.payout,'paidAt',b.paid_at) from app_private.voyage_bets b where b.user_id=u and b.plan_id=p.id and b.stake>0)
  ) order by p.company_id),'[]'::jsonb) from app_private.voyage_bet_plans p join app_private.voyage_bet_models m on m.id=p.model_id where p.round_id=r.id)
 ) order by r.departs_at),'[]'::jsonb) into round_list
 from(select * from app_private.voyage_bet_rounds where departs_at>=p_at-interval '7 days' order by departs_at desc limit 18)r;
 return jsonb_build_object('serverNow',p_at,'companies',coalesce(company_list,'[]'::jsonb),'rounds',round_list,'roundLimit',500,'payoutMultiplier',1.9,
  'pendingPayout',(select coalesce(sum(b.payout),0) from app_private.voyage_bets b where b.user_id=u and b.payout>0 and b.paid_at is null));
end $$;

create function app_private.voyage_bets_state()
returns jsonb language plpgsql security definer set search_path='' as $$
declare u uuid:=auth.uid();
begin
 if u is null then raise exception 'AUTH_REQUIRED';end if;
 return app_private.voyage_bets_payload(u,clock_timestamp());
end $$;
create function public.voyage_bets_state()
returns jsonb language sql security invoker set search_path='' as $$select app_private.voyage_bets_state()$$;

create function app_private.voyage_bets_place(p_operation_id uuid,p_plan_id uuid,p_side text,p_stake integer)
returns jsonb language plpgsql security definer set search_path='' as $$
declare u uuid:=auth.uid();req jsonb;old_req jsonb;p app_private.voyage_bet_plans;r app_private.voyage_bet_rounds;
 wallet public.player_wallets;old_stake integer;total integer;delta integer;
begin
 if u is null then raise exception 'AUTH_REQUIRED';end if;
 if p_operation_id is null or p_plan_id is null or p_side is null or p_side not in('above','below') or p_stake is null or p_stake<0 or p_stake>500 or p_stake%100<>0 then raise exception 'INVALID_VOYAGE_BET';end if;
 req:=jsonb_build_object('planId',p_plan_id,'side',p_side,'stake',p_stake);
 select request into old_req from app_private.voyage_bet_operations where user_id=u and operation_id=p_operation_id;
 if found then
  if old_req<>req then raise exception 'OPERATION_CONFLICT';end if;
  return app_private.voyage_bets_payload(u,clock_timestamp())||jsonb_build_object('replayed',true);
 end if;
 select * into p from app_private.voyage_bet_plans where id=p_plan_id;
 if p.id is null then raise exception 'VOYAGE_NOT_FOUND';end if;
 select * into r from app_private.voyage_bet_rounds where id=p.round_id for update;
 if clock_timestamp()<r.opens_at then raise exception 'VOYAGE_NOT_OPEN';end if;
 if clock_timestamp()>=r.departs_at or r.settled_at is not null then raise exception 'VOYAGE_CLOSED';end if;
 insert into public.player_wallets(user_id) values(u) on conflict do nothing;
 select * into wallet from public.player_wallets where user_id=u for update;
 -- Recheck after the shared wallet lock, including same-operation cross-round races.
 select request into old_req from app_private.voyage_bet_operations where user_id=u and operation_id=p_operation_id;
 if found then
  if old_req<>req then raise exception 'OPERATION_CONFLICT';end if;
  return app_private.voyage_bets_payload(u,clock_timestamp())||jsonb_build_object('replayed',true);
 end if;
 if clock_timestamp()>=r.departs_at then raise exception 'VOYAGE_CLOSED';end if;
 select coalesce(stake,0) into old_stake from app_private.voyage_bets where user_id=u and plan_id=p.id;
 old_stake:=coalesce(old_stake,0);
 select coalesce(sum(b.stake),0) into total from app_private.voyage_bets b join app_private.voyage_bet_plans x on x.id=b.plan_id where b.user_id=u and x.round_id=r.id;
 if total-old_stake+p_stake>500 then raise exception 'VOYAGE_ROUND_LIMIT';end if;
 delta:=old_stake-p_stake;
 if wallet.gold+delta<0 then raise exception 'INSUFFICIENT_GOLD';end if;
 if wallet.gold::bigint+delta>1000000000 then raise exception 'GOLD_LIMIT';end if;
 update public.player_wallets set gold=gold+delta,updated_at=clock_timestamp() where user_id=u;
 insert into app_private.voyage_bets(user_id,plan_id,side,stake) values(u,p.id,p_side,p_stake)
 on conflict(user_id,plan_id) do update set side=excluded.side,stake=excluded.stake,updated_at=clock_timestamp();
 insert into app_private.voyage_bet_operations(user_id,operation_id,request,delta) values(u,p_operation_id,req,delta);
 return app_private.voyage_bets_payload(u,clock_timestamp())||jsonb_build_object('replayed',false);
end $$;
create function public.voyage_bets_place(p_operation_id uuid,p_plan_id uuid,p_side text,p_stake integer)
returns jsonb language sql security invoker set search_path='' as $$select app_private.voyage_bets_place(p_operation_id,p_plan_id,p_side,p_stake)$$;

-- Dedicated opt-in category; existing device choices are left unchanged.
alter table app_private.push_subscriptions drop constraint push_subscriptions_categories_check;
alter table app_private.push_subscriptions add constraint push_subscriptions_categories_check check(categories<@array['production','bait-production','expedition','harbor','production-expiring','bait-production-expiring','voyage-bets']::text[]);
alter table app_private.push_deliveries drop constraint push_deliveries_category_check;
alter table app_private.push_deliveries add constraint push_deliveries_category_check check(category in('production','bait-production','expedition','harbor','test','production-expiring','bait-production-expiring','voyage-bets'));
create unique index voyage_bet_push_once on app_private.push_deliveries(subscription_id,source_id) where category='voyage-bets';

create function app_private.voyage_bets_maintenance(p_now timestamptz default clock_timestamp())
returns jsonb language plpgsql security definer set search_path='' as $$
declare v_day date;v_slot integer;departure timestamptz;opening timestamptz;rid uuid;r record;b record;balance integer;
 created integer:=0;settled integer:=0;paid integer:=0;queued integer:=0;
begin
 if not pg_try_advisory_xact_lock(84732019) then return jsonb_build_object('busy',true);end if;
 for v_day in select ((p_now at time zone 'Asia/Seoul')::date+i) from generate_series(0,2)i loop
  foreach v_slot in array array[9,19] loop
   departure:=(v_day+make_time(v_slot,0,0)) at time zone 'Asia/Seoul';opening:=departure-interval '30 minutes';
   if departure<=p_now or exists(select 1 from app_private.voyage_bet_rounds where voyage_day=v_day and slot=v_slot) then continue;end if;
   if not exists(select 1 from app_private.voyage_bet_models where valid_from<=opening and(valid_until is null or valid_until>opening)) then continue;end if;
   insert into app_private.voyage_bet_rounds(voyage_day,slot,opens_at,departs_at,results_at) values(v_day,v_slot,opening,departure,departure+interval '3 hours') returning id into rid;
   perform app_private.voyage_bet_make_plans(rid,opening);created:=created+1;
  end loop;
 end loop;
 for r in select * from app_private.voyage_bet_rounds where results_at<=p_now and settled_at is null order by results_at for update skip locked loop
  update app_private.voyage_bets bet set payout=case when p.actual_sales=p.target_sales then bet.stake
   when (bet.side='above' and p.actual_sales>p.target_sales) or (bet.side='below' and p.actual_sales<p.target_sales) then bet.stake*19/10 else 0 end
  from app_private.voyage_bet_plans p where p.id=bet.plan_id and p.round_id=r.id;
  update app_private.voyage_bets bet set paid_at=p_now from app_private.voyage_bet_plans p where p.id=bet.plan_id and p.round_id=r.id and bet.payout=0;
  update app_private.voyage_bet_rounds set settled_at=p_now where id=r.id;settled:=settled+1;
 end loop;
 for b in select * from app_private.voyage_bets where payout>0 and paid_at is null order by user_id,plan_id for update skip locked loop
  insert into public.player_wallets(user_id) values(b.user_id) on conflict do nothing;
  select gold into balance from public.player_wallets where user_id=b.user_id for update;
  if balance::bigint+b.payout>1000000000 then continue;end if;
  update public.player_wallets set gold=gold+b.payout,updated_at=clock_timestamp() where user_id=b.user_id;
  update app_private.voyage_bets set paid_at=p_now where user_id=b.user_id and plan_id=b.plan_id;paid:=paid+1;
 end loop;
 insert into app_private.push_deliveries(subscription_id,category,source_id,source_started_at,payload,expires_at)
 select s.id,'voyage-bets',vr.id,vr.opens_at,jsonb_build_object('userId',s.user_id,'title','만선 승부장 · 출항 30분 전','body','네 회사의 출항 계획이 공개됐어요. 출항 전까지 예측에 참여해 보세요.','url','/voyage-bets','tag','voyage-bets:'||vr.id),vr.departs_at
 from app_private.voyage_bet_rounds vr cross join app_private.push_subscriptions s
 where vr.opens_at<=p_now and vr.departs_at>p_now and 'voyage-bets'=any(s.categories)
 on conflict(subscription_id,source_id) where category='voyage-bets' do nothing;
 get diagnostics queued=row_count;
 return jsonb_build_object('created',created,'settled',settled,'paid',paid,'queued',queued);
end $$;

create or replace function app_private.web_push_device(p_action text,p_subscription jsonb,p_categories text[])
returns jsonb language plpgsql security definer set search_path='' as $$
declare u uuid:=auth.uid();e text:=p_subscription->>'endpoint';s app_private.push_subscriptions;n integer;
begin
 if u is null then raise exception 'AUTH_REQUIRED';end if;
 if p_action is null or p_action not in('state','save','delete','test') or e is null or length(e)>2048 then raise exception 'INVALID_PUSH_DEVICE';end if;
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
end $$;

create or replace function app_private.push_delivery_current(q app_private.push_deliveries,u uuid)
returns boolean language sql stable set search_path='' as $$
 select case q.category
 when 'test' then true
 when 'voyage-bets' then exists(select 1 from app_private.voyage_bet_rounds where id=q.source_id and opens_at=q.source_started_at and opens_at<=now() and departs_at>now())
 when 'production-expiring' then exists(select 1 from app_private.production_sites where id=q.source_id and user_id=u and started_at=q.source_started_at and completes_at<=now() and expires_at>now() and expires_at<=now()+interval '5 minutes')
 when 'bait-production-expiring' then exists(select 1 from app_private.bait_production_sites where id=q.source_id and user_id=u and started_at=q.source_started_at and completes_at<=now() and expires_at>now() and expires_at<=now()+interval '5 minutes')
 when 'production' then exists(select 1 from app_private.production_sites where id=q.source_id and user_id=u and started_at=q.source_started_at and completes_at<=now() and expires_at>now())
 when 'bait-production' then exists(select 1 from app_private.bait_production_sites where id=q.source_id and user_id=u and started_at=q.source_started_at and completes_at<=now() and expires_at>now())
 when 'expedition' then exists(select 1 from public.fishing_expeditions where id=q.source_id and user_id=u and claimed_at is null and returns_at<=now())
 when 'harbor' then exists(select 1 from public.harbor_voyages where id=q.source_id and user_id=u and claimed_at is null and returns_at<=now())
 else false end
$$;

revoke all on function app_private.voyage_bet_draw(jsonb,text,text),app_private.voyage_bet_make_plans(uuid,timestamptz),app_private.voyage_bets_payload(uuid,timestamptz),app_private.voyage_bets_maintenance(timestamptz) from public,anon,authenticated;
revoke all on function public.voyage_bets_state(),public.voyage_bets_place(uuid,uuid,text,integer),app_private.voyage_bets_state(),app_private.voyage_bets_place(uuid,uuid,text,integer) from public,anon;
grant execute on function public.voyage_bets_state(),public.voyage_bets_place(uuid,uuid,text,integer),app_private.voyage_bets_state(),app_private.voyage_bets_place(uuid,uuid,text,integer) to authenticated;
grant execute on function app_private.voyage_bets_maintenance(timestamptz) to service_role;

do $cron$
begin
 if exists(select 1 from pg_extension where extname='pg_cron') then
  perform cron.schedule('voyage-bets-maintenance','* * * * *','select app_private.voyage_bets_maintenance();');
 end if;
end $cron$;
notify pgrst,'reload schema';
commit;
