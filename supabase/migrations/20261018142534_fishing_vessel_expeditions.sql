begin;
create table public.fishing_vessels (
 id text primary key,name text not null,price integer not null check(price>=0),
 duration_minutes integer not null check(duration_minutes>0),min_baits integer not null check(min_baits>0),
 max_baits integer not null check(max_baits>=min_baits and max_baits<=100),
 bonus_kind text not null check(bonus_kind in ('basic','copy','per_ten','native','special','magnet','candy','discovery','epic')),
 bonus_count integer not null check(bonus_count>=0),bonus_description text not null,sort_order integer not null
);
insert into public.fishing_vessels values
 ('dinghy','꼬마 통통배',0,30,3,5,'basic',1,'기본 미끼로 추가 조업 1회',1),
 ('breeze','바람돛 낚싯배',800,20,5,10,'copy',1,'맡긴 미끼 중 하나로 추가 조업 1회 · 일부 특수 미끼 제외',2),
 ('coastal','느긋한 연안어선',1000,120,10,25,'basic',3,'기본 미끼로 추가 조업 3회',3),
 ('moonlight','달빛 야간어선',1400,480,20,60,'basic',5,'기본 미끼로 추가 조업 5회',4),
 ('fullcatch','만선 나무어선',1800,240,15,40,'per_ten',4,'미끼 10개마다 기본 미끼 추가 조업 1회 · 최대 4회',5),
 ('homesea','고향물길 탐사선',2800,120,10,20,'native',0,'현재 해역 고유종 추첨 가중치 1.5배 · 등급 확률 유지',6),
 ('shrimp','달빛 새우잡이배',3500,180,10,20,'special',1,'달빛 진주새우로 추가 조업 1회',7),
 ('salvage','녹슨 보물인양선',4000,240,12,25,'magnet',1,'심해 인력석으로 추가 조업 1회',8),
 ('candy','별사탕 밀수선',4500,180,10,20,'candy',2,'금단의 별사탕으로 추가 조업 2회',9),
 ('discovery','소라의 발견선',5500,360,15,20,'discovery',1,'해역 미발견 개체 추가 조업 1회 · 모두 발견하면 달빛 진주새우로 대체',10),
 ('starlit','별잠 심해탐사선',7500,1440,12,15,'epic',1,'별잠의 유혹으로 추가 조업 1회',11);
create table public.player_fishing_vessels (
 user_id uuid not null references auth.users(id) on delete cascade,vessel_id text not null references public.fishing_vessels(id),
 purchased_at timestamptz not null default now(),primary key(user_id,vessel_id)
);
create table public.fishing_expeditions (
 id uuid primary key default gen_random_uuid(),user_id uuid not null references auth.users(id) on delete cascade,
 vessel_id text not null references public.fishing_vessels(id),region_id text not null references public.regions(id),
 cargo jsonb not null check(jsonb_typeof(cargo)='object'),vessel_snapshot jsonb not null,
 departed_at timestamptz not null default clock_timestamp(),returns_at timestamptz not null,
 claimed_at timestamptz,result jsonb
);
create unique index fishing_expeditions_one_active on public.fishing_expeditions(user_id) where claimed_at is null;
create index fishing_expeditions_history on public.fishing_expeditions(user_id,departed_at desc);
create table app_private.expedition_operations (
 user_id uuid not null references auth.users(id) on delete cascade,operation_id uuid not null,
 signature jsonb not null,receipt jsonb not null,primary key(user_id,operation_id)
);
-- Temporary test control. Disable before ending the expedition test period.
create table app_private.expedition_settings(id boolean primary key default true check(id),instant_return_enabled boolean not null default false);
insert into app_private.expedition_settings values(true,true);
alter table public.fishing_vessels enable row level security;
alter table public.player_fishing_vessels enable row level security;
alter table public.fishing_expeditions enable row level security;
alter table app_private.expedition_operations enable row level security;
alter table app_private.expedition_settings enable row level security;
create policy vessels_read on public.fishing_vessels for select to authenticated using(true);
create policy owned_vessels_read on public.player_fishing_vessels for select to authenticated using(user_id=(select auth.uid()));
create policy expeditions_read on public.fishing_expeditions for select to authenticated using(user_id=(select auth.uid()));
revoke all on public.fishing_vessels,public.player_fishing_vessels,public.fishing_expeditions from anon,authenticated;
grant select on public.fishing_vessels,public.player_fishing_vessels,public.fishing_expeditions to authenticated;
revoke all on app_private.expedition_operations,app_private.expedition_settings from public,anon,authenticated;

create function app_private.expedition_state() returns jsonb language plpgsql security definer set search_path='' as $$
declare u uuid:=auth.uid();
begin
 if u is null then raise exception 'AUTH_REQUIRED';end if;
 return jsonb_build_object('serverNow',clock_timestamp(),'testEnabled',(select instant_return_enabled from app_private.expedition_settings where id),
 'vessels',(select jsonb_agg(to_jsonb(v)||jsonb_build_object('owned',v.price=0 or exists(select 1 from public.player_fishing_vessels o where o.user_id=u and o.vessel_id=v.id)) order by sort_order) from public.fishing_vessels v),
 'active',(select to_jsonb(e)-'result' from public.fishing_expeditions e where user_id=u and claimed_at is null),
 'history',coalesce((select jsonb_agg(to_jsonb(h) order by departed_at desc) from (select * from public.fishing_expeditions where user_id=u and claimed_at is not null order by departed_at desc limit 5) h),'[]'::jsonb),
 'baits',(select jsonb_agg(to_jsonb(b) order by sort_order) from public.fishing_baits b));
end $$;

-- A vessel uses its own habitat modifier, independent of the equipped manual rod.
create function app_private.expedition_pick(p_region text,p_bait text,p_native boolean,p_local_discovery boolean default false)
returns text language plpgsql set search_path='' as $$
declare b public.fishing_baits;r public.game_rarity;roll integer:=floor(random()*10000);sid text;
begin
 select * into strict b from public.fishing_baits where id=p_bait;
 r:=case when roll<b.mythic_bp then 'mythic' when roll<b.mythic_bp+b.epic_bp then 'epic' when roll<b.mythic_bp+b.epic_bp+b.rare_bp then 'rare' else 'common' end;
 with candidates as materialized (
  select s.* from public.collectible_species s where
   case when p_bait='bait_first_greeting' then s.kind in ('fish','trash','decoration')
     and not exists(select 1 from public.player_discoveries d where d.user_id=auth.uid() and d.species_id=s.id)
     and (not p_local_discovery or exists(select 1 from public.collectible_habitats h where h.species_id=s.id and h.region_id=p_region))
    when p_bait='bait_grubby_magnet' then s.kind='trash'
    when b.effect_kind='decoration' then s.kind='decoration'
    else s.kind in ('fish','trash') and s.rarity=r end
 ), pool as (
  select * from candidates c where b.effect_kind='decoration' or c.rarity=r or not exists(select 1 from candidates c2 where c2.rarity=r)
 ) select p.id into sid from pool p order by -ln(greatest(random(),1e-15))/(
  app_private.collectible_habitat_weight(case when p.is_native then p.native_region_id end,p_region)
  * case when p.is_native and p.native_region_id=p_region then (case when p_native then 1.5 else 1 end)*(case when p_bait='bait_sea_memory' then 3 else 1 end) else 1 end
  * case when p.rarity=r or b.effect_kind='decoration' then 1 else case p.rarity when 'common' then 7700 when 'rare' then 2000 when 'epic' then 270 else 30 end end
 ),p.id limit 1;
 return sid;
end $$;

create function app_private.expedition_action(p_action text,p_operation_id uuid,p_vessel_id text default null,p_region_id text default null,p_cargo jsonb default null,p_expedition_id uuid default null)
returns jsonb language plpgsql security definer set search_path='' as $$
declare u uuid:=auth.uid();v public.fishing_vessels;e public.fishing_expeditions;w public.player_wallets;
 sig jsonb;prev app_private.expedition_operations;receipt jsonb;cargo record;total integer:=0;count integer;sid text;bid text;
 bonus integer;bonus_bait text;draws text[]:=array[]::text[];i integer;item uuid;results jsonb:='[]';refunds jsonb:='{}';local_discovery boolean;
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
    else
     if sid is null then raise exception 'NO_COLLECTIBLE_FOR_REGION';end if;
     insert into public.player_collectibles(user_id,species_id) values(u,sid) returning id into item;
     insert into public.player_discoveries(user_id,species_id) values(u,sid) on conflict do nothing;
     results:=results||jsonb_build_array(jsonb_build_object('id',item,'species',app_private.species_payload(sid,null),'bonus',i>total,'baitId',bid));
    end if;
   end loop;
   receipt:=jsonb_build_object('action','claim','expeditionId',e.id,'result',jsonb_build_object('items',results,'refunds',refunds));
   update public.player_wallets set inventory=w.inventory,updated_at=now() where user_id=u;
   update public.fishing_expeditions set claimed_at=clock_timestamp(),result=receipt->'result' where id=e.id;
  end if;
 end if;
 insert into app_private.expedition_operations values(u,p_operation_id,sig,receipt);
 return app_private.expedition_state()||jsonb_build_object('receipt',receipt,'replayed',false);
end $$;

create function public.expedition_state() returns jsonb language sql security invoker set search_path='' as $$select app_private.expedition_state()$$;
create function public.expedition_action(p_action text,p_operation_id uuid,p_vessel_id text default null,p_region_id text default null,p_cargo jsonb default null,p_expedition_id uuid default null)
returns jsonb language sql security invoker set search_path='' as $$select app_private.expedition_action(p_action,p_operation_id,p_vessel_id,p_region_id,p_cargo,p_expedition_id)$$;
revoke all on function app_private.expedition_pick(text,text,boolean,boolean) from public,anon,authenticated;
revoke all on function app_private.expedition_state(),app_private.expedition_action(text,uuid,text,text,jsonb,uuid),public.expedition_state(),public.expedition_action(text,uuid,text,text,jsonb,uuid) from public,anon;
grant execute on function app_private.expedition_state(),app_private.expedition_action(text,uuid,text,text,jsonb,uuid),public.expedition_state(),public.expedition_action(text,uuid,text,text,jsonb,uuid) to authenticated;
notify pgrst,'reload schema';
commit;
