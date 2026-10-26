begin;

alter table public.notifications add column production_auto_claim boolean not null default false;

alter table public.fishing_relics drop constraint relic_effect_shape;
alter table public.fishing_relics add constraint relic_effect_shape check (
 (effect_kind='none' and effect_value=0)
 or (effect_kind in ('fuel_active_slots','bait_active_slots') and ((rarity='epic' and effect_value=1) or (rarity='mythic' and effect_value=2)))
 or (effect_kind='personal_bait_hours' and ((rarity='rare' and effect_value=2) or (rarity='epic' and effect_value=4) or (rarity='mythic' and effect_value=8)))
 or (effect_kind='fishing_wait_seconds' and ((rarity='rare' and effect_value=0.5) or (rarity='epic' and effect_value=1) or (rarity='mythic' and effect_value=2)))
 or (effect_kind='trap_seconds_per_bait' and ((rarity='rare' and effect_value=30) or (rarity='epic' and effect_value=90) or (rarity='mythic' and effect_value=180)))
 or (effect_kind='boat_discount_gold' and ((rarity='rare' and effect_value=50) or (rarity='epic' and effect_value=150) or (rarity='mythic' and effect_value=400)))
 or (effect_kind='bait_discount_gold' and ((rarity='epic' and effect_value=1) or (rarity='mythic' and effect_value=2)))
 or (effect_kind='harbor_duration_percent' and ((rarity='rare' and effect_value=3) or (rarity='epic' and effect_value=6) or (rarity='mythic' and effect_value=10)))
 or (effect_kind='production_auto_claim' and rarity='epic' and effect_value=1)
);

-- Each original production run can be credited only once, even if a run is
-- restored accidentally. Snapshotted item/amount, not the current facility
-- catalog, is authoritative. No player-facing direct writes are granted.
create table app_private.production_auto_claims (
 user_id uuid not null references auth.users(id) on delete cascade,
 kind text not null check (kind in ('fuel','bait')),
 site_id uuid not null,
 started_at timestamptz not null,
 completed_at timestamptz not null,
 claimed_at timestamptz not null default clock_timestamp(),
 item_id text not null check (btrim(item_id)<>''),
 amount integer not null check (amount between 1 and 1000000000),
 relic_id text not null references public.fishing_relics(id),
 primary key (kind,site_id,started_at),
 check (completed_at>started_at and claimed_at>=completed_at)
);
alter table app_private.production_auto_claims enable row level security;
revoke all on app_private.production_auto_claims from public,anon,authenticated;
create index production_auto_claims_owner_time on app_private.production_auto_claims(user_id,claimed_at desc);
create index relic_loadouts_relic_owner on app_private.player_relic_loadouts(relic_id,user_id);
create index production_sites_auto_claim_due on app_private.production_sites(user_id,completes_at,id) where started_at is not null;
create index bait_sites_auto_claim_due on app_private.bait_production_sites(user_id,completes_at,id) where started_at is not null;

create function app_private.auto_claim_production(p_user uuid)
returns integer language plpgsql security definer set search_path='' as $function$
declare w public.player_wallets; run record; equipped text; items jsonb;
 stamp timestamptz; count_claimed integer:=0; next_count bigint;
 fuel_count bigint:=0; bait_count bigint:=0; summary text;
begin
 -- Cheap negative lookup before locking. Recheck after taking the same wallet
 -- lock used by manual claims, starts, equipment changes, and sales.
 if p_user is null or not exists (
  select 1 from app_private.player_relic_loadouts l join public.fishing_relics r on r.id=l.relic_id
  where l.user_id=p_user and r.enabled and r.effect_kind='production_auto_claim' and r.effect_value=1
 ) then return 0; end if;
 select * into w from public.player_wallets where user_id=p_user for update skip locked;
 if not found then return 0; end if;
 select l.relic_id into equipped from app_private.player_relic_loadouts l join public.fishing_relics r on r.id=l.relic_id
 where l.user_id=p_user and r.enabled and r.effect_kind='production_auto_claim' and r.effect_value=1;
 if equipped is null then return 0; end if;
 stamp:=clock_timestamp(); items:=w.inventory;
 -- The wallet lock serializes both kinds with manual operations. The worker
 -- never takes site locks before this lock, and never waits for busy owners.
 for run in
  select 'fuel'::text kind,s.id,s.started_at,s.completes_at,s.expires_at,s.run_output,'fuel'::text item_id
  from app_private.production_sites s where s.user_id=p_user and s.started_at is not null
   and s.completes_at<=stamp and s.expires_at>stamp
  union all
  select 'bait',s.id,s.started_at,s.completes_at,s.expires_at,s.run_output,s.run_bait_id
  from app_private.bait_production_sites s where s.user_id=p_user and s.started_at is not null
   and s.completes_at<=stamp and s.expires_at>stamp
  order by completes_at,kind,id limit 500
 loop
  next_count:=coalesce((items->>run.item_id)::bigint,0)+run.run_output;
  if next_count>1000000000 then continue; end if;
  if run.kind='fuel' then
   perform 1 from app_private.production_sites where id=run.id and user_id=p_user
    and started_at=run.started_at and expires_at>clock_timestamp() for update;
  else
   perform 1 from app_private.bait_production_sites where id=run.id and user_id=p_user
    and started_at=run.started_at and expires_at>clock_timestamp() for update;
  end if;
  if not found then continue; end if;
  insert into app_private.production_auto_claims(user_id,kind,site_id,started_at,completed_at,claimed_at,item_id,amount,relic_id)
  values(p_user,run.kind,run.id,run.started_at,run.completes_at,stamp,run.item_id,run.run_output,equipped)
  on conflict(kind,site_id,started_at) do nothing;
  if not found then continue; end if;
  items:=jsonb_set(items,array[run.item_id],to_jsonb(next_count::integer));
  if run.kind='fuel' then
   update app_private.production_sites set started_at=null,completes_at=null,expires_at=null,run_output=null where id=run.id and user_id=p_user;
   fuel_count:=fuel_count+run.run_output;
   update public.notifications set read_at=coalesce(read_at,stamp) where recipient_id=p_user
    and production_site_id=run.id and production_started_at=run.started_at;
  else
   update app_private.bait_production_sites set started_at=null,completes_at=null,expires_at=null,run_output=null,run_bait_id=null,notified_started_at=null
    where id=run.id and user_id=p_user;
   bait_count:=bait_count+run.run_output;
   update public.notifications set read_at=coalesce(read_at,stamp) where recipient_id=p_user
    and bait_production_site_id=run.id and bait_production_started_at=run.started_at;
  end if;
  count_claimed:=count_claimed+1;
 end loop;
 if count_claimed>0 then
  update public.player_wallets set inventory=items,updated_at=stamp where user_id=p_user;
  summary:=concat_ws(' · ',case when fuel_count>0 then '연료 '||fuel_count||'개' end,case when bait_count>0 then '미끼 '||bait_count||'개' end);
  insert into public.notifications(recipient_id,category,kind,title,body,production_auto_claim)
  values(p_user,'general','system','수확종이 생산물을 챙겼어요',summary||'를 자동으로 수령했어요. 생산소에서 다음 생산을 시작할 수 있어요.',true);
 end if;
 return count_claimed;
end $function$;

create function app_private.auto_claim_due_production()
returns integer language plpgsql security definer set search_path='' as $function$
declare owner_id uuid; n integer:=0; stamp timestamptz:=clock_timestamp();
begin
 for owner_id in
  select w.user_id from public.player_wallets w
  join app_private.player_relic_loadouts l on l.user_id=w.user_id
  join public.fishing_relics r on r.id=l.relic_id and r.enabled and r.effect_kind='production_auto_claim' and r.effect_value=1
  where exists(select 1 from app_private.production_sites s where s.user_id=w.user_id and s.started_at is not null and s.completes_at<=stamp and s.expires_at>stamp
   and coalesce((w.inventory->>'fuel')::bigint,0)+s.run_output<=1000000000)
   or exists(select 1 from app_private.bait_production_sites s where s.user_id=w.user_id and s.started_at is not null and s.completes_at<=stamp and s.expires_at>stamp
   and coalesce((w.inventory->>s.run_bait_id)::bigint,0)+s.run_output<=1000000000)
  order by w.user_id limit 200 for update of w skip locked
 loop
  n:=n+app_private.auto_claim_production(owner_id);
 end loop;
 return n;
end $function$;

-- Settle the old equipment before replacement/removal, then the new equipment
-- immediately after equipping. Already expired runs are never resurrected.
create function app_private.settle_production_auto_claim_loadout()
returns trigger language plpgsql security definer set search_path='' as $function$
begin
 if tg_when='BEFORE' then
  perform app_private.auto_claim_production(old.user_id);
  if tg_op='DELETE' then return old; end if;
 else
  perform app_private.auto_claim_production(new.user_id);
 end if;
 return new;
end $function$;
create trigger production_auto_claim_before_loadout before update or delete on app_private.player_relic_loadouts
 for each row execute function app_private.settle_production_auto_claim_loadout();
create trigger production_auto_claim_after_loadout after insert or update on app_private.player_relic_loadouts
 for each row execute function app_private.settle_production_auto_claim_loadout();

revoke all on function app_private.auto_claim_production(uuid) from public,anon,authenticated;
revoke all on function app_private.auto_claim_due_production() from public,anon,authenticated;
revoke all on function app_private.settle_production_auto_claim_loadout() from public,anon,authenticated;

CREATE OR REPLACE FUNCTION app_private.production_state()
 RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path TO ''
AS $function$
declare u uuid:=auth.uid();result jsonb;
begin
 if u is null then raise exception 'AUTH_REQUIRED';end if;
 perform app_private.get_gold_wallet();
 perform app_private.auto_claim_production(u);
 with owned as materialized(select * from app_private.production_sites where user_id=u),
 first_site as(select distinct on(facility_id) * from owned order by facility_id,purchased_at,id),
 totals as(select facility_id,count(*) n from owned group by facility_id)
 select jsonb_build_object('autoClaim',app_private.relic_bonus('production_auto_claim')>0,'activeLimit',4+app_private.relic_bonus('fuel_active_slots'),'activeTotal',app_private.production_active_count(),'serverNow',clock_timestamp(),'gold',w.gold,'fuel',coalesce((w.inventory->>'fuel')::integer,0),
 'facilities',coalesce((select jsonb_agg(to_jsonb(f)||jsonb_build_object('owned',s.id is not null,'ownedCount',coalesce(t.n,0),
 'startedAt',s.started_at,'completesAt',s.completes_at,'expiresAt',s.expires_at,'runOutput',s.run_output) order by f.price,f.id)
 from public.production_facilities f left join first_site s on s.facility_id=f.id left join totals t on t.facility_id=f.id
 where f.enabled or s.id is not null),'[]'::jsonb),
 'sites',coalesce((select jsonb_agg(to_jsonb(f)||jsonb_build_object('siteId',s.id,'owned',true,
 'startedAt',s.started_at,'completesAt',s.completes_at,'expiresAt',s.expires_at,'runOutput',s.run_output)
 order by f.price,f.id,s.purchased_at,s.id) from owned s join public.production_facilities f on f.id=s.facility_id),'[]'::jsonb))
 into result from public.player_wallets w where w.user_id=u;
 return result;
end $function$;

CREATE OR REPLACE FUNCTION app_private.bait_production_state()
 RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path TO ''
AS $function$
declare u uuid:=auth.uid();r jsonb;
begin
 if u is null then raise exception 'AUTH_REQUIRED';end if;
 perform app_private.get_gold_wallet();
 perform app_private.auto_claim_production(u);
 select jsonb_build_object('autoClaim',app_private.relic_bonus('production_auto_claim')>0,'activeLimit',4+app_private.relic_bonus('bait_active_slots'),'activeTotal',app_private.bait_production_active_count(),'serverNow',clock_timestamp(),'gold',w.gold,'fuel',coalesce((w.inventory->>'fuel')::integer,0),
 'facilities',(select coalesce(jsonb_agg(to_jsonb(f)||jsonb_build_object('baitName',b.name,'image_path',b.image_path,'ownedCount',(select count(*) from app_private.bait_production_sites s where s.user_id=u and s.facility_id=f.id)) order by f.price,f.id),'[]'::jsonb) from public.bait_production_facilities f join public.fishing_baits b on b.id=f.bait_id where f.enabled),
 'sites',(select coalesce(jsonb_agg(to_jsonb(f)||jsonb_build_object('siteId',s.id,'baitName',b.name,'image_path',b.image_path,'startedAt',s.started_at,'completesAt',s.completes_at,'expiresAt',s.expires_at,'runOutput',s.run_output) order by s.purchased_at,s.id),'[]'::jsonb) from app_private.bait_production_sites s join public.bait_production_facilities f on f.id=s.facility_id join public.fishing_baits b on b.id=f.bait_id where s.user_id=u)) into r from public.player_wallets w where user_id=u;
 return r;
end $function$;

do $cron$ begin
 if to_regclass('cron.job') is not null then
  perform cron.schedule('production-auto-claim','* * * * *','select app_private.auto_claim_due_production();');
 end if;
end $cron$;
notify pgrst,'reload schema';
commit;
