-- Generated from supabase/catalog/catalog.json. Review before migration deployment.
begin;
set local lock_timeout='5s';
alter table public.harbor_vessels add column catch_rule jsonb;

-- Freeze the current rules of every unclaimed voyage before changing catalogs.
-- Keep all original snapshot fields, fuel paid and return times untouched.
lock table public.harbor_voyages in share row exclusive mode;
update public.harbor_voyages trip
set vessel_snapshot=trip.vessel_snapshot||jsonb_build_object('catch_rule',jsonb_build_object(
 'version',1,'success_bp',app_private.expedition_success_chance_bp(b.id,0),
 'common_bp',b.common_bp,'rare_bp',b.rare_bp,'epic_bp',b.epic_bp,'mythic_bp',b.mythic_bp,
 'kind',case when b.id='bait_first_greeting' then 'discovery_only' when b.id='bait_grubby_magnet' then 'trash_only'
  when b.effect_kind='decoration' then 'decoration' else 'mixed' end,
 'trash_bp',10000,'discovery_weight',1,
 'home_multiplier',case when coalesce((trip.vessel_snapshot->>'native_bonus')::boolean,false) then 1.5 else 1 end))
from public.fishing_baits b
where trip.claimed_at is null and not trip.vessel_snapshot?'catch_rule'
 and b.id=coalesce(trip.vessel_snapshot->>'catch_bait_id','bait');
do $$begin
 if exists(select 1 from public.harbor_voyages where claimed_at is null and not vessel_snapshot?'catch_rule') then
  raise exception 'UNRECOGNIZED_LEGACY_HARBOR_RULE';
 end if;
end $$;

create function app_private.harbor_draw(p_region text,p_rule jsonb)
returns text language plpgsql volatile set search_path='' as $$
declare r public.game_rarity;roll integer;v_kind text:=p_rule->>'kind';wanted text;ids text[];
 fallback boolean:=false;sid text;
begin
 if auth.uid() is null then raise exception 'AUTH_REQUIRED';end if;
 if random()*10000>=(p_rule->>'success_bp')::integer then return null;end if;
 roll:=floor(random()*10000)::integer;
 r:=case when roll<(p_rule->>'mythic_bp')::integer then 'mythic'::public.game_rarity
  when roll<(p_rule->>'mythic_bp')::integer+(p_rule->>'epic_bp')::integer then 'epic'::public.game_rarity
  when roll<(p_rule->>'mythic_bp')::integer+(p_rule->>'epic_bp')::integer+(p_rule->>'rare_bp')::integer then 'rare'::public.game_rarity
  else 'common'::public.game_rarity end;
 if v_kind='trash_weighted' then
  wanted:=case when random()*10000<(p_rule->>'trash_bp')::integer then 'trash' else 'fish' end;
 end if;
 select array_agg(s.id order by s.id) into ids from public.collectible_species s
 where s.rarity=r and case v_kind
  when 'decoration' then s.kind='decoration'
  when 'trash_only' then s.kind='trash'
  when 'trash_weighted' then s.kind::text=wanted
  when 'discovery_only' then s.kind in('fish','trash','decoration') and not exists(
   select 1 from public.player_discoveries d where d.user_id=auth.uid() and d.species_id=s.id)
  when 'discovery_weighted' then s.kind in('fish','trash','decoration')
  else s.kind in('fish','trash') end;
 -- Preserve legacy specialty fallback rules. New mixed-kind boats only
 -- renormalize a missing kind within the same grade, never upgrade the grade.
 if ids is null and v_kind='trash_weighted' then
  select array_agg(s.id order by s.id) into ids from public.collectible_species s where s.rarity=r and s.kind in('fish','trash');
 elsif ids is null and v_kind in('trash_only','discovery_only') then
  fallback:=true;
  select array_agg(s.id order by s.id) into ids from public.collectible_species s where
   case when v_kind='trash_only' then s.kind='trash' else s.kind in('fish','trash','decoration')
    and not exists(select 1 from public.player_discoveries d where d.user_id=auth.uid() and d.species_id=s.id) end;
 end if;
 if ids is null then
  if v_kind='discovery_only' then return null;end if;
  raise exception 'NO_COLLECTIBLE_FOR_REGION';
 end if;
 -- Independent habitat picker: future bait/rod helper changes cannot leak in.
 with candidates as materialized(
  select s.id,s.rarity,
   case when not s.is_native then 'shared' when s.native_region_id=p_region then 'home' else 'away' end bucket,
   case when v_kind='discovery_weighted' and not exists(select 1 from public.player_discoveries d where d.user_id=auth.uid() and d.species_id=s.id)
    then (p_rule->>'discovery_weight')::numeric else 1 end discovery_weight
  from public.collectible_species s where s.id=any(ids)
 ),groups as materialized(select distinct bucket from candidates),selected as materialized(
  select bucket from groups order by -ln(greatest(random(),1e-15))/case bucket
   when 'home' then 35*(p_rule->>'home_multiplier')::numeric when 'shared' then 60 else 5 end,bucket limit 1
 )select c.id into sid from candidates c join selected g using(bucket)
 order by -ln(greatest(random(),1e-15))/(c.discovery_weight*case when fallback then
  case c.rarity when 'common' then 7700 when 'rare' then 2000 when 'epic' then 270 else 30 end else 1 end),c.id limit 1;
 return sid;
end $$;
revoke all on function app_private.harbor_draw(text,jsonb) from public,anon,authenticated;

create function app_private.snapshot_harbor_catch_rule()
returns trigger language plpgsql security definer set search_path='' as $$
declare rule jsonb;
begin
 select catch_rule into strict rule from public.harbor_vessels where id=new.vessel_id;
 if rule is null then raise exception 'HARBOR_RULE_REQUIRED';end if;
 new.vessel_snapshot:=jsonb_set(new.vessel_snapshot,'{catch_rule}',rule);
 return new;
end $$;
revoke all on function app_private.snapshot_harbor_catch_rule() from public,anon,authenticated;
create trigger harbor_catch_rule_snapshot before insert on public.harbor_voyages
for each row execute function app_private.snapshot_harbor_catch_rule();

set constraints all deferred;
insert into public.harbor_vessels ("id","name","price","duration_minutes","fuel_cost","fishing_count","sprite_path","sort_order","fishing_count_max","catch_bait_id","native_bonus","catch_rule") values
('billow-rider','너울타기 어선',1600,360,5,12,'/port/billow-rider-sprite.png',9,24,'bait',false,'{"version":2,"success_bp":3500,"common_bp":8320,"rare_bp":1500,"epic_bp":150,"mythic_bp":30,"kind":"mixed","trash_bp":7000,"discovery_weight":1,"home_multiplier":1}'::jsonb),
('conch-explorer','소라빛 탐사선',2200,420,6,5,'/port/conch-explorer-sprite.png',13,null,'bait_first_greeting',false,'{"version":2,"success_bp":5000,"common_bp":8320,"rare_bp":1500,"epic_bp":150,"mythic_bp":30,"kind":"discovery_weighted","trash_bp":7000,"discovery_weight":2,"home_multiplier":1}'::jsonb),
('current-rider','물살타기 낚시보트',700,15,1,4,'/port/current-rider-sprite.png',11,null,'bait',false,'{"version":2,"success_bp":3500,"common_bp":8320,"rare_bp":1500,"epic_bp":150,"mythic_bp":30,"kind":"mixed","trash_bp":7000,"discovery_weight":1,"home_multiplier":1}'::jsonb),
('fishing-drone','낚시용 드론',800,60,1,4,'/port/fishing-drone-sprite.png',2,5,'bait',false,'{"version":2,"success_bp":3500,"common_bp":8320,"rare_bp":1500,"epic_bp":150,"mythic_bp":30,"kind":"mixed","trash_bp":7000,"discovery_weight":1,"home_multiplier":1}'::jsonb),
('fishing-raft','낚시용 뗏목',400,40,0,2,'/port/fishing-raft-sprite.png',1,null,'bait',false,'{"version":2,"success_bp":3500,"common_bp":8320,"rare_bp":1500,"epic_bp":150,"mythic_bp":30,"kind":"mixed","trash_bp":7000,"discovery_weight":1,"home_multiplier":1}'::jsonb),
('golden-luck','행운의 금빛어선',2500,480,7,18,'/port/golden-luck-sprite.png',10,32,'bait',false,'{"version":2,"success_bp":3500,"common_bp":8320,"rare_bp":1500,"epic_bp":150,"mythic_bp":30,"kind":"mixed","trash_bp":7000,"discovery_weight":1,"home_multiplier":1}'::jsonb),
('haeneomi-trawler','해넘이 원양어선',1500,480,9,28,'/port/haeneomi-trawler-sprite.png',4,null,'bait',false,'{"version":2,"success_bp":3500,"common_bp":8320,"rare_bp":1500,"epic_bp":150,"mythic_bp":30,"kind":"mixed","trash_bp":7000,"discovery_weight":1,"home_multiplier":1}'::jsonb),
('moonpearl-luxury','달빛진주 호화어선',3200,630,10,10,'/port/moonpearl-luxury-sprite.png',12,null,'bait_special',false,'{"version":2,"success_bp":7000,"common_bp":0,"rare_bp":9870,"epic_bp":100,"mythic_bp":30,"kind":"mixed","trash_bp":7000,"discovery_weight":1,"home_multiplier":1}'::jsonb),
('neoul-boat','너울 낚싯배',900,120,4,10,'/port/neoul-boat-sprite.png',3,null,'bait',false,'{"version":2,"success_bp":3500,"common_bp":8320,"rare_bp":1500,"epic_bp":150,"mythic_bp":30,"kind":"mixed","trash_bp":7000,"discovery_weight":1,"home_multiplier":1}'::jsonb),
('pearl-salvager','진주빛 인양선',1800,390,5,8,'/port/pearl-salvager-sprite.png',7,null,'bait_magnet',false,'{"version":2,"success_bp":5000,"common_bp":8320,"rare_bp":1500,"epic_bp":150,"mythic_bp":30,"kind":"decoration","trash_bp":7000,"discovery_weight":1,"home_multiplier":1}'::jsonb),
('scrap-gobbler','고철먹보 집게봇',1400,330,4,18,'/port/scrap-gobbler-sprite.png',8,null,'bait_grubby_magnet',false,'{"version":2,"success_bp":5000,"common_bp":8320,"rare_bp":1500,"epic_bp":150,"mythic_bp":30,"kind":"trash_weighted","trash_bp":7000,"discovery_weight":1,"home_multiplier":1}'::jsonb),
('starlit-cruiser','별잠 유람선',2200,900,9,30,'/port/starlit-cruiser-sprite.png',5,40,'bait',false,'{"version":2,"success_bp":3500,"common_bp":8320,"rare_bp":1500,"epic_bp":150,"mythic_bp":30,"kind":"mixed","trash_bp":7000,"discovery_weight":1,"home_multiplier":1}'::jsonb),
('waterway-explorer','물길잡이 탐사선',1600,240,4,10,'/port/waterway-explorer-sprite.png',6,null,'bait',true,'{"version":2,"success_bp":3500,"common_bp":8320,"rare_bp":1500,"epic_bp":150,"mythic_bp":30,"kind":"mixed","trash_bp":7000,"discovery_weight":1,"home_multiplier":1.5}'::jsonb)
on conflict(id) do update set "name"=excluded."name","price"=excluded."price","duration_minutes"=excluded."duration_minutes","fuel_cost"=excluded."fuel_cost","fishing_count"=excluded."fishing_count","sprite_path"=excluded."sprite_path","sort_order"=excluded."sort_order","fishing_count_max"=excluded."fishing_count_max","catch_bait_id"=excluded."catch_bait_id","native_bonus"=excluded."native_bonus","catch_rule"=excluded."catch_rule";
notify pgrst, 'reload schema';
alter table public.harbor_vessels alter column catch_rule set not null;
alter table public.harbor_vessels add constraint harbor_catch_rule_valid check(coalesce((
 jsonb_typeof(catch_rule)='object'
 and catch_rule ?& array['version','success_bp','common_bp','rare_bp','epic_bp','mythic_bp','kind','trash_bp','discovery_weight','home_multiplier']
 and (catch_rule->>'version')::integer=2
 and (catch_rule->>'success_bp')::integer between 0 and 10000
 and (catch_rule->>'common_bp')::integer between 0 and 10000 and (catch_rule->>'rare_bp')::integer between 0 and 10000
 and (catch_rule->>'epic_bp')::integer between 0 and 10000 and (catch_rule->>'mythic_bp')::integer between 0 and 10000
 and (catch_rule->>'common_bp')::integer+(catch_rule->>'rare_bp')::integer+(catch_rule->>'epic_bp')::integer+(catch_rule->>'mythic_bp')::integer=10000
 and catch_rule->>'kind' in('mixed','trash_weighted','decoration','discovery_weighted')
 and (catch_rule->>'trash_bp')::integer between 0 and 10000
 and (catch_rule->>'discovery_weight')::numeric>=1 and (catch_rule->>'home_multiplier')::numeric>0
),false));
comment on column public.harbor_vessels.catch_rule is 'Independent boat catch distribution, snapshotted at departure. Never read the live bait catalog when settling.';
CREATE OR REPLACE FUNCTION app_private.settle_legacy_harbor(p_action text, p_operation_id uuid, p_vessel_id text DEFAULT NULL::text, p_voyage_id uuid DEFAULT NULL::uuid, p_quantity integer DEFAULT 1)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''
AS $function$
declare u uuid:=auth.uid();v public.harbor_vessels;w public.player_wallets;trip public.harbor_voyages;
 prev app_private.harbor_operations;sig jsonb;receipt jsonb;fuel integer;cost integer;sid text;item uuid;i integer;purchase_at timestamptz;
 results jsonb:='[]'::jsonb;items jsonb;failed integer;attempts integer;claimed integer:=0;
begin
 if u is null then raise exception 'AUTH_REQUIRED';end if;
 if p_operation_id is null or p_action is null or p_action not in ('buy','fuel','depart','arrive','claim','claim_all') then raise exception 'INVALID_HARBOR_ACTION';end if;
 sig:=jsonb_build_object('action',p_action,'vessel',p_vessel_id,'voyage',p_voyage_id,'quantity',p_quantity);
 perform pg_advisory_xact_lock(hashtextextended('harbor:'||u::text,0));
 select * into prev from app_private.harbor_operations where user_id=u and operation_id=p_operation_id;
 if found then
  if prev.signature<>sig then raise exception 'OPERATION_CONFLICT';end if;
  return app_private.harbor_state()||jsonb_build_object('receipt',prev.receipt,'replayed',true);
 end if;
 perform app_private.get_gold_wallet();
 select * into w from public.player_wallets where user_id=u for update;
 fuel:=coalesce((w.inventory->>'fuel')::integer,0);purchase_at:=clock_timestamp();
 if p_action in ('buy','depart') then
  select * into v from public.harbor_vessels where id=p_vessel_id;
  if not found then raise exception 'VESSEL_NOT_FOUND';end if;
 end if;
 if p_action='buy' then
  if exists(select 1 from public.player_harbor_vessels where user_id=u and vessel_id=v.id) then raise exception 'VESSEL_ALREADY_OWNED';end if;
  if w.gold<v.price then raise exception 'INSUFFICIENT_GOLD';end if;
  insert into public.player_harbor_vessels(user_id,vessel_id) values(u,v.id);
  update public.player_wallets set gold=gold-v.price,updated_at=now() where user_id=u;
  insert into public.gold_transactions(user_id,operation_id,action,item_id,delta) values(u,p_operation_id,'buy','harbor-vessel:'||v.id,-v.price);
  receipt:=jsonb_build_object('action','buy','vesselId',v.id);
 elsif p_action='fuel' then
  if p_quantity is null or p_quantity<1 or p_quantity>5 or fuel>100000-p_quantity then raise exception 'INVALID_QUANTITY';end if;
  if coalesce((select sum((op.receipt->>'quantity')::integer) from app_private.harbor_operations op
   where op.user_id=u and op.receipt->>'action'='fuel' and op.created_at>=((purchase_at at time zone 'Asia/Seoul')::date::timestamp at time zone 'Asia/Seoul')),0)+p_quantity>5 then raise exception 'FUEL_DAILY_LIMIT';end if;
  cost:=p_quantity*60;
  if w.gold<cost then raise exception 'INSUFFICIENT_GOLD';end if;
  update public.player_wallets set gold=gold-cost,inventory=jsonb_set(inventory,'{fuel}',to_jsonb(fuel+p_quantity)),updated_at=now() where user_id=u;
  insert into public.gold_transactions(user_id,operation_id,action,item_id,delta) values(u,p_operation_id,'buy','fuel:'||p_quantity,-cost);
  receipt:=jsonb_build_object('action','fuel','quantity',p_quantity);
 elsif p_action='depart' then
  if not exists(select 1 from public.player_harbor_vessels where user_id=u and vessel_id=v.id) then raise exception 'VESSEL_NOT_OWNED';end if;
  if exists(select 1 from public.harbor_voyages where user_id=u and vessel_id=v.id and claimed_at is null) then raise exception 'VOYAGE_ACTIVE';end if;
  if fuel<v.fuel_cost then raise exception 'INSUFFICIENT_FUEL';end if;
  update public.player_wallets set inventory=jsonb_set(inventory,'{fuel}',to_jsonb(fuel-v.fuel_cost)),updated_at=now() where user_id=u;
  insert into public.harbor_voyages(user_id,vessel_id,vessel_snapshot,returns_at)
   values(u,v.id,to_jsonb(v),clock_timestamp()+make_interval(mins=>v.duration_minutes)) returning * into trip;
  receipt:=jsonb_build_object('action','depart','voyageId',trip.id,'vesselId',v.id);
 elsif p_action='arrive' then
  select * into trip from public.harbor_voyages where id=p_voyage_id and user_id=u for update;
  if not found then raise exception 'VOYAGE_NOT_FOUND';end if;
  if trip.returns_at>clock_timestamp() then raise exception 'VOYAGE_NOT_READY';end if;
  update public.harbor_voyages set arrival_seen_at=coalesce(arrival_seen_at,clock_timestamp()) where id=trip.id;
  receipt:=jsonb_build_object('action','arrive','voyageId',trip.id);
 else
  if p_action='claim' then
   select * into trip from public.harbor_voyages where id=p_voyage_id and user_id=u;
   if not found then raise exception 'VOYAGE_NOT_FOUND';end if;
   if trip.claimed_at is not null then
    receipt:=jsonb_build_object('action','claim','results',jsonb_build_array(trip.result));
   elsif trip.returns_at>clock_timestamp() then raise exception 'VOYAGE_NOT_READY';end if;
  end if;
  if receipt is null then
   for trip in select * from public.harbor_voyages where user_id=u and claimed_at is null and returns_at<=clock_timestamp()
    and (p_action='claim_all' or id=p_voyage_id) order by id for update loop
    items:='[]'::jsonb;failed:=0;attempts:=(trip.vessel_snapshot->>'fishing_count')::integer;
    for i in 1..attempts loop
     sid:=app_private.harbor_draw(trip.region_id,trip.vessel_snapshot->'catch_rule');
     if sid is not null then
      insert into public.player_collectibles(user_id,species_id) values(u,sid) returning id into item;
      insert into public.player_discoveries(user_id,species_id) values(u,sid) on conflict do nothing;
      items:=items||jsonb_build_array(jsonb_build_object('id',item,'firstDiscovery',coalesce((select evidence.first_discovery from app_private.title_acquisition_evidence evidence where evidence.collectible_id=item and evidence.user_id=u),false),'species',app_private.species_payload(sid,null),'bonus',false));
     else failed:=failed+1;end if;
    end loop;
    update public.harbor_voyages set claimed_at=clock_timestamp(),arrival_seen_at=coalesce(arrival_seen_at,clock_timestamp()),
     result=jsonb_build_object('voyageId',trip.id,'regionId',trip.region_id,'regionName',(select name from public.regions where id=trip.region_id),'vesselName',trip.vessel_snapshot->>'name','items',items,'attempted',attempts,'failed',failed,'succeeded',jsonb_array_length(items)) where id=trip.id returning result into receipt;
    results:=results||jsonb_build_array(receipt);claimed:=claimed+1;
   end loop;
   receipt:=jsonb_build_object('action',p_action,'results',results,'claimed',claimed);
  end if;
 end if;
 insert into app_private.harbor_operations(user_id,operation_id,signature,receipt,created_at) values(u,p_operation_id,sig,receipt,purchase_at);
 return app_private.harbor_state()||jsonb_build_object('receipt',receipt,'replayed',false);
end $function$
;
commit;
