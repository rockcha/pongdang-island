begin;
alter table public.fishing_expeditions add column notified_at timestamptz;
alter table public.notifications add column expedition_id uuid references public.fishing_expeditions(id) on delete set null;
create unique index notifications_expedition_once on public.notifications(expedition_id) where expedition_id is not null;
create index expeditions_due_notifications on public.fishing_expeditions(returns_at) where notified_at is null and claimed_at is null;

-- Scheduler and instant return share the same atomic, bounded outbox operation.
create function app_private.notify_due_expeditions(p_expedition_id uuid default null) returns integer language plpgsql security definer set search_path='' as $$
declare n integer;
begin
 with due as (
  select id from public.fishing_expeditions where returns_at<=clock_timestamp() and notified_at is null and claimed_at is null and (p_expedition_id is null or id=p_expedition_id)
  order by returns_at limit 500 for update skip locked
 ), marked as (
  update public.fishing_expeditions e set notified_at=clock_timestamp() from due where e.id=due.id returning e.*
 ) insert into public.notifications(recipient_id,category,kind,title,body,expedition_id)
 select user_id,'general','system','어선이 귀항했어요!',(vessel_snapshot->>'name')||'의 조업이 끝났어요. 파견 페이지에서 결과를 받아주세요.',id from marked
 on conflict (expedition_id) where expedition_id is not null do nothing;
 get diagnostics n=row_count;
 return n;
end $$;
revoke all on function app_private.notify_due_expeditions(uuid) from public,anon,authenticated;

create function app_private.expedition_return_notice() returns trigger language plpgsql security definer set search_path='' as $$
begin
 if new.returns_at<=clock_timestamp() and new.notified_at is null then perform app_private.notify_due_expeditions(new.id);end if;
 return new;
end $$;
revoke all on function app_private.expedition_return_notice() from public,anon,authenticated;
create trigger expedition_return_notice after insert or update of returns_at on public.fishing_expeditions for each row execute function app_private.expedition_return_notice();
create or replace function app_private.expedition_action(p_action text,p_operation_id uuid,p_vessel_id text default null,p_region_id text default null,p_cargo jsonb default null,p_expedition_id uuid default null)
returns jsonb language plpgsql security definer set search_path='' as $$
declare u uuid:=auth.uid();v public.fishing_vessels;e public.fishing_expeditions;w public.player_wallets;
 sig jsonb;prev app_private.expedition_operations;receipt jsonb;cargo record;total integer:=0;count integer;sid text;bid text;
 bonus integer;bonus_bait text;draws text[]:=array[]::text[];i integer;item uuid;results jsonb:='[]';refunds jsonb:='{}';local_discovery boolean;failed integer:=0;
begin
 if u is null then raise exception 'AUTH_REQUIRED';end if;
 if p_action is null or p_action not in ('buy','depart','claim','instant') or p_operation_id is null then raise exception 'INVALID_EXPEDITION';end if;
 sig:=jsonb_build_object('action',p_action,'vessel',p_vessel_id,'region',p_region_id,'cargo',p_cargo,'expedition',p_expedition_id);
 perform pg_advisory_xact_lock(hashtextextended('expedition:'||u::text,0));
 select * into prev from app_private.expedition_operations where user_id=u and operation_id=p_operation_id;
 if found then
  if prev.signature<>sig then raise exception 'OPERATION_CONFLICT';end if;
  return app_private.expedition_state()||jsonb_build_object('receipt',prev.receipt,'replayed',true);
 end if;
 perform app_private.get_gold_wallet();
 select * into w from public.player_wallets where user_id=u for update;
 if p_action in ('buy','depart') then
  select * into v from public.fishing_vessels where id=p_vessel_id;
  if not found then raise exception 'VESSEL_NOT_FOUND';end if;
 end if;
 if p_action='buy' then
  if v.price>0 and not exists(select 1 from public.player_fishing_vessels where user_id=u and vessel_id=v.id) then
   if w.gold<v.price then raise exception 'INSUFFICIENT_GOLD';end if;
   update public.player_wallets set gold=gold-v.price,updated_at=now() where user_id=u;
   insert into public.player_fishing_vessels(user_id,vessel_id) values(u,v.id);
   insert into public.gold_transactions(user_id,operation_id,action,item_id,delta) values(u,p_operation_id,'buy','vessel:'||v.id,-v.price);
  end if;
  receipt:=jsonb_build_object('action','buy','vesselId',v.id);
 elsif p_action='depart' then
  if v.price>0 and not exists(select 1 from public.player_fishing_vessels where user_id=u and vessel_id=v.id) then raise exception 'VESSEL_NOT_OWNED';end if;
  if exists(select 1 from public.fishing_expeditions where user_id=u and claimed_at is null) then raise exception 'EXPEDITION_ACTIVE';end if;
  if not exists(select 1 from public.regions r where r.id=p_region_id and (not r.requires_map_fragment or exists(select 1 from public.player_map_fragments f where f.user_id=u and f.region_id=r.id))) then raise exception 'REGION_LOCKED';end if;
  if p_cargo is null or jsonb_typeof(p_cargo)<>'object' then raise exception 'INVALID_CARGO';end if;
  for cargo in select key,value from jsonb_each_text(p_cargo) loop
   if not exists(select 1 from public.fishing_baits where id=cargo.key) or cargo.value !~ '^[1-9][0-9]{0,2}$' then raise exception 'INVALID_CARGO';end if;
   count:=cargo.value::integer;total:=total+count;
   if coalesce((w.inventory->>cargo.key)::integer,0)<count then raise exception 'NO_BAIT';end if;
   w.inventory:=jsonb_set(w.inventory,array[cargo.key],to_jsonb((w.inventory->>cargo.key)::integer-count));
  end loop;
  if total<v.min_baits or total>v.max_baits then raise exception 'CARGO_LIMIT';end if;
  update public.player_wallets set inventory=w.inventory,updated_at=now() where user_id=u;
  insert into public.fishing_expeditions(user_id,vessel_id,region_id,cargo,vessel_snapshot,returns_at)
   values(u,v.id,p_region_id,p_cargo,to_jsonb(v),clock_timestamp()+make_interval(mins=>v.duration_minutes)) returning * into e;
  receipt:=jsonb_build_object('action','depart','expeditionId',e.id);
 else
  perform app_private.notify_due_expeditions(p_expedition_id);
  select * into e from public.fishing_expeditions where id=p_expedition_id and user_id=u for update;
  if not found then raise exception 'EXPEDITION_NOT_FOUND';end if;
  if e.claimed_at is not null then
   receipt:=jsonb_build_object('action','claim','expeditionId',e.id,'result',e.result);
  elsif p_action='instant' then
   if not coalesce((select instant_return_enabled from app_private.expedition_settings where id),false) then raise exception 'TEST_DISABLED';end if;
   update public.fishing_expeditions set returns_at=least(returns_at,clock_timestamp()) where id=e.id;
   receipt:=jsonb_build_object('action','instant','expeditionId',e.id);
  else
   if clock_timestamp()<e.returns_at then raise exception 'EXPEDITION_NOT_READY';end if;
   v:=jsonb_populate_record(null::public.fishing_vessels,e.vessel_snapshot);
   for cargo in select key,value from jsonb_each_text(e.cargo) loop
    count:=cargo.value::integer;total:=total+count;
    for i in 1..count loop draws:=array_append(draws,cargo.key);end loop;
   end loop;
   bonus:=case when v.bonus_kind='per_ten' then least(total/10,v.bonus_count) else v.bonus_count end;
   bonus_bait:=case v.bonus_kind when 'special' then 'bait_special' when 'magnet' then 'bait_magnet' when 'candy' then 'bait_forbidden_star' when 'discovery' then 'bait_first_greeting' when 'epic' then 'bait_epic' else 'bait' end;
   if v.bonus_kind='copy' then
    select d into bonus_bait from unnest(draws) d where d not in ('bait_first_greeting','bait_epic','bait_magnet') order by random() limit 1;
    bonus_bait:=coalesce(bonus_bait,'bait');
   end if;
   for i in 1..bonus loop draws:=array_append(draws,bonus_bait);end loop;
   for i in 1..cardinality(draws) loop
    bid:=draws[i];local_discovery:=i>total and v.bonus_kind='discovery';
    sid:=app_private.expedition_pick(e.region_id,bid,v.bonus_kind='native',local_discovery);
    if sid is null and local_discovery then bid:='bait_special';sid:=app_private.expedition_pick(e.region_id,bid,false,false);end if;
    if sid is null and bid='bait_first_greeting' and i<=total then
     refunds:=jsonb_set(refunds,array[bid],to_jsonb(coalesce((refunds->>bid)::integer,0)+1));
     w.inventory:=jsonb_set(w.inventory,array[bid],to_jsonb(coalesce((w.inventory->>bid)::integer,0)+1));
    elsif sid is not null and random()>=app_private.fishing_success_chance_bp(bid)::numeric/10000 then
     failed:=failed+1;
    else
     if sid is null then raise exception 'NO_COLLECTIBLE_FOR_REGION';end if;
     insert into public.player_collectibles(user_id,species_id) values(u,sid) returning id into item;
     insert into public.player_discoveries(user_id,species_id) values(u,sid) on conflict do nothing;
     results:=results||jsonb_build_array(jsonb_build_object('id',item,'species',app_private.species_payload(sid,null),'bonus',i>total,'baitId',bid));
    end if;
   end loop;
   receipt:=jsonb_build_object('action','claim','expeditionId',e.id,'result',jsonb_build_object('items',results,'refunds',refunds,'failed',failed,'attempted',cardinality(draws),'succeeded',jsonb_array_length(results)));
   update public.player_wallets set inventory=w.inventory,updated_at=now() where user_id=u;
   update public.fishing_expeditions set claimed_at=clock_timestamp(),result=receipt->'result' where id=e.id;
  end if;
 end if;
 insert into app_private.expedition_operations values(u,p_operation_id,sig,receipt);
 return app_private.expedition_state()||jsonb_build_object('receipt',receipt,'replayed',false);
end $$;
-- pg_cron is already enabled on the target Supabase project. PGlite has no cron service.
do $$begin
 if exists(select 1 from pg_extension where extname='pg_cron') then
  perform cron.schedule('fishing-expedition-return-notices','* * * * *','select app_private.notify_due_expeditions()');
 elsif exists(select 1 from pg_available_extensions where name='pg_cron') then
  execute 'create extension pg_cron';
  perform cron.schedule('fishing-expedition-return-notices','* * * * *','select app_private.notify_due_expeditions()');
 else
  raise notice 'pg_cron unavailable: enable a server scheduler for app_private.notify_due_expeditions() before deployment';
 end if;
end $$;
select app_private.notify_due_expeditions();
notify pgrst,'reload schema';
commit;
