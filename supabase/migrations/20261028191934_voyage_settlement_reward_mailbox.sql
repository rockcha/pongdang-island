begin;
-- Keep every existing reward shape, adding only bounded, server-created voyage gold.
alter table public.collectible_gifts drop constraint gift_asset_shape;
alter table public.collectible_gifts add constraint gift_asset_shape check (
 (((reward_kind = 'collectible'::text) AND ((quantity >= 1) AND (quantity <=
CASE
    WHEN (source = 'exchange'::text) THEN 100
    ELSE 20
END)) AND (cardinality(collectible_ids) = quantity)) OR ((source = 'exchange'::text) AND (reward_kind = 'gold'::text) AND ((quantity >= 1) AND (quantity <= 1000000000)) AND (cardinality(collectible_ids) = 0)) OR ((source = 'exchange'::text) AND (reward_kind = 'bait'::text) AND ((quantity >= 1) AND (quantity <= 9999)) AND (cardinality(collectible_ids) = 0) AND (reward_id IS NOT NULL)) OR ((source = 'system'::text) AND (reward_kind = 'gold'::text) AND (reward_id = ANY (ARRAY['welcome'::text, 'operator-gold-20261020'::text, 'operator-gold-20261020-round2'::text, 'operator-gold-20261021-supply'::text])) AND (quantity = 500) AND (cardinality(collectible_ids) = 0) AND (sender_id IS NULL) AND (NOT exchange_hold)) OR ((source = 'exchange'::text) AND (reward_kind = 'fuel'::text) AND (reward_id = 'fuel'::text) AND ((quantity >= 1) AND (quantity <= 9999)) AND (cardinality(collectible_ids) = 0)) OR ((source = 'system'::text) AND (reward_kind = 'bait'::text) AND (reward_id = 'bait'::text) AND ((species ->> 'id'::text) = ANY (ARRAY['welcome-bait'::text, 'operator-worm-20261020'::text])) AND (quantity = 5) AND (cardinality(collectible_ids) = 0) AND (sender_id IS NULL) AND (NOT exchange_hold)) OR ((source = 'system'::text) AND (reward_kind = 'gold'::text) AND (reward_id ~~ 'arcade-weekly:%'::text) AND (quantity = ANY (ARRAY[2000, 1500, 1000, 650, 400, 200])) AND ((species ->> 'game'::text) = ANY (ARRAY['shadow'::text, 'memory'::text, 'pongi-whack'::text])) AND (reward_id = ((('arcade-weekly:'::text || (species ->> 'game'::text)) || ':'::text) || (species ->> 'week_start'::text))) AND (cardinality(collectible_ids) = 0) AND (sender_id IS NULL) AND (NOT exchange_hold)) OR ((source = 'system'::text) AND (reward_kind = 'gold'::text) AND (reward_id = ANY (ARRAY['giseong-catch-202610:giseong-fish'::text, 'giseong-catch-202610:giseong-webfoot-octopus'::text])) AND ((species ->> 'id'::text) = reward_id) AND (quantity = 300) AND (cardinality(collectible_ids) = 0) AND (sender_id IS NULL) AND (NOT exchange_hold)) OR ((source = 'system'::text) AND (reward_kind = 'gold'::text) AND (reward_id = 'operator-update-20261023-nyamnyam'::text) AND ((species ->> 'id'::text) = reward_id) AND (quantity = 1000) AND (cardinality(collectible_ids) = 0) AND (sender_id IS NULL) AND (NOT exchange_hold)) OR ((source = 'system'::text) AND (reward_kind = 'gold'::text) AND (sender_id IS NULL) AND (NOT exchange_hold) AND (cardinality(collectible_ids) = 0) AND
CASE
    WHEN (reward_id ~ '^level-up:[1-9][0-9]{0,8}$'::text) THEN (((split_part(reward_id, ':'::text, 2))::bigint >= 2) AND (quantity = LEAST((1000000000)::bigint, (100 * (((split_part(reward_id, ':'::text, 2))::bigint + 9) / 10)))) AND ((species ->> 'id'::text) = reward_id))
    ELSE false
END) OR ((source = 'system'::text) AND (reward_kind = 'gold'::text) AND (reward_id = 'halloween-20261024-gold-500'::text) AND ((species ->> 'id'::text) = reward_id) AND (quantity = 500) AND (cardinality(collectible_ids) = 0) AND (sender_id IS NULL) AND (NOT exchange_hold)) OR ((source = 'system'::text) AND (reward_kind = 'bait'::text) AND (reward_id = 'bait_special'::text) AND ((species ->> 'id'::text) = 'aquarium-apology-20261025'::text) AND (quantity = 2) AND (cardinality(collectible_ids) = 0) AND (sender_id IS NULL) AND (NOT exchange_hold)))
 or (source='system' and reward_kind='gold' and sender_id is null and not exchange_hold
  and cardinality(collectible_ids)=0 and quantity between 1 and 1500
  and reward_id ~ '^voyage-race:[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$'
  and species->>'id'=reward_id)
);
create unique index voyage_race_reward_once on public.collectible_gifts(recipient_id,reward_id)
 where source='system' and reward_kind='gold' and reward_id like 'voyage-race:%';
alter table app_private.voyage_race_bets add column reward_gift_id uuid references public.collectible_gifts(id);
create unique index voyage_race_reward_gift on app_private.voyage_race_bets(reward_gift_id) where reward_gift_id is not null;
comment on column app_private.voyage_race_bets.reward_gift_id is 'Settlement gift; legacy paid_at without a gift already credited the wallet and must never be redelivered.';

CREATE OR REPLACE FUNCTION app_private.voyage_bets_maintenance(p_now timestamp with time zone DEFAULT clock_timestamp())
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''
AS $function$
declare v_day date;v_slot integer;departure timestamptz;opening timestamptz;rid uuid;r record;b record;balance integer;refund boolean;reward_gift uuid;
 created integer:=0;settled integer:=0;paid integer:=0;queued integer:=0;
begin
 if not pg_try_advisory_xact_lock(84732019) then return jsonb_build_object('busy',true);end if;
 for v_day in select ((p_now at time zone 'Asia/Seoul')::date+i) from generate_series(0,2)i loop
  foreach v_slot in array array[9,19] loop
   departure:=(v_day+make_time(v_slot,0,0)) at time zone 'Asia/Seoul';opening:=departure-interval '30 minutes';
   if departure<=p_now or exists(select 1 from app_private.voyage_bet_rounds where voyage_day=v_day and slot=v_slot) then continue;end if;
   if not exists(select 1 from app_private.voyage_bet_models m join app_private.voyage_rank_calibrations c on c.model_id=m.id where valid_from<=opening and(valid_until is null or valid_until>opening)) then continue;end if;
   insert into app_private.voyage_bet_rounds(voyage_day,slot,opens_at,departs_at,results_at,rules) values(v_day,v_slot,opening,departure,departure+interval '3 hours','ranking') returning id into rid;
   perform app_private.voyage_bet_make_plans(rid,opening);created:=created+1;
  end loop;
 end loop;
 for r in select * from app_private.voyage_bet_rounds where results_at<=p_now and settled_at is null order by results_at for update skip locked loop
  if r.rules='legacy' then
   update app_private.voyage_bets bet set payout=case when p.actual_sales=p.target_sales then bet.stake when(bet.side='above' and p.actual_sales>p.target_sales)or(bet.side='below' and p.actual_sales<p.target_sales)then bet.stake*19/10 else 0 end
    from app_private.voyage_bet_plans p where p.id=bet.plan_id and p.round_id=r.id;
   update app_private.voyage_bets bet set paid_at=p_now from app_private.voyage_bet_plans p where p.id=bet.plan_id and p.round_id=r.id and bet.payout=0;
  else
   if(select count(*)<>4 from app_private.voyage_race_board(r.id,3)) then raise exception 'VOYAGE_RANK_INCOMPLETE';end if;
   select exists(select 1 from app_private.voyage_race_board(r.id,3) where place<=2 and tied) into refund;
   update app_private.voyage_race_bets bet set payout=case when refund then bet.stake when board.place=1 then bet.stake*3 when board.place=2 then bet.stake*6/5 else 0 end
    from app_private.voyage_race_board(r.id,3) board where bet.round_id=r.id and board.plan_id=bet.plan_id;
   update app_private.voyage_race_bets set paid_at=p_now where round_id=r.id and payout=0;
  end if;
  update app_private.voyage_bet_rounds set settled_at=p_now where id=r.id;settled:=settled+1;
 end loop;
 -- Preserve outstanding credits from legacy rounds as well as new rank bets.
 for b in select * from app_private.voyage_bets where payout>0 and paid_at is null order by user_id,plan_id for update skip locked loop
  insert into public.player_wallets(user_id) values(b.user_id) on conflict do nothing;
  select gold into balance from public.player_wallets where user_id=b.user_id for update;
  if balance::bigint+b.payout>1000000000 then continue;end if;
  update public.player_wallets set gold=gold+b.payout,updated_at=clock_timestamp() where user_id=b.user_id;
  update app_private.voyage_bets set paid_at=p_now where user_id=b.user_id and plan_id=b.plan_id;paid:=paid+1;
 end loop;
 -- paid_at records delivery, while the gift's claimed_at records wallet receipt.
 for b in select bet.*,round_row.departs_at
  from app_private.voyage_race_bets bet
  join app_private.voyage_bet_rounds round_row on round_row.id=bet.round_id
  where bet.payout>0 and bet.paid_at is null and round_row.settled_at is not null
  order by bet.user_id,bet.round_id for update of bet skip locked loop
  insert into public.collectible_gifts(sender_name,recipient_id,recipient_name,operation_id,collectible_ids,species,quantity,message,source,reward_kind,reward_id)
  select '만선 승부장',b.user_id,profile.nickname,gen_random_uuid(),'{}'::uuid[],
   jsonb_build_object('id','voyage-race:'||b.round_id,'name','만선 승부장 정산 보상'),b.payout,
   to_char(b.departs_at at time zone 'Asia/Seoul','MM/DD HH24:MI')||' 출항 · '||b.payout||'골드 (원금 포함)','system','gold','voyage-race:'||b.round_id
  from public.player_profiles profile where profile.id=b.user_id
  on conflict(recipient_id,reward_id) where source='system' and reward_kind='gold' and reward_id like 'voyage-race:%' do nothing;
  select id into strict reward_gift from public.collectible_gifts
   where recipient_id=b.user_id and source='system' and reward_kind='gold' and reward_id='voyage-race:'||b.round_id;
  insert into public.notifications(recipient_id,category,kind,title,body,gift_id)
  values(b.user_id,'gift','gift_received','만선 승부장 정산 결과',b.payout||'골드가 도착했어요. 보관함에서 받아주세요.',reward_gift) on conflict do nothing;
  update app_private.voyage_race_bets set paid_at=p_now,reward_gift_id=reward_gift where user_id=b.user_id and round_id=b.round_id;
  paid:=paid+1;
 end loop;
 insert into app_private.push_deliveries(subscription_id,category,source_id,source_started_at,payload,expires_at)
 select s.id,'voyage-bets',vr.id,vr.opens_at,jsonb_build_object('userId',s.user_id,'title','만선 승부장 · 출항 30분 전','body','네 회사의 출항 계획이 공개됐어요. 출항 전까지 예측에 참여해 보세요.','url','/voyage-bets','tag','voyage-bets:'||vr.id),vr.departs_at
 from app_private.voyage_bet_rounds vr cross join app_private.push_subscriptions s
 where vr.opens_at<=p_now and vr.departs_at>p_now and 'voyage-bets'=any(s.categories)
 on conflict(subscription_id,source_id) where category='voyage-bets' do nothing;
 get diagnostics queued=row_count;
 return jsonb_build_object('created',created,'settled',settled,'paid',paid,'queued',queued);
end $function$
;
CREATE OR REPLACE FUNCTION app_private.voyage_race_payload(u uuid, p_at timestamp with time zone)
 RETURNS jsonb
 LANGUAGE plpgsql
 STABLE
 SET search_path TO ''
AS $function$
declare companies jsonb;rounds jsonb;
begin
 select data->'companies' into companies from app_private.voyage_bet_models order by valid_from desc limit 1;
 select coalesce(jsonb_agg(jsonb_build_object(
  'id',r.id,'opensAt',r.opens_at,'departsAt',r.departs_at,'resultsAt',r.results_at,
  'phase',case when p_at<r.opens_at then 'scheduled' when p_at<r.departs_at then 'open' when p_at<r.results_at then 'sailing' when r.settled_at is null then 'settling' else 'settled' end,
  'completedRegions',r.stage,'nextRevealAt',case when r.stage<3 then r.departs_at+(r.stage+1)*interval '1 hour' else null end,
  'refunded',case when r.stage=3 then exists(select 1 from app_private.voyage_race_board(r.id,3) where place<=2 and tied) else false end,
  'myStake',coalesce(b.stake,0),
  'myBet',case when b.stake>0 then jsonb_build_object('planId',b.plan_id,'stake',b.stake,'payout',b.payout,'paidAt',b.paid_at,'rewardGiftId',b.reward_gift_id,'rewardClaimedAt',gift.claimed_at) else null end,
  'plans',(select jsonb_agg(jsonb_build_object(
   'id',p.id,'companyId',p.company_id,
   'bait',case when p_at>=r.opens_at then m.data->'baits'->p.bait_id else null end,
   'countPerRegion',case when p_at>=r.opens_at then p.count_per_region else null end,
   'publicRegion',case when p_at>=r.opens_at then jsonb_build_object('id',p.regions[1],'name',m.data->'regions'->>p.regions[1]) else null end,
   'targetSales',case when p_at>=r.opens_at then p.target_sales else null end,
   'totalCost',case when p_at>=r.opens_at then p.total_cost else null end,
   'progress',case when r.stage>0 then jsonb_build_object('sales',board.sales,'target',board.target,'achievement',round(board.sales::numeric/board.target*100,2),'rank',board.place,'tied',board.tied,
     'regions',(select jsonb_agg(value order by ordinality) from jsonb_array_elements(p.result) with ordinality where ordinality<=r.stage)) else null end,
   'result',case when r.stage=3 then jsonb_build_object('sales',board.sales,'profit',board.sales-p.total_cost,'rank',board.place,'tied',board.tied,'regions',p.result) else null end
  ) order by p.company_id) from app_private.voyage_bet_plans p join app_private.voyage_bet_models m on m.id=p.model_id
   left join lateral(select * from app_private.voyage_race_board(r.id,r.stage) where plan_id=p.id)board on true where p.round_id=r.id)
 ) order by r.departs_at),'[]'::jsonb) into rounds
 from(select *,greatest(0,least(3,floor(extract(epoch from(p_at-departs_at))/3600)::int)) stage from app_private.voyage_bet_rounds
  where rules='ranking' and departs_at>=p_at-interval '7 days' order by departs_at desc limit 18)r
 left join app_private.voyage_race_bets b on b.round_id=r.id and b.user_id=u
 left join public.collectible_gifts gift on gift.id=b.reward_gift_id and gift.recipient_id=u;
 return jsonb_build_object('serverNow',p_at,'companies',coalesce(companies,'[]'::jsonb),'rounds',rounds,'roundLimit',500,'firstMultiplier',3,'secondMultiplier',1.2,
  'pendingPayout',(select coalesce(sum(payout),0) from(select payout from app_private.voyage_race_bets where user_id=u and payout>0 and paid_at is null union all select payout from app_private.voyage_bets where user_id=u and payout>0 and paid_at is null)t));
end $function$
;
CREATE OR REPLACE FUNCTION app_private.claim_collectible_gift(p_gift_id uuid)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''
AS $function$
declare v_uid uuid:=auth.uid();g public.collectible_gifts;v_count integer;v_inventory integer;
begin
 if v_uid is null then raise exception 'AUTH_REQUIRED';end if;
 perform app_private.get_gold_wallet();
 perform 1 from public.player_wallets where user_id=v_uid for update;
 select * into g from public.collectible_gifts where id=p_gift_id and recipient_id=v_uid and not exchange_hold for update;
 if not found then raise exception 'GIFT_NOT_FOUND';end if;
 if g.status='claimed' then return to_jsonb(g);end if;
 if g.reward_kind='gold' then
  update public.player_wallets set gold=gold+g.quantity,updated_at=now() where user_id=v_uid and gold<=1000000000-g.quantity;
  if not found then raise exception 'GOLD_LIMIT';end if;
  insert into public.gold_transactions(user_id,operation_id,action,item_id,delta) values(v_uid,g.id,'charge',case when g.source='system' and g.reward_id like 'voyage-race:%' then 'voyage:claim:'||g.id else 'exchange:claim:'||g.id end,g.quantity);
 elsif g.reward_kind in ('bait','fuel') then
  select coalesce((inventory->>g.reward_id)::integer,0) into v_inventory from public.player_wallets where user_id=v_uid;
  if v_inventory>2147483647-g.quantity then raise exception 'INVENTORY_LIMIT';end if;
  update public.player_wallets set inventory=jsonb_set(inventory,array[g.reward_id],to_jsonb(v_inventory+g.quantity)),updated_at=now() where user_id=v_uid;
 else
  perform app_private.aquarium_state();
  perform 1 from public.player_collectibles where user_id=v_uid and escrow_gift_id=g.id order by id for update;
  select count(*) into v_count from public.player_collectibles where user_id=v_uid and escrow_gift_id=g.id and sold_at is null;
  if v_count<>g.quantity then raise exception 'GIFT_UNAVAILABLE';end if;
  update public.player_collectibles set tank_id=null,escrow_gift_id=null where user_id=v_uid and escrow_gift_id=g.id;
  -- Gifts enter storage; only actual catches unlock the collection.
 end if;
 update public.collectible_gifts set status='claimed',claimed_at=now() where id=g.id returning * into g;
 update public.notifications set read_at=coalesce(read_at,now()) where recipient_id=v_uid and gift_id=g.id and kind='gift_received';
 if g.sender_id is not null and g.source='friend' then
  insert into public.notifications(recipient_id,actor_id,category,kind,title,body,gift_id)
  values(g.sender_id,v_uid,'gift','gift_claimed','선물을 받았어요',g.recipient_name||'님이 보낸 선물을 받았어요.',g.id) on conflict do nothing;
 end if;
 return to_jsonb(g);
end $function$
;
-- Replacements retain existing grants; explicitly keep all internal entrypoints closed.
revoke all on function app_private.voyage_bets_maintenance(timestamptz),app_private.voyage_race_payload(uuid,timestamptz) from public,anon,authenticated;
commit;
