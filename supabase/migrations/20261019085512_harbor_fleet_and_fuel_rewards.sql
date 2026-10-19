-- Each physical boat has an identity; an occupied dock remains reserved while at sea.
create table public.harbor_boats(
 id uuid primary key default gen_random_uuid(),user_id uuid not null references auth.users(id) on delete cascade,
 vessel_id text not null references public.harbor_vessels(id),instance_no integer not null check(instance_no between 1 and 2),
 dock_slot integer check(dock_slot between 1 and 2),purchased_at timestamptz not null default clock_timestamp(),
 unique(user_id,vessel_id,instance_no),unique(user_id,dock_slot),unique(id,user_id,vessel_id)
);
create index harbor_boats_vessel_idx on public.harbor_boats(vessel_id);
alter table public.harbor_boats enable row level security;
revoke all on public.harbor_boats from public,anon,authenticated;
grant select on public.harbor_boats to authenticated;
create policy harbor_boats_owner_read on public.harbor_boats for select to authenticated using(user_id=(select auth.uid()));
insert into public.harbor_boats(user_id,vessel_id,instance_no,dock_slot,purchased_at)
 select user_id,vessel_id,1,case when slot<=2 then slot::integer end,purchased_at
 from(select o.*,row_number() over(partition by user_id order by purchased_at,vessel_id) slot from public.player_harbor_vessels o) t;
alter table public.harbor_voyages add column boat_id uuid;
update public.harbor_voyages v set boat_id=b.id from public.harbor_boats b where b.user_id=v.user_id and b.vessel_id=v.vessel_id and b.instance_no=1;
alter table public.harbor_voyages alter column boat_id set not null;
alter table public.harbor_voyages add constraint harbor_voyages_boat_owner_fkey foreign key(boat_id,user_id,vessel_id) references public.harbor_boats(id,user_id,vessel_id);
drop index public.harbor_one_voyage_per_vessel;
create unique index harbor_one_voyage_per_boat on public.harbor_voyages(boat_id) where claimed_at is null;
create index harbor_voyages_boat_idx on public.harbor_voyages(boat_id);

alter function app_private.harbor_action(text,uuid,text,uuid,integer) rename to settle_legacy_harbor;
revoke all on function app_private.settle_legacy_harbor(text,uuid,text,uuid,integer) from public,anon,authenticated;
drop function public.harbor_action(text,uuid,text,uuid,integer);

create or replace function app_private.harbor_state() returns jsonb language plpgsql security definer set search_path='' as $$
declare u uuid:=auth.uid();w jsonb;
begin
 if u is null then raise exception 'AUTH_REQUIRED';end if;
 w:=app_private.get_gold_wallet();
 return jsonb_build_object('serverNow',clock_timestamp(),'fuel',coalesce((w->'inventory'->>'fuel')::integer,0),'fuelPrice',50,'dockSlots',2,
 'vessels',coalesce((select jsonb_agg(to_jsonb(v)||jsonb_build_object('owned',o.n>0,'ownedCount',o.n) order by v.sort_order)
  from public.harbor_vessels v cross join lateral(select count(*)::integer n from public.harbor_boats b where b.user_id=u and b.vessel_id=v.id)o),'[]'::jsonb),
 'boats',coalesce((select jsonb_agg(to_jsonb(v)||jsonb_build_object('id',b.id,'vessel_id',b.vessel_id,'instance_no',b.instance_no,'dock_slot',b.dock_slot,'owned',true) order by b.purchased_at,b.id)
  from public.harbor_boats b join public.harbor_vessels v on v.id=b.vessel_id where b.user_id=u),'[]'::jsonb),
 'voyages',coalesce((select jsonb_agg(to_jsonb(v) order by v.departed_at) from public.harbor_voyages v where v.user_id=u and v.claimed_at is null),'[]'::jsonb));
end $$;

create function app_private.harbor_action(p_action text,p_operation_id uuid,p_vessel_id text default null,p_voyage_id uuid default null,p_quantity integer default 1,p_boat_id uuid default null,p_slot integer default null)
returns jsonb language plpgsql security definer set search_path='' as $$
declare u uuid:=auth.uid();v public.harbor_vessels;b public.harbor_boats;occupant public.harbor_boats;w public.player_wallets;trip public.harbor_voyages;
 prev app_private.harbor_operations;sig jsonb;receipt jsonb;n integer;slot integer;fuel integer;
begin
 if u is null then raise exception 'AUTH_REQUIRED';end if;
 if p_operation_id is null or p_action is null or p_action not in ('buy','depart','dock','store','fuel','arrive','claim','claim_all') then raise exception 'INVALID_HARBOR_ACTION';end if;
 if p_action in ('fuel','arrive','claim','claim_all') then return app_private.settle_legacy_harbor(p_action,p_operation_id,p_vessel_id,p_voyage_id,p_quantity);end if;
 sig:=jsonb_build_object('action',p_action,'vessel',p_vessel_id,'voyage',p_voyage_id,'quantity',p_quantity);
 if p_boat_id is not null or p_slot is not null then sig:=sig||jsonb_build_object('boat',p_boat_id,'slot',p_slot);end if;
 perform pg_advisory_xact_lock(hashtextextended('harbor:'||u::text,0));
 select * into prev from app_private.harbor_operations where user_id=u and operation_id=p_operation_id;
 if found then
  if prev.signature<>sig then raise exception 'OPERATION_CONFLICT';end if;
  return app_private.harbor_state()||jsonb_build_object('receipt',prev.receipt,'replayed',true);
 end if;
 perform app_private.get_gold_wallet();select * into w from public.player_wallets where user_id=u for update;
 if p_action='buy' then
  select * into v from public.harbor_vessels where id=p_vessel_id;
  if not found then raise exception 'VESSEL_NOT_FOUND';end if;
  select count(*) into n from public.harbor_boats where user_id=u and vessel_id=v.id;
  if n>=2 then raise exception 'VESSEL_OWNERSHIP_LIMIT';end if;
  if w.gold<v.price then raise exception 'INSUFFICIENT_GOLD';end if;
  select s into slot from generate_series(1,2) s where not exists(select 1 from public.harbor_boats where user_id=u and dock_slot=s) order by s limit 1;
  insert into public.harbor_boats(user_id,vessel_id,instance_no,dock_slot) values(u,v.id,n+1,slot) returning * into b;
  insert into public.player_harbor_vessels(user_id,vessel_id) values(u,v.id) on conflict do nothing;
  update public.player_wallets set gold=gold-v.price,updated_at=now() where user_id=u;
  insert into public.gold_transactions(user_id,operation_id,action,item_id,delta) values(u,p_operation_id,'buy','harbor-vessel:'||v.id,-v.price);
  receipt:=jsonb_build_object('action','buy','vesselId',v.id,'boatId',b.id);
 else
  if p_boat_id is not null then select * into b from public.harbor_boats where id=p_boat_id and user_id=u;
  elsif p_action='depart' then
   select * into b from public.harbor_boats b0 where b0.user_id=u and b0.vessel_id=p_vessel_id and b0.dock_slot is not null
    order by exists(select 1 from public.harbor_voyages t where t.boat_id=b0.id and t.claimed_at is null),b0.dock_slot limit 1;
  end if;
  if b.id is null then raise exception 'VESSEL_NOT_OWNED';end if;
  if p_vessel_id is not null and p_vessel_id<>b.vessel_id then raise exception 'INVALID_BOAT';end if;
  if exists(select 1 from public.harbor_voyages where boat_id=b.id and claimed_at is null) then raise exception 'VOYAGE_ACTIVE';end if;
  if p_action='dock' then
   if p_slot is null or p_slot not between 1 and 2 then raise exception 'INVALID_DOCK_SLOT';end if;
   if b.dock_slot is not null and b.dock_slot<>p_slot then raise exception 'BOAT_ALREADY_DOCKED';end if;
   select * into occupant from public.harbor_boats where user_id=u and dock_slot=p_slot and id<>b.id;
   if occupant.id is not null then
    if exists(select 1 from public.harbor_voyages where boat_id=occupant.id and claimed_at is null) then raise exception 'DOCK_RESERVED';end if;
    update public.harbor_boats set dock_slot=null where id=occupant.id;
   end if;
   update public.harbor_boats set dock_slot=p_slot where id=b.id;
   receipt:=jsonb_build_object('action','dock','boatId',b.id,'slot',p_slot);
  elsif p_action='store' then
   update public.harbor_boats set dock_slot=null where id=b.id;
   receipt:=jsonb_build_object('action','store','boatId',b.id);
  else
   if b.dock_slot is null then raise exception 'DOCK_REQUIRED';end if;
   select * into strict v from public.harbor_vessels where id=b.vessel_id;
   fuel:=coalesce((w.inventory->>'fuel')::integer,0);
   if fuel<v.fuel_cost then raise exception 'INSUFFICIENT_FUEL';end if;
   update public.player_wallets set inventory=jsonb_set(inventory,'{fuel}',to_jsonb(fuel-v.fuel_cost)),updated_at=now() where user_id=u;
   insert into public.harbor_voyages(user_id,vessel_id,boat_id,vessel_snapshot,returns_at) values(u,v.id,b.id,to_jsonb(v),clock_timestamp()+make_interval(mins=>v.duration_minutes)) returning * into trip;
   receipt:=jsonb_build_object('action','depart','voyageId',trip.id,'vesselId',v.id,'boatId',b.id);
  end if;
 end if;
 insert into app_private.harbor_operations(user_id,operation_id,signature,receipt) values(u,p_operation_id,sig,receipt);
 return app_private.harbor_state()||jsonb_build_object('receipt',receipt,'replayed',false);
end $$;
create function public.harbor_action(p_action text,p_operation_id uuid,p_vessel_id text default null,p_voyage_id uuid default null,p_quantity integer default 1,p_boat_id uuid default null,p_slot integer default null)
returns jsonb language sql security invoker set search_path='' as $$select app_private.harbor_action(p_action,p_operation_id,p_vessel_id,p_voyage_id,p_quantity,p_boat_id,p_slot)$$;
revoke all on function public.harbor_action(text,uuid,text,uuid,integer,uuid,integer),app_private.harbor_action(text,uuid,text,uuid,integer,uuid,integer) from public,anon;
grant execute on function public.harbor_action(text,uuid,text,uuid,integer,uuid,integer),app_private.harbor_action(text,uuid,text,uuid,integer,uuid,integer) to authenticated;

-- Existing claim keys remain unchanged: already collected gold rewards do not pay again.
alter table app_private.quest_claims add column fuel integer not null default 0 check(fuel between 0 and 100000);
alter table app_private.quest_claims drop constraint quest_claims_gold_check;
alter table app_private.quest_claims add constraint quest_claims_reward_check check(gold>=0 and (gold>0 or fuel>0));
alter function app_private.quest_period(text,timestamptz) rename to base_quest_period;
revoke all on function app_private.base_quest_period(text,timestamptz) from public,anon,authenticated;
create function app_private.quest_period(p_kind text,p_now timestamptz) returns jsonb language plpgsql security definer set search_path='' as $$
declare p jsonb;q jsonb;entries jsonb:='[]'::jsonb;fuel integer;
begin
 if auth.uid() is null then raise exception 'AUTH_REQUIRED';end if;
 p:=app_private.base_quest_period(p_kind,p_now);
 for q in select value from jsonb_array_elements(p->'quests') loop
  fuel:=case when p_kind='daily' and q->>'id' in ('post','depart','care') then 1 when p_kind='weekly' and q->>'id' in ('trade','gift') then 5 else 0 end;
  entries:=entries||jsonb_build_array(q||jsonb_build_object('reward',case when fuel>0 then 0 else (q->>'reward')::integer end,'rewardFuel',fuel));
 end loop;
 return jsonb_set(p,'{quests}',entries);
end $$;
revoke all on function app_private.quest_period(text,timestamptz) from public,anon;
grant execute on function app_private.quest_period(text,timestamptz) to authenticated;
create or replace function app_private.claim_quest(p_kind text,p_start date,p_quest_id text) returns jsonb language plpgsql security definer set search_path='' as $$
declare u uuid:=auth.uid();p jsonb;q jsonb;amount integer;fuel integer:=0;w public.player_wallets;balance integer;
begin
 if u is null then raise exception 'AUTH_REQUIRED';end if;
 if p_kind is null or p_kind not in ('daily','weekly','growth') or p_start is null or p_quest_id is null then raise exception 'INVALID_QUEST';end if;
 perform app_private.get_gold_wallet();select * into w from public.player_wallets where user_id=u for update;
 if p_kind='growth' then p:=app_private.growth_quest_period();else p:=app_private.quest_period(p_kind,clock_timestamp());end if;
 if p_start<>(p->>'start')::date then raise exception 'QUEST_PERIOD_CHANGED';end if;
 if p_quest_id='all' then
  if p_kind='growth' then raise exception 'INVALID_QUEST';end if;
  if not (p->>'bonusReady')::boolean then raise exception 'QUEST_INCOMPLETE';end if;
  amount:=(p->>'bonus')::integer;
 else
  select value into q from jsonb_array_elements(p->'quests') where value->>'id'=p_quest_id;
  if q is null then raise exception 'INVALID_QUEST';end if;
  if not (q->>'complete')::boolean then raise exception 'QUEST_INCOMPLETE';end if;
  amount:=(q->>'reward')::integer;fuel:=coalesce((q->>'rewardFuel')::integer,0);
 end if;
 if exists(select 1 from app_private.quest_claims where user_id=u and period_kind=p_kind and period_start=p_start and quest_id=p_quest_id) then
  return app_private.quest_state()||jsonb_build_object('credited',0,'creditedFuel',0);
 end if;
 if w.gold::bigint+amount>1000000000 then raise exception 'GOLD_LIMIT';end if;
 balance:=coalesce((w.inventory->>'fuel')::integer,0);
 if fuel>0 and balance>100000-fuel then raise exception 'FUEL_LIMIT';end if;
 insert into app_private.quest_claims(user_id,period_kind,period_start,quest_id,gold,fuel) values(u,p_kind,p_start,p_quest_id,amount,fuel);
 update public.player_wallets set gold=gold+amount,inventory=case when fuel>0 then jsonb_set(inventory,'{fuel}',to_jsonb(balance+fuel)) else inventory end,updated_at=clock_timestamp() where user_id=u;
 if amount>0 then insert into public.gold_transactions(user_id,operation_id,action,item_id,delta) values(u,gen_random_uuid(),'charge','quest:'||p_kind||':'||p_start||':'||p_quest_id,amount);end if;
 return app_private.quest_state()||jsonb_build_object('credited',amount,'creditedFuel',fuel);
end $$;
