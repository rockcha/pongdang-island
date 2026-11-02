-- Generated from supabase/catalog/catalog.json. Review before migration deployment.
begin;
set constraints all deferred;
insert into public.title_catalog ("id","name","tier","category","description","metric","target","extra_metric","extra_target","sort_order") values
('activity-bait-1','손끝에서 빚은 미끼',1,'growth','미끼 생산 수령 누적 10개','activity_bait',10,null,null,3030),
('activity-bait-2','물고기가 기다리는 공방',2,'growth','미끼 생산 수령 누적 100개','activity_bait',100,null,null,3031),
('activity-bait-3','미끼통의 넉넉한 하루',2,'growth','미끼 생산 수령 누적 1,000개','activity_bait',1000,null,null,3032),
('activity-bait-4','바다의 식탁을 차린',3,'growth','미끼 생산 수령 누적 5,000개','activity_bait',5000,null,null,3033),
('activity-bait-5','수만 번의 입질을 준비한',3,'growth','미끼 생산 수령 누적 20,000개','activity_bait',20000,null,null,3034),
('activity-bait-6','끝없는 바다의 양식',4,'growth','미끼 생산 수령 누적 100,000개 및 해당 활동을 완료한 서로 다른 한국 날짜 180일','activity_bait',100000,'activity_bait_days',180,3035),
('activity-exploration-1','하강의 첫걸음',1,'arcade','탐험 50층 완주 누적 1회','activity_exploration',1,null,null,3000),
('activity-exploration-2','왕릉의 길을 익힌',2,'arcade','탐험 50층 완주 누적 3회','activity_exploration',3,null,null,3001),
('activity-exploration-3','황금왕의 낯익은 손님',2,'arcade','탐험 50층 완주 누적 10회','activity_exploration',10,null,null,3002),
('activity-exploration-4','봉인 아래의 길잡이',3,'arcade','탐험 50층 완주 누적 30회','activity_exploration',30,null,null,3003),
('activity-exploration-5','왕릉에 남긴 백 개의 발자국',3,'arcade','탐험 50층 완주 누적 100회','activity_exploration',100,null,null,3004),
('activity-exploration-6','왕릉이 이름을 새긴 자',4,'arcade','탐험 50층 완주 누적 200회 및 해당 활동을 완료한 서로 다른 한국 날짜 120일','activity_exploration',200,'activity_exploration_days',120,3005),
('activity-flea-1','첫 손님을 맞은 가게',1,'social','벼룩시장 판매 대금 수령 누적 1,000골드','activity_flea',1000,null,null,3040),
('activity-flea-2','흥정에 불이 켜진 골목',2,'social','벼룩시장 판매 대금 수령 누적 10,000골드','activity_flea',10000,null,null,3041),
('activity-flea-3','동네에서 소문난 상점',2,'social','벼룩시장 판매 대금 수령 누적 50,000골드','activity_flea',50000,null,null,3042),
('activity-flea-4','물길 따라 열린 장터',3,'social','벼룩시장 판매 대금 수령 누적 250,000골드','activity_flea',250000,null,null,3043),
('activity-flea-5','백만 골드의 거래 장부',3,'social','벼룩시장 판매 대금 수령 누적 1,000,000골드','activity_flea',1000000,null,null,3044),
('activity-flea-6','수평선을 잇는 대교역상',4,'social','벼룩시장 판매 대금 수령 누적 5,000,000골드 및 해당 활동을 완료한 서로 다른 한국 날짜 120일','activity_flea',5000000,'activity_flea_days',120,3045),
('activity-fuel-1','작은 화로의 첫 온기',1,'growth','연료 생산 수령 누적 10개','activity_fuel',10,null,null,3020),
('activity-fuel-2','꺼지지 않는 작업등',2,'growth','연료 생산 수령 누적 100개','activity_fuel',100,null,null,3021),
('activity-fuel-3','선착장의 불씨지기',2,'growth','연료 생산 수령 누적 500개','activity_fuel',500,null,null,3022),
('activity-fuel-4','심해 기관실의 숨결',3,'growth','연료 생산 수령 누적 2,500개','activity_fuel',2500,null,null,3023),
('activity-fuel-5','수평선을 밝히는 화로',3,'growth','연료 생산 수령 누적 10,000개','activity_fuel',10000,null,null,3024),
('activity-fuel-6','바다의 영구기관',4,'growth','연료 생산 수령 누적 50,000개 및 해당 활동을 완료한 서로 다른 한국 날짜 180일','activity_fuel',50000,'activity_fuel_days',180,3025),
('activity-savings-1','첫 만기의 기쁨',1,'growth','조개 저축 만기 수령 누적 1회','activity_savings',1,null,null,3010),
('activity-savings-2','약속을 채운 조개',2,'growth','조개 저축 만기 수령 누적 3회','activity_savings',3,null,null,3011),
('activity-savings-3','차곡차곡 여문 약속',2,'growth','조개 저축 만기 수령 누적 7회','activity_savings',7,null,null,3012),
('activity-savings-4','만기를 아는 손',3,'growth','조개 저축 만기 수령 누적 20회','activity_savings',20,null,null,3013),
('activity-savings-5','조개 금고의 설계자',3,'growth','조개 저축 만기 수령 누적 35회','activity_savings',35,null,null,3014),
('activity-savings-6','세월을 저축한 자',4,'growth','조개 저축 만기 수령 누적 60회 및 해당 활동을 완료한 서로 다른 한국 날짜 60일','activity_savings',60,'activity_savings_days',60,3015)
on conflict(id) do update set "name"=excluded."name","tier"=excluded."tier","category"=excluded."category","description"=excluded."description","metric"=excluded."metric","target"=excluded."target","extra_metric"=excluded."extra_metric","extra_target"=excluded."extra_target","sort_order"=excluded."sort_order";
-- New families read five per-player counters, never the source histories at runtime.
create table app_private.title_activity_progress (
 user_id uuid not null references auth.users(id) on delete cascade,
 metric text not null check(metric in('activity_exploration','activity_savings','activity_fuel','activity_bait','activity_flea')),
 value bigint not null default 0 check(value>=0),active_days integer not null default 0 check(active_days>=0),
 primary key(user_id,metric)
);
create table app_private.title_activity_days (
 user_id uuid not null references auth.users(id) on delete cascade,metric text not null,
 activity_day date not null,primary key(user_id,metric,activity_day),
 foreign key(user_id,metric) references app_private.title_activity_progress(user_id,metric) on delete cascade
);
alter table app_private.title_activity_progress enable row level security;
alter table app_private.title_activity_days enable row level security;
revoke all on app_private.title_activity_progress,app_private.title_activity_days from public,anon,authenticated;
create index title_catalog_metric_target on public.title_catalog(metric,target);

create function app_private.record_title_activity(p_user uuid,p_metric text,p_amount bigint,p_at timestamptz)
returns void language plpgsql security definer set search_path='' as $$
declare previous app_private.title_activity_progress;current_value bigint;current_days integer;new_day integer;
begin
 if p_user is null or p_amount is null or p_amount<=0 or p_at is null then return;end if;
 insert into app_private.title_activity_progress(user_id,metric) values(p_user,p_metric) on conflict do nothing;
 select * into strict previous from app_private.title_activity_progress where user_id=p_user and metric=p_metric for update;
 insert into app_private.title_activity_days(user_id,metric,activity_day) values(p_user,p_metric,(p_at at time zone 'Asia/Seoul')::date) on conflict do nothing;
 get diagnostics new_day=row_count;
 update app_private.title_activity_progress set value=value+p_amount,active_days=active_days+new_day
 where user_id=p_user and metric=p_metric returning value,active_days into current_value,current_days;
 -- Queue only a newly crossed milestone; ordinary activity does not rescan titles.
 if exists(select 1 from public.title_catalog c where c.metric=p_metric and c.target<=current_value
  and coalesce(c.extra_target,0)<=current_days
  and (c.target>previous.value or coalesce(c.extra_target,0)>previous.active_days)) then
  insert into app_private.title_dirty(user_id) values(p_user) on conflict do nothing;
 end if;
end $$;

create function app_private.title_flea_sale(p_actor uuid,p_request jsonb,p_result jsonb)
returns table(seller uuid,amount bigint) language sql immutable set search_path='' as $$
 select case p_result->>'side' when 'sell' then (p_result->>'owner_id')::uuid else p_actor end,
 sum(i.quantity::bigint*l.unit_price)::bigint
 from jsonb_to_recordset(coalesce(p_request->'items','[]'::jsonb)) i(id text,quantity integer)
 join jsonb_to_recordset(coalesce(p_result->'items','[]'::jsonb)) l(id text,unit_price bigint) using(id)
 where p_request->>'action'='trade' and p_result->>'side' in('sell','buy')
 and p_result->>'owner_id'<>p_actor::text and i.quantity>0 and l.unit_price>0
 having sum(i.quantity::bigint*l.unit_price)>0
$$;

create function app_private.title_completed_activity()
returns trigger language plpgsql security definer set search_path='' as $$
declare sale record;
begin
 case tg_table_name
 when 'exploration_runs' then perform app_private.record_title_activity(new.user_id,'activity_exploration',1,new.finished_at);
 when 'shell_savings' then perform app_private.record_title_activity(new.user_id,'activity_savings',1,new.closed_at);
 when 'production_operations' then perform app_private.record_title_activity(new.user_id,'activity_fuel',(new.receipt->>'fuel')::bigint,new.created_at);
 when 'bait_production_operations' then perform app_private.record_title_activity(new.user_id,'activity_bait',(new.receipt->>'count')::bigint,clock_timestamp());
 when 'production_auto_claims' then perform app_private.record_title_activity(new.user_id,'activity_'||new.kind,new.amount,new.claimed_at);
 when 'flea_receipts' then
  for sale in select * from app_private.title_flea_sale(new.user_id,new.request,new.result) loop
   perform app_private.record_title_activity(sale.seller,'activity_flea',sale.amount,new.created_at);
  end loop;
 end case;
 return new;
end $$;
revoke all on function app_private.record_title_activity(uuid,text,bigint,timestamptz),app_private.title_flea_sale(uuid,jsonb,jsonb),app_private.title_completed_activity() from public,anon,authenticated;
create trigger activity_title_exploration after update of finished_at on app_private.exploration_runs for each row when(old.finished_at is null and new.finished_at is not null and new.reward_gold>0) execute function app_private.title_completed_activity();
create trigger activity_title_savings after update of closed_at on public.shell_savings for each row when(old.closed_at is null and new.closed_at is not null and new.close_kind='matured') execute function app_private.title_completed_activity();
-- Bulk fuel claims already write one child claim receipt per site. Ignore their summary.
create trigger activity_title_fuel after insert on app_private.production_operations for each row when(new.receipt->>'action'='claim') execute function app_private.title_completed_activity();
create trigger activity_title_bait after insert on app_private.bait_production_operations for each row when(new.receipt->>'action'='claim') execute function app_private.title_completed_activity();
create trigger activity_title_auto after insert on app_private.production_auto_claims for each row when(new.amount>0) execute function app_private.title_completed_activity();
create trigger activity_title_flea after insert on app_private.flea_receipts for each row when(new.request->>'action'='trade') execute function app_private.title_completed_activity();

-- One-time historical import. Bait manual receipts have no timestamps: retain
-- quantities, but do not invent historical activity days from today's date.
create temporary table activity_title_import on commit drop as
 select user_id,'activity_exploration'::text metric,1::bigint amount,finished_at occurred_at from app_private.exploration_runs where finished_at is not null and reward_gold>0
 union all select user_id,'activity_savings',1,closed_at from public.shell_savings where closed_at is not null and close_kind='matured'
 union all select user_id,'activity_fuel',(receipt->>'fuel')::bigint,created_at from app_private.production_operations where receipt->>'action'='claim' and (receipt->>'fuel')::bigint>0
 union all select user_id,'activity_bait',(receipt->>'count')::bigint,null::timestamptz from app_private.bait_production_operations where receipt->>'action'='claim' and (receipt->>'count')::bigint>0
 union all select user_id,'activity_'||kind,amount,claimed_at from app_private.production_auto_claims where amount>0
 union all select s.seller,'activity_flea',s.amount,r.created_at from app_private.flea_receipts r cross join lateral app_private.title_flea_sale(r.user_id,r.request,r.result)s
 join auth.users u on u.id=s.seller where r.request->>'action'='trade';
insert into app_private.title_activity_progress(user_id,metric,value)
 select user_id,metric,sum(amount) from activity_title_import group by user_id,metric;
insert into app_private.title_activity_days(user_id,metric,activity_day)
 select distinct user_id,metric,(occurred_at at time zone 'Asia/Seoul')::date from activity_title_import where occurred_at is not null;
update app_private.title_activity_progress p set active_days=d.n
 from(select user_id,metric,count(*)::integer n from app_private.title_activity_days group by user_id,metric)d
 where p.user_id=d.user_id and p.metric=d.metric;

create function app_private.activity_title_metrics(p_user uuid)
returns jsonb language sql stable security definer set search_path='' as $$
 with p as materialized(select metric,value,active_days from app_private.title_activity_progress where user_id=p_user)
 select coalesce(jsonb_object_agg(key,value),'{}'::jsonb) from(
  select metric as key,value from p union all select metric||'_days',active_days::bigint from p
 )m
$$;
revoke all on function app_private.activity_title_metrics(uuid) from public,anon,authenticated;

create or replace function app_private.sync_player_titles(p_user uuid)
returns jsonb language plpgsql security definer set search_path='' as $$
declare metrics jsonb;t record;
begin
 perform pg_advisory_xact_lock(hashtextextended('titles:'||p_user::text,0));
 metrics:=app_private.title_metrics(p_user)||app_private.rare_title_metrics(p_user)||app_private.challenge_title_metrics(p_user)||app_private.everyday_title_metrics(p_user)||app_private.relic_title_metrics(p_user)||app_private.activity_title_metrics(p_user);
 for t in select * from public.title_catalog c where coalesce((metrics->>c.metric)::bigint,0)>=c.target
 and (c.extra_metric is null or coalesce((metrics->>c.extra_metric)::bigint,0)>=c.extra_target)
 and not exists(select 1 from public.player_titles o where o.user_id=p_user and o.title_id=c.id) order by sort_order
 loop perform app_private.award_title(p_user,t.id);end loop;
 return metrics;
end $$;

create or replace function app_private.title_state()
returns jsonb language plpgsql security definer set search_path='' as $$
declare u uuid:=auth.uid();
begin
 if u is null then raise exception 'AUTH_REQUIRED';end if;
 perform app_private.sync_titles();
 return jsonb_build_object('equipped',(select c.id from public.player_profiles p join public.title_catalog c on c.name=p.equipped_title where p.id=u),
 'titles',(select jsonb_agg(jsonb_build_object('id',c.id,'name',c.name,'tier',c.tier,'category',c.category,'earnedAt',o.earned_at,
 'description',case when o.earned_at is not null then c.description end,
 'target',case when o.earned_at is not null then c.target end,
 'progress',case when o.earned_at is not null then c.target end,
 'extra_target',case when o.earned_at is not null then c.extra_target end,
 'extraProgress',case when o.earned_at is not null then c.extra_target end) order by c.sort_order)
 from public.title_catalog c left join public.player_titles o on o.user_id=u and o.title_id=c.id));
end $$;

create or replace function app_private.equip_title(p_title text)
returns jsonb language plpgsql security definer set search_path='' as $$
declare u uuid:=auth.uid();
begin
 if u is null then raise exception 'AUTH_REQUIRED';end if;
 perform app_private.sync_titles();
 if p_title is not null and not exists(select 1 from public.player_titles where user_id=u and title_id=p_title) then raise exception 'TITLE_NOT_EARNED';end if;
 update public.player_profiles set equipped_title=(select name from public.title_catalog where id=p_title) where id=u;
 if not found then raise exception 'PROFILE_NOT_FOUND';end if;
 return app_private.title_state();
end $$;
notify pgrst, 'reload schema';
commit;
