-- Snapshot economic relic effects at cast preparation and savings enrollment.
alter table public.fishing_relics drop constraint relic_effect_shape;
alter table public.fishing_relics add constraint relic_effect_shape check (((((effect_kind = 'none'::text) AND (effect_value = (0)::numeric)) OR ((effect_kind = ANY (ARRAY['fuel_active_slots'::text, 'bait_active_slots'::text])) AND (((rarity = 'epic'::game_rarity) AND (effect_value = (1)::numeric)) OR ((rarity = 'mythic'::game_rarity) AND (effect_value = (2)::numeric)))) OR ((effect_kind = 'personal_bait_hours'::text) AND (((rarity = 'rare'::game_rarity) AND (effect_value = (2)::numeric)) OR ((rarity = 'epic'::game_rarity) AND (effect_value = (4)::numeric)) OR ((rarity = 'mythic'::game_rarity) AND (effect_value = (8)::numeric)))) OR ((effect_kind = 'fishing_wait_seconds'::text) AND (((rarity = 'rare'::game_rarity) AND (effect_value = 0.5)) OR ((rarity = 'epic'::game_rarity) AND (effect_value = (1)::numeric)) OR ((rarity = 'mythic'::game_rarity) AND (effect_value = (2)::numeric)))) OR ((effect_kind = 'trap_seconds_per_bait'::text) AND (((rarity = 'rare'::game_rarity) AND (effect_value = (30)::numeric)) OR ((rarity = 'epic'::game_rarity) AND (effect_value = (90)::numeric)) OR ((rarity = 'mythic'::game_rarity) AND (effect_value = (180)::numeric)))) OR ((effect_kind = 'boat_discount_gold'::text) AND (((rarity = 'rare'::game_rarity) AND (effect_value = (50)::numeric)) OR ((rarity = 'epic'::game_rarity) AND (effect_value = (150)::numeric)) OR ((rarity = 'mythic'::game_rarity) AND (effect_value = (400)::numeric)))) OR ((effect_kind = 'bait_discount_gold'::text) AND (((rarity = 'epic'::game_rarity) AND (effect_value = (1)::numeric)) OR ((rarity = 'mythic'::game_rarity) AND (effect_value = (2)::numeric)))) OR ((effect_kind = 'harbor_duration_percent'::text) AND (((rarity = 'rare'::game_rarity) AND (effect_value = (3)::numeric)) OR ((rarity = 'epic'::game_rarity) AND (effect_value = (6)::numeric)) OR ((rarity = 'mythic'::game_rarity) AND (effect_value = (10)::numeric)))) OR ((effect_kind = 'production_auto_claim'::text) AND (rarity = 'epic'::game_rarity) AND (effect_value = (1)::numeric)) OR ((effect_kind = 'pongi_whack_golden_count'::text) AND (((rarity = 'rare'::game_rarity) AND (effect_value = (2)::numeric)) OR ((rarity = 'epic'::game_rarity) AND (effect_value = (4)::numeric)) OR ((rarity = 'mythic'::game_rarity) AND (effect_value = (10)::numeric)))) OR ((effect_kind = 'direct_relic_chance_percent'::text) AND (((rarity = 'rare'::game_rarity) AND (effect_value = (1)::numeric)) OR ((rarity = 'epic'::game_rarity) AND (effect_value = (3)::numeric)) OR ((rarity = 'mythic'::game_rarity) AND (effect_value = (6)::numeric)))) OR ((effect_kind = 'direct_map_chance_percent'::text) AND (((rarity = 'rare'::game_rarity) AND (effect_value = 0.5)) OR ((rarity = 'epic'::game_rarity) AND (effect_value = (2)::numeric)) OR ((rarity = 'mythic'::game_rarity) AND (effect_value = (5)::numeric))))))
 or (effect_kind='bait_refund_percent' and ((rarity='rare' and effect_value=1) or (rarity='epic' and effect_value=3) or (rarity='mythic' and effect_value=5)))
 or (effect_kind='savings_interest_bonus_percent' and ((rarity='rare' and effect_value=2) or (rarity='epic' and effect_value=5) or (rarity='mythic' and effect_value=10))));
alter table public.shell_savings add column relic_bonus_percent integer not null default 0 check (relic_bonus_percent in (0,2,5,10));
CREATE OR REPLACE FUNCTION app_private.prepare_discovery_cast(p_region_id text, p_bait_id text, p_operation_id uuid, p_confirm_bite boolean, p_discovery boolean)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''
AS $function$
declare v_uid uuid:=auth.uid();p app_private.prepared_fishing_casts;w public.player_wallets;
 v_current text;v_required boolean;v_count integer;v_profile jsonb;v_started timestamptz;v_wait numeric;
 v_rarity public.game_rarity;v_species text;v_snapshot jsonb;v_reduction integer;
 v_roll double precision;v_category text;v_reward record;v_map text;v_piece integer;v_relic text;
begin
 if v_uid is null then raise exception 'AUTH_REQUIRED';end if;
 if p_operation_id is null or p_confirm_bite is null then raise exception 'INVALID_TRADE';end if;
 perform pg_advisory_xact_lock(hashtextextended('region:'||v_uid::text,0));
 select * into p from app_private.prepared_fishing_casts where user_id=v_uid and operation_id=p_operation_id;
 if found then
  if p.region_id<>p_region_id or p.bait_id<>p_bait_id then raise exception 'OPERATION_CONFLICT';end if;
  return app_private.prepared_fishing_payload(p);
 end if;
 if exists(select 1 from public.fishing_attempts where user_id=v_uid and operation_id=p_operation_id) then raise exception 'OPERATION_CONFLICT';end if;
 select * into p from app_private.prepared_fishing_casts where user_id=v_uid and finished_at is null;
 if found then
  if p.expires_at<=clock_timestamp() then perform app_private.finish_fishing(p.operation_id,false);
  else return app_private.prepared_fishing_payload(p);end if;
 end if;
 perform app_private.get_gold_wallet();
 select * into w from public.player_wallets where user_id=v_uid for update;
 if not exists(select 1 from public.fishing_baits where id=p_bait_id) then raise exception 'INVALID_BAIT';end if;
 select requires_map_fragment into v_required from public.regions where id=p_region_id;
 if not found then raise exception 'REGION_NOT_FOUND';end if;
 select region_id into v_current from public.player_navigation where user_id=v_uid;
 if v_current is distinct from p_region_id then raise exception 'NOT_IN_REGION';end if;
 if v_required and not exists(select 1 from public.player_map_fragments where user_id=v_uid and region_id=p_region_id) then raise exception 'REGION_LOCKED';end if;
 v_count:=coalesce((w.inventory->>p_bait_id)::integer,0);
 if v_count<1 then raise exception 'NO_BAIT';end if;
 -- Keep the exhausted discovery bait refusal before every random draw. Moving
 -- it after the category roll would permit unlimited free map/relic rerolls.
 if p_bait_id='bait_first_greeting' and not exists(select 1 from public.collectible_species s
  where app_private.collectible_available_at(s.id,statement_timestamp()) and s.kind in ('fish','trash','decoration')
  and not exists(select 1 from public.player_discoveries d where d.user_id=v_uid and d.species_id=s.id)) then
  raise exception 'ALL_COLLECTIBLES_DISCOVERED';
 end if;
 v_started:=clock_timestamp();
 v_profile:=app_private.fishing_bait_balance_at(p_bait_id,v_started);
 v_rarity:=app_private.profile_fishing_rarity(v_profile);
 -- Grade-specific disjoint category ranges; absent categories return to the ordinary
 -- pool without increasing the other discovery category's chance.
 v_category:='ordinary';
 if p_discovery then
  v_roll:=random();
  v_category:=app_private.fishing_reward_category(v_roll,v_rarity);
 end if;
 if v_category<>'ordinary' then
  select * into v_reward from app_private.fishing_discovery_candidates(v_rarity)
  where category=v_category order by random() limit 1;
  if found then
   if v_category='map' then
    v_map:=v_reward.region_id;v_piece:=v_reward.piece_number;
    v_snapshot:=app_private.fishing_map_piece_payload(v_map,v_piece,v_uid);
   else
    v_relic:=v_reward.reward_id;v_snapshot:=app_private.fishing_relic_payload(v_relic);
   end if;
  end if;
 end if;
 if v_snapshot is null then
  v_species:=app_private.pick_profile_collectible(p_region_id,v_rarity,v_profile,true);
  if v_species is null then raise exception 'NO_COLLECTIBLE_FOR_REGION';end if;
  select rarity into v_rarity from public.collectible_species where id=v_species;
  v_snapshot:=app_private.species_payload(v_species,null);
 end if;
 select r.wait_reduction_seconds into v_reduction from public.player_rod_loadouts l
 join public.player_fishing_rods o on o.user_id=l.user_id and o.rod_id=l.equipped_rod_id
 join public.fishing_rods r on r.id=o.rod_id where l.user_id=v_uid;
 v_wait:=greatest(1,13+12*random()-coalesce(v_reduction,0)-app_private.relic_bonus('fishing_wait_seconds'));
 insert into app_private.prepared_fishing_casts(user_id,operation_id,region_id,bait_id,eligible,species_id,map_region_id,
  map_piece_number,relic_id,rarity,snapshot,wait_seconds,failure_at,failure_reason,created_at,expires_at,bait_snapshot,confirm_bite)
 values(v_uid,p_operation_id,p_region_id,p_bait_id,true,v_species,v_map,v_piece,v_relic,v_rarity,v_snapshot,v_wait,4.5,'bait',v_started,
  case when p_confirm_bite then v_started+interval '24 hours'
   else v_started+make_interval(secs=>v_wait::double precision)+interval '3 minutes' end,
  v_profile||jsonb_build_object('discovery_version',1,'relic_bait_refund_percent',least(5,greatest(0,app_private.relic_bonus('bait_refund_percent')))),p_confirm_bite) returning * into p;
 update public.player_wallets set inventory=jsonb_set(inventory,array[p_bait_id],to_jsonb(v_count-1)),updated_at=now() where user_id=v_uid;
 return app_private.prepared_fishing_payload(p);
end $function$
;
CREATE OR REPLACE FUNCTION app_private.finish_fishing(p_operation_id uuid, p_won boolean)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''
AS $function$
declare v_uid uuid:=auth.uid();p app_private.prepared_fishing_casts;a public.fishing_attempts;
 v_item uuid;v_success boolean;v_result jsonb;v_first boolean:=false;v_refunded boolean:=false;v_refund_chance numeric;
begin
 if v_uid is null then raise exception 'AUTH_REQUIRED';end if;
 if p_won is null then raise exception 'INVALID_RESULT';end if;
 perform pg_advisory_xact_lock(hashtextextended('region:'||v_uid::text,0));
 select * into p from app_private.prepared_fishing_casts where user_id=v_uid and operation_id=p_operation_id for update;
 if not found then raise exception 'CAST_NOT_FOUND';end if;
 if p.finished_at is not null then return p.result||jsonb_build_object('replayed',true);end if;
 if p_won and p.confirm_bite and p.fight_started_at is null then raise exception 'CAST_NOT_STARTED';end if;
 if p_won and clock_timestamp()<(case when p.fight_started_at is null
  then p.created_at+make_interval(secs=>p.wait_seconds::double precision+3)
  else p.fight_started_at+interval '3 seconds' end) then raise exception 'CAST_TOO_EARLY';end if;
 v_success:=p_won and p.eligible and clock_timestamp()<=p.expires_at;
 if v_success then
  if p.map_piece_number is not null then
   insert into app_private.player_fishing_map_pieces(user_id,region_id,piece_number)
    values(v_uid,p.map_region_id,p.map_piece_number) on conflict do nothing;
   v_first:=found;
   if not exists(select 1 from public.fishing_map_blueprints b cross join lateral generate_series(1,b.piece_count) n(piece_number)
    where b.region_id=p.map_region_id and not exists(select 1 from app_private.player_fishing_map_pieces f
     where f.user_id=v_uid and f.region_id=b.region_id and f.piece_number=n.piece_number)) then
    insert into public.player_map_fragments(user_id,region_id) values(v_uid,p.map_region_id) on conflict do nothing;
   end if;
   -- Capture real collected count after success, not the random piece number.
   p.snapshot:=p.snapshot||jsonb_build_object(
    'name',app_private.fishing_map_piece_payload(p.map_region_id,p.map_piece_number,v_uid)->>'name',
    'pieceFoundCount',(app_private.fishing_map_piece_payload(p.map_region_id,p.map_piece_number,v_uid)->>'pieceFoundCount')::integer);
  elsif p.relic_id is not null then
   -- Follow the same wallet -> ownership lock order as equipment and sales.
   perform app_private.get_gold_wallet();
   perform 1 from public.player_wallets where user_id=v_uid for update;
   insert into app_private.player_fishing_relics as owned(user_id,relic_id) values(v_uid,p.relic_id)
    on conflict(user_id,relic_id) do update set quantity=owned.quantity+1;
   insert into app_private.player_fishing_relic_discoveries(user_id,relic_id) values(v_uid,p.relic_id) on conflict do nothing;
   v_first:=found;
  else
   if p.map_region_id is not null then
    insert into public.player_map_fragments(user_id,region_id) values(v_uid,p.map_region_id) on conflict do nothing;
   end if;
   insert into public.player_collectibles(user_id,species_id,map_region_id) values(v_uid,p.species_id,p.map_region_id) returning id into v_item;
   insert into public.player_discoveries(user_id,species_id) values(v_uid,p.species_id) on conflict do nothing;
   v_first:=coalesce((select evidence.first_discovery from app_private.title_acquisition_evidence evidence
    where evidence.collectible_id=v_item and evidence.user_id=v_uid),false);
  end if;
 end if;
 -- Refund only a successful consumed cast; the persisted result makes retries inert.
 v_refund_chance:=least(5,greatest(0,coalesce((p.bait_snapshot->>'relic_bait_refund_percent')::numeric,0)));
 if v_success and v_refund_chance>0 and random()*100<v_refund_chance then
  perform app_private.get_gold_wallet();
  perform 1 from public.player_wallets where user_id=v_uid for update;
  update public.player_wallets set inventory=jsonb_set(inventory,array[p.bait_id],
   to_jsonb(coalesce((inventory->>p.bait_id)::integer,0)+1)),updated_at=clock_timestamp() where user_id=v_uid;
  v_refunded:=true;
 end if;
 -- Experience/title triggers read this immutable reward snapshot.
 update app_private.prepared_fishing_casts set snapshot=p.snapshot where user_id=v_uid and operation_id=p_operation_id;
 insert into public.fishing_attempts(user_id,operation_id,region_id,bait_id,rarity,collectible_id)
 values(v_uid,p.operation_id,p.region_id,p.bait_id,case when v_success then p.rarity end,v_item) returning * into a;
 v_result:=jsonb_build_object('attempt',to_jsonb(a)||jsonb_build_object('species',case when v_success then p.snapshot end,
 'firstDiscovery',v_first),'replayed',false,'baitRefunded',v_refunded,'refundedBaitId',case when v_refunded then p.bait_id end,'failure_reason',case when v_success then null when clock_timestamp()>p.expires_at
  then 'expired' when not p.eligible then p.failure_reason else 'minigame' end);
 update app_private.prepared_fishing_casts set finished_at=clock_timestamp(),result=v_result where user_id=v_uid and operation_id=p_operation_id;
 return v_result;
end $function$
;
CREATE OR REPLACE FUNCTION app_private.savings_action(p_action text, p_operation_id uuid, p_account_id uuid DEFAULT NULL::uuid, p_term_days integer DEFAULT NULL::integer, p_daily_amount integer DEFAULT NULL::integer)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''
AS $function$
declare v_uid uuid:=auth.uid();v_now timestamptz;v_account public.shell_savings;v_previous app_private.savings_operations;
 v_signature jsonb;v_status text;v_payout integer:=0;v_bonus integer:=0;v_gold integer;v_receipt jsonb;v_kind text;
begin
 if v_uid is null then raise exception 'AUTH_REQUIRED';end if;
 if p_operation_id is null or p_action is null or p_action not in ('open','deposit','withdraw') then raise exception 'INVALID_SAVINGS_ACTION';end if;
 if (p_action='open' and p_account_id is not null) or
    (p_action<>'open' and (p_account_id is null or p_term_days is not null or p_daily_amount is not null)) then raise exception 'INVALID_SAVINGS_ACTION';end if;
 v_signature:=jsonb_build_object('action',p_action,'account',p_account_id,'term',p_term_days,'daily',p_daily_amount);
 perform pg_advisory_xact_lock(hashtextextended('savings:'||v_uid::text,0));
 select * into v_previous from app_private.savings_operations where user_id=v_uid and operation_id=p_operation_id;
 if found then
  if v_previous.signature<>v_signature then raise exception 'OPERATION_CONFLICT';end if;
  return app_private.savings_state()||jsonb_build_object('receipt',v_previous.receipt,'replayed',true);
 end if;
 v_now:=clock_timestamp();
 if p_action='open' then
  if p_term_days is null or p_term_days not in (3,5,7) or p_daily_amount is null or p_daily_amount not between 10 and 5000 then raise exception 'INVALID_SAVINGS_PLAN';end if;
  if exists(select 1 from public.shell_savings where user_id=v_uid and closed_at is null) then raise exception 'SAVINGS_ALREADY_OPEN';end if;
 else
  select * into v_account from public.shell_savings where id=p_account_id and user_id=v_uid for update;
  if not found then raise exception 'SAVINGS_NOT_FOUND';end if;
  if v_account.closed_at is not null then raise exception 'SAVINGS_CLOSED';end if;
 end if;
 insert into public.player_wallets(user_id) values(v_uid) on conflict do nothing;
 select gold into v_gold from public.player_wallets where user_id=v_uid for update;
 -- Re-read time after any wallet lock wait, including at exact deadlines.
 v_now:=clock_timestamp();
 if p_action<>'open' then
  v_status:=app_private.savings_payload(v_account,v_now)->>'status';
  if p_action='deposit' and v_status<>'due' then
   if v_status='missed' then raise exception 'SAVINGS_MISSED';else raise exception 'SAVINGS_NOT_DUE';end if;
  end if;
 end if;
 if p_action='open' then
  if v_gold<p_daily_amount then raise exception 'INSUFFICIENT_GOLD';end if;
  insert into public.shell_savings(user_id,term_days,daily_amount,started_at,relic_bonus_percent) values(v_uid,p_term_days,p_daily_amount,v_now,least(10,greatest(0,app_private.relic_bonus('savings_interest_bonus_percent')))::integer) returning * into v_account;
  update public.player_wallets set gold=gold-p_daily_amount,updated_at=v_now where user_id=v_uid;
 elsif p_action='deposit' then
  if v_gold<v_account.daily_amount then raise exception 'INSUFFICIENT_GOLD';end if;
  update public.shell_savings set paid_count=paid_count+1 where id=v_account.id returning * into v_account;
  update public.player_wallets set gold=gold-v_account.daily_amount,updated_at=v_now where user_id=v_uid;
 else
  v_kind:=case v_status when 'matured' then 'matured' when 'missed' then 'missed' else 'cancelled' end;
  if v_kind='matured' then v_bonus:=(v_account.daily_amount*v_account.paid_count*(case v_account.term_days when 3 then 20 when 5 then 25 else 30 end))/100;v_bonus:=v_bonus+(v_bonus*v_account.relic_bonus_percent)/100;end if;
  v_payout:=v_account.daily_amount*v_account.paid_count+v_bonus;
  if v_gold::bigint+v_payout>1000000000 then raise exception 'GOLD_LIMIT';end if;
  update public.player_wallets set gold=gold+v_payout,updated_at=v_now where user_id=v_uid;
  update public.shell_savings set closed_at=v_now,close_kind=v_kind,payout=v_payout where id=v_account.id returning * into v_account;
 end if;
 v_receipt:=jsonb_build_object('action',p_action,'accountId',v_account.id,'paidCount',v_account.paid_count,'payout',v_payout,'bonus',v_bonus,'closeKind',v_kind);
 insert into app_private.savings_operations(user_id,operation_id,account_id,signature,receipt) values(v_uid,p_operation_id,v_account.id,v_signature,v_receipt);
 return app_private.savings_state()||jsonb_build_object('receipt',v_receipt,'replayed',false);
end;
$function$
;
CREATE OR REPLACE FUNCTION app_private.savings_payload(a shell_savings, p_now timestamp with time zone)
 RETURNS jsonb
 LANGUAGE sql
 STABLE
 SET search_path TO ''
AS $function$
 select to_jsonb(a)||jsonb_build_object(
  'principal',a.daily_amount*a.paid_count,
  'bonusPercent',case a.term_days when 3 then 20 when 5 then 25 else 30 end,
  'relicBonusPercent',a.relic_bonus_percent,
  'expectedBonus',b.base_bonus+(b.base_bonus*a.relic_bonus_percent)/100,
  'expectedPayout',a.daily_amount*a.term_days+b.base_bonus+(b.base_bonus*a.relic_bonus_percent)/100,
  'maturesAt',a.started_at+make_interval(hours=>a.term_days*24),
  'nextOpenAt',case when a.paid_count<a.term_days then a.started_at+make_interval(hours=>a.paid_count*24) end,
  'depositDeadline',case when a.paid_count<a.term_days then a.started_at+make_interval(hours=>(a.paid_count+1)*24) end,
  'status',case
   when a.closed_at is not null then 'closed'
   when a.paid_count=a.term_days and p_now>=a.started_at+make_interval(hours=>a.term_days*24) then 'matured'
   when a.paid_count<a.term_days and p_now>=a.started_at+make_interval(hours=>(a.paid_count+1)*24) then 'missed'
   when a.paid_count<a.term_days and p_now>=a.started_at+make_interval(hours=>a.paid_count*24) then 'due'
   else 'waiting' end
 ) from (select a.daily_amount*a.term_days*(case a.term_days when 3 then 20 when 5 then 25 else 30 end)/100 base_bonus) b
$function$
;
CREATE OR REPLACE FUNCTION app_private.savings_state()
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''
AS $function$
declare v_uid uuid:=auth.uid();v_now timestamptz:=clock_timestamp();v_account jsonb;v_history jsonb;
begin
 if v_uid is null then raise exception 'AUTH_REQUIRED';end if;
 select app_private.savings_payload(a,v_now) into v_account from public.shell_savings a where a.user_id=v_uid and a.closed_at is null;
 select coalesce(jsonb_agg(q.payload),'[]'::jsonb) into v_history from (
  select app_private.savings_payload(a,v_now) payload from public.shell_savings a
  where a.user_id=v_uid and a.closed_at is not null order by a.closed_at desc,a.id limit 5
 ) q;
 return jsonb_build_object('relicBonusPercent',least(10,greatest(0,app_private.relic_bonus('savings_interest_bonus_percent'))),'account',v_account,'history',v_history,'serverNow',v_now,
  'gold',coalesce((select gold from public.player_wallets where user_id=v_uid),0));
end;
$function$
;
notify pgrst, 'reload schema';
