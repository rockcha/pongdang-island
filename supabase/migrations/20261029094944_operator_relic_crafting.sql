-- Operator preview: composites retain two distinct catalog effects without
-- entering the fishing reward pool. Wallet locks serialize all inventory writes.
create table app_private.crafted_relics (
 id text primary key default ('crafted-'||gen_random_uuid()::text),
 user_id uuid not null references auth.users(id) on delete cascade,
 base_id text not null references public.fishing_relics(id),
 attached_id text not null references public.fishing_relics(id),
 created_at timestamptz not null default clock_timestamp(),
 unique(user_id,id), check(base_id<>attached_id)
);
create index crafted_relics_base_idx on app_private.crafted_relics(base_id);
create index crafted_relics_attached_idx on app_private.crafted_relics(attached_id);
alter table app_private.crafted_relics enable row level security;
revoke all on app_private.crafted_relics from public,anon,authenticated;

alter table app_private.player_relic_loadouts alter column relic_id drop not null;
alter table app_private.player_relic_loadouts add column crafted_id text;
alter table app_private.player_relic_loadouts add constraint relic_loadout_crafted_fk
 foreign key(user_id,crafted_id) references app_private.crafted_relics(user_id,id);
alter table app_private.player_relic_loadouts add constraint relic_loadout_one_item
 check ((relic_id is null)<>(crafted_id is null));
create index relic_loadout_crafted_idx on app_private.player_relic_loadouts(user_id,crafted_id) where crafted_id is not null;

create table app_private.relic_craft_operations (
 user_id uuid not null references auth.users(id) on delete cascade,
 operation_id uuid not null,
 base_id text not null references public.fishing_relics(id),
 attached_id text not null references public.fishing_relics(id),
 result jsonb not null,
 created_at timestamptz not null default clock_timestamp(),
 primary key(user_id,operation_id)
);
create index relic_craft_base_idx on app_private.relic_craft_operations(base_id);
create index relic_craft_attached_idx on app_private.relic_craft_operations(attached_id);
alter table app_private.relic_craft_operations enable row level security;
revoke all on app_private.relic_craft_operations from public,anon,authenticated;

-- Durable marker for a separately executed, idempotent operator test grant.
create table app_private.relic_test_grants (
 user_id uuid not null references auth.users(id) on delete cascade,
 grant_key text not null,
 created_at timestamptz not null default clock_timestamp(),
 primary key(user_id,grant_key)
);
alter table app_private.relic_test_grants enable row level security;
revoke all on app_private.relic_test_grants from public,anon,authenticated;

-- Internal only: supports background auto-claim for an explicit player as well
-- as authenticated gameplay. No client can choose another player's identity.
create function app_private.equipped_relic_effects(p_user uuid)
returns table(relic_id text,effect_kind text,effect_value numeric)
language sql stable security definer set search_path='' as $$
 select r.id,r.effect_kind,r.effect_value
 from app_private.player_relic_loadouts l
 join public.fishing_relics r on r.id=l.relic_id
 where l.user_id=p_user and r.enabled
 union all
 select r.id,r.effect_kind,r.effect_value
 from app_private.player_relic_loadouts l
 join app_private.crafted_relics c on c.user_id=l.user_id and c.id=l.crafted_id
 join public.fishing_relics r on r.id in(c.base_id,c.attached_id)
 where l.user_id=p_user and r.enabled
$$;
revoke all on function app_private.equipped_relic_effects(uuid) from public,anon,authenticated;

create or replace function app_private.relic_bonus(p_effect text) returns numeric
language sql stable security definer set search_path='' as $$
 select coalesce(sum(effect_value),0) from app_private.equipped_relic_effects(auth.uid()) where effect_kind=p_effect
$$;

create or replace function app_private.relic_state() returns jsonb
language plpgsql security definer set search_path='' as $$
declare u uuid:=auth.uid(); originals jsonb; composites jsonb;
begin
 if u is null then raise exception 'AUTH_REQUIRED';end if;
 select coalesce(jsonb_agg(to_jsonb(r)||jsonb_build_object(
  'discovered',exists(select 1 from app_private.player_fishing_relic_discoveries d where d.user_id=u and d.relic_id=r.id),
  'owned',coalesce(d.quantity,0)>0,'quantity',coalesce(d.quantity,0)) order by r.effect_kind,r.effect_value,r.id),'[]'::jsonb)
 into originals from public.fishing_relics r left join app_private.player_fishing_relics d on d.user_id=u and d.relic_id=r.id where r.enabled;
 select coalesce(jsonb_agg(jsonb_build_object('id',c.id,'name',a.name||' · '||b.name,
  'description',a.description||' / '||b.description,'rarity',greatest(a.rarity,b.rarity),'thumbnail_path',a.thumbnail_path,
  'attached',jsonb_build_object('id',b.id,'name',b.name,'thumbnail_path',b.thumbnail_path),
  'crafted',true,'owned',true,'discovered',true,'quantity',1,'sell_price',0,
  'effect_kind',a.effect_kind,'effect_value',a.effect_value,
  'effects',jsonb_build_array(jsonb_build_object('kind',a.effect_kind,'value',a.effect_value),jsonb_build_object('kind',b.effect_kind,'value',b.effect_value))) order by c.created_at,c.id),'[]'::jsonb)
 into composites from app_private.crafted_relics c join public.fishing_relics a on a.id=c.base_id join public.fishing_relics b on b.id=c.attached_id
 where c.user_id=u and a.enabled and b.enabled;
 return jsonb_build_object('equippedId',(select coalesce(crafted_id,relic_id) from app_private.player_relic_loadouts where user_id=u),
  'changeFee',500,'equipFee',0,'unequipFee',500,'canCraft',app_private.notice_is_operator(),'relics',originals||composites);
end$$;

create or replace function app_private.equip_relic(p_relic_id text,p_operation_id uuid,p_expected_fee integer default null) returns jsonb
language plpgsql security definer set search_path='' as $$
declare u uuid:=auth.uid();w public.player_wallets;prev public.gold_transactions;current_id text;fee integer;item text;
 fuel_limit integer:=4;bait_limit integer:=4;candidate jsonb;is_crafted boolean;
begin
 if u is null then raise exception 'AUTH_REQUIRED';end if;
 if p_operation_id is null then raise exception 'INVALID_OPERATION';end if;
 perform app_private.get_gold_wallet();select * into strict w from public.player_wallets where user_id=u for update;
 item:='relic-loadout:'||coalesce(p_relic_id,'unequip');
 select * into prev from public.gold_transactions where user_id=u and operation_id=p_operation_id;
 if found then
  if prev.action<>'buy' or prev.item_id is distinct from item or (p_expected_fee is not null and prev.delta<>-p_expected_fee) then raise exception 'OPERATION_CONFLICT';end if;
  return app_private.relic_state()||jsonb_build_object('replayed',true);
 end if;
 select coalesce(crafted_id,relic_id) into current_id from app_private.player_relic_loadouts where user_id=u;
 if current_id is not distinct from p_relic_id then raise exception 'RELIC_ALREADY_EQUIPPED';end if;
 if p_relic_id is not null then
  select r into candidate from jsonb_array_elements(app_private.relic_state()->'relics') r where r->>'id'=p_relic_id and (r->>'owned')::boolean;
  if candidate is null then raise exception 'RELIC_NOT_OWNED';end if;
  is_crafted:=coalesce((candidate->>'crafted')::boolean,false);
  if is_crafted and not app_private.notice_is_operator() then raise exception 'OPERATOR_REQUIRED';end if;
  if is_crafted then
   select 4+coalesce(sum((e->>'value')::integer) filter(where e->>'kind'='fuel_active_slots'),0),
          4+coalesce(sum((e->>'value')::integer) filter(where e->>'kind'='bait_active_slots'),0)
   into fuel_limit,bait_limit from jsonb_array_elements(candidate->'effects') e;
  else
   fuel_limit:=4+case when candidate->>'effect_kind'='fuel_active_slots' then (candidate->>'effect_value')::integer else 0 end;
   bait_limit:=4+case when candidate->>'effect_kind'='bait_active_slots' then (candidate->>'effect_value')::integer else 0 end;
  end if;
 end if;
 if app_private.production_active_count()>fuel_limit then raise exception 'RELIC_FUEL_PRODUCTION_ACTIVE:%',fuel_limit;end if;
 if app_private.bait_production_active_count()>bait_limit then raise exception 'RELIC_BAIT_PRODUCTION_ACTIVE:%',bait_limit;end if;
 fee:=case when current_id is not null then 500 else 0 end;
 if p_expected_fee is not null and p_expected_fee<>fee then raise exception 'RELIC_LOADOUT_CHANGED';end if;
 if w.gold<fee then raise exception 'INSUFFICIENT_GOLD';end if;
 if p_relic_id is null then delete from app_private.player_relic_loadouts where user_id=u;
 else
  insert into app_private.player_relic_loadouts(user_id,relic_id,crafted_id)
   values(u,case when not is_crafted then p_relic_id end,case when is_crafted then p_relic_id end)
   on conflict(user_id) do update set relic_id=excluded.relic_id,crafted_id=excluded.crafted_id;
 end if;
 update public.player_wallets set gold=gold-fee,updated_at=clock_timestamp() where user_id=u;
 insert into public.gold_transactions(user_id,operation_id,action,item_id,delta) values(u,p_operation_id,'buy',item,-fee);
 return app_private.relic_state()||jsonb_build_object('replayed',false);
end$$;

create function app_private.craft_relic(p_base_id text,p_attached_id text,p_operation_id uuid) returns jsonb
language plpgsql security definer set search_path='' as $$
declare u uuid:=auth.uid();a public.fishing_relics;b public.fishing_relics;w public.player_wallets;
 previous app_private.relic_craft_operations;cost integer;chance integer;score integer;success boolean;
 consumed text;crafted text;item text;result jsonb;equipped text;
begin
 if u is null then raise exception 'AUTH_REQUIRED';end if;
 if not app_private.notice_is_operator() then raise exception 'OPERATOR_REQUIRED';end if;
 if p_operation_id is null or p_base_id is null or p_attached_id is null then raise exception 'INVALID_OPERATION';end if;
 perform app_private.get_gold_wallet();select * into strict w from public.player_wallets where user_id=u for update;
 select * into previous from app_private.relic_craft_operations where user_id=u and operation_id=p_operation_id;
 if found then
  if previous.base_id<>p_base_id or previous.attached_id<>p_attached_id then raise exception 'OPERATION_CONFLICT';end if;
  return app_private.relic_state()||jsonb_build_object('craft',previous.result,'replayed',true);
 end if;
 if exists(select 1 from public.gold_transactions where user_id=u and operation_id=p_operation_id) then raise exception 'OPERATION_CONFLICT';end if;
 select * into a from public.fishing_relics where id=p_base_id and enabled;
 select * into b from public.fishing_relics where id=p_attached_id and enabled;
 if a.id is null or b.id is null then raise exception 'RELIC_ORIGINAL_REQUIRED';end if;
 if a.effect_kind=b.effect_kind then raise exception 'RELIC_SAME_EFFECT';end if;
 if a.rarity not in('rare','epic','mythic') or b.rarity not in('rare','epic','mythic') then raise exception 'RELIC_ORIGINAL_REQUIRED';end if;
 perform 1 from app_private.player_fishing_relics where user_id=u and relic_id in(a.id,b.id) order by relic_id for update;
 select relic_id into equipped from app_private.player_relic_loadouts where user_id=u;
 if exists(select 1 from (values(a.id),(b.id)) materials(id) where
  coalesce((select quantity from app_private.player_fishing_relics where user_id=u and relic_id=materials.id),0)
  <=case when equipped=materials.id then 1 else 0 end) then raise exception 'RELIC_MATERIAL_UNAVAILABLE';end if;
 score:=case a.rarity when 'rare' then 1 when 'epic' then 2 else 3 end+case b.rarity when 'rare' then 1 when 'epic' then 2 else 3 end;
 cost:=case when score<=3 then 3000 when score=4 then 4000 else 5000 end;
 chance:=case when score<=3 then 45 when score=4 then 40 else 35 end;
 if w.gold<cost then raise exception 'INSUFFICIENT_GOLD';end if;
 success:=random()*100<chance;
 if success then
  insert into app_private.crafted_relics(user_id,base_id,attached_id) values(u,a.id,b.id) returning id into crafted;
 else
  consumed:=case when a.rarity<b.rarity then a.id when b.rarity<a.rarity then b.id when random()<0.5 then a.id else b.id end;
 end if;
 -- Never delete an equipped original; the availability check reserves its copy.
 delete from app_private.player_fishing_relics where user_id=u and relic_id in(a.id,b.id) and quantity=1 and (success or relic_id=consumed);
 update app_private.player_fishing_relics set quantity=quantity-1 where user_id=u and relic_id in(a.id,b.id) and (success or relic_id=consumed);
 insert into app_private.player_fishing_relic_discoveries(user_id,relic_id) values(u,a.id),(u,b.id) on conflict do nothing;
 update public.player_wallets set gold=gold-cost,updated_at=clock_timestamp() where user_id=u;
 item:='relic-craft:'||a.id||':'||b.id;
 insert into public.gold_transactions(user_id,operation_id,action,item_id,delta) values(u,p_operation_id,'buy',item,-cost);
 result:=jsonb_build_object('success',success,'cost',cost,'chance',chance,'consumedId',consumed,'craftedId',crafted);
 insert into app_private.relic_craft_operations(user_id,operation_id,base_id,attached_id,result) values(u,p_operation_id,a.id,b.id,result);
 return app_private.relic_state()||jsonb_build_object('craft',result,'replayed',false);
end$$;
revoke all on function app_private.craft_relic(text,text,uuid) from public,anon,authenticated;
grant execute on function app_private.craft_relic(text,text,uuid) to authenticated;
create function public.craft_relic(p_base_id text,p_attached_id text,p_operation_id uuid) returns jsonb
language sql set search_path='' as $$select app_private.craft_relic(p_base_id,p_attached_id,p_operation_id)$$;
revoke all on function public.craft_relic(text,text,uuid) from public,anon,authenticated;
grant execute on function public.craft_relic(text,text,uuid) to authenticated;

-- Keep both interactive and scheduled auto-claim aware of composites.
CREATE OR REPLACE FUNCTION app_private.auto_claim_production(p_user uuid)
 RETURNS integer
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''
AS $function$
declare w public.player_wallets; run record; equipped text; items jsonb;
 stamp timestamptz; claim_time timestamptz; count_claimed integer:=0; next_count bigint;
 fuel_count bigint:=0; bait_count bigint:=0; summary text;
begin
 if p_user is null or not exists (
  select 1 from app_private.equipped_relic_effects(p_user) r where r.effect_kind='production_auto_claim' and r.effect_value=1
 ) then return 0; end if;
 select * into w from public.player_wallets where user_id=p_user for update skip locked;
 if not found then return 0; end if;
 select r.relic_id into equipped from app_private.equipped_relic_effects(p_user) r where r.effect_kind='production_auto_claim' and r.effect_value=1;
 if equipped is null then return 0; end if;
 stamp:=clock_timestamp(); items:=w.inventory;
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
    and started_at=run.started_at and expires_at>clock_timestamp() for update skip locked;
  else
   perform 1 from app_private.bait_production_sites where id=run.id and user_id=p_user
    and started_at=run.started_at and expires_at>clock_timestamp() for update skip locked;
  end if;
  if not found then continue; end if;
  claim_time:=clock_timestamp();
  if claim_time>=run.expires_at then continue; end if;
  insert into app_private.production_auto_claims(user_id,kind,site_id,started_at,completed_at,claimed_at,item_id,amount,relic_id)
  values(p_user,run.kind,run.id,run.started_at,run.completes_at,claim_time,run.item_id,run.run_output,equipped)
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
  update public.player_wallets set inventory=items,updated_at=clock_timestamp() where user_id=p_user;
  summary:=concat_ws(' · ',case when fuel_count>0 then '연료 '||fuel_count||'개' end,case when bait_count>0 then '미끼 '||bait_count||'개' end);
  insert into public.notifications(recipient_id,category,kind,title,body,production_auto_claim)
  values(p_user,'general','system','수확종이 생산물을 챙겼어요',summary||'를 자동으로 수령했어요. 생산소에서 다음 생산을 시작할 수 있어요.',true);
 end if;
 return count_claimed;
end $function$
;
CREATE OR REPLACE FUNCTION app_private.auto_claim_due_production()
 RETURNS integer
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''
AS $function$
declare owner_id uuid; n integer:=0; stamp timestamptz:=clock_timestamp();
begin
 for owner_id in
  select w.user_id from public.player_wallets w
  join lateral app_private.equipped_relic_effects(w.user_id) r on r.effect_kind='production_auto_claim' and r.effect_value=1
  where exists(select 1 from app_private.production_sites s where s.user_id=w.user_id and s.started_at is not null and s.completes_at<=stamp and s.expires_at>stamp
   and coalesce((w.inventory->>'fuel')::bigint,0)+s.run_output<=1000000000)
   or exists(select 1 from app_private.bait_production_sites s where s.user_id=w.user_id and s.started_at is not null and s.completes_at<=stamp and s.expires_at>stamp
   and coalesce((w.inventory->>s.run_bait_id)::bigint,0)+s.run_output<=1000000000)
  order by w.user_id limit 200 for update of w skip locked
 loop
  n:=n+app_private.auto_claim_production(owner_id);
 end loop;
 return n;
end $function$
;
