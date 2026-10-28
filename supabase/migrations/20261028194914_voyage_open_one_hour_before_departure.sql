begin;
-- Coordinate with the maintenance worker; fixed catches and bets are preserved.
select pg_advisory_xact_lock(84732019);
-- Retain historical half-hour rounds while supporting the new one-hour window.
alter table app_private.voyage_bet_rounds drop constraint voyage_bet_rounds_check;
alter table app_private.voyage_bet_rounds add constraint voyage_bet_rounds_check
 check (departs_at=opens_at+interval '30 minutes' or departs_at=opens_at+interval '1 hour');
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
   departure:=(v_day+make_time(v_slot,0,0)) at time zone 'Asia/Seoul';opening:=departure-interval '1 hour';
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
 select s.id,'voyage-bets',vr.id,vr.opens_at,jsonb_build_object('userId',s.user_id,'title','만선 승부장 · 출항 1시간 전','body','네 회사의 출항 계획이 공개됐어요. 출항 전까지 예측에 참여해 보세요.','url','/voyage-bets','tag','voyage-bets:'||vr.id),vr.departs_at
 from app_private.voyage_bet_rounds vr cross join app_private.push_subscriptions s
 where vr.opens_at<=p_now and vr.departs_at>p_now and 'voyage-bets'=any(s.categories)
 on conflict(subscription_id,source_id) where category='voyage-bets' do nothing;
 get diagnostics queued=row_count;
 return jsonb_build_object('created',created,'settled',settled,'paid',paid,'queued',queued);
end $function$
;
CREATE OR REPLACE FUNCTION app_private.voyage_race_test_sample()
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''
AS $function$
declare u uuid:=auth.uid();t timestamptz:=clock_timestamp();departure timestamptz;opening timestamptz;
 rid uuid:=gen_random_uuid();sample jsonb:='{}'::jsonb;state jsonb;one_round jsonb;step text;at_time timestamptz;
begin
 if u is null then raise exception 'AUTH_REQUIRED';end if;
 if not app_private.notice_is_operator() then raise exception 'OPERATOR_REQUIRED';end if;
 departure:=((t at time zone 'Asia/Seoul')::date+time '09:00') at time zone 'Asia/Seoul';
 if t>=departure-interval '1 hour' then departure:=((t at time zone 'Asia/Seoul')::date+time '19:00') at time zone 'Asia/Seoul';end if;
 if t>=departure-interval '1 hour' then departure:=(((t at time zone 'Asia/Seoul')::date+1)+time '09:00') at time zone 'Asia/Seoul';end if;
 opening:=departure-interval '1 hour';
 -- This subtransaction is ALWAYS rolled back. Reuse the production engine,
 -- but never retain a round/plan, access a wallet, settle a real bet or enqueue
 -- a notification. The artificial unique day is not used for displayed times.
 begin
  insert into app_private.voyage_bet_rounds(id,voyage_day,slot,opens_at,departs_at,results_at,rules)
  values(rid,date '3000-01-01'+floor(random()*365000)::int,9,opening,departure,departure+interval '3 hours','ranking');
  perform app_private.voyage_bet_make_plans(rid,opening);
  foreach step in array array['scheduled','open','sailing','one','two','final'] loop
   at_time:=case step when 'scheduled' then opening-interval '1 minute' when 'open' then opening+interval '1 second'
    when 'sailing' then departure when 'one' then departure+interval '1 hour' when 'two' then departure+interval '2 hours' else departure+interval '3 hours' end;
   if step='final' then update app_private.voyage_bet_rounds set settled_at=at_time where id=rid;end if;
   state:=app_private.voyage_race_payload(u,at_time);
   select value into one_round from jsonb_array_elements(state->'rounds') where value->>'id'=rid::text;
   if one_round is null then raise exception 'VOYAGE_TEST_SAMPLE_UNAVAILABLE';end if;
   state:=jsonb_set(jsonb_set(state,'{rounds}',jsonb_build_array(one_round)),'{pendingPayout}','0'::jsonb);
   sample:=jsonb_set(sample,array[step],state);
  end loop;
  raise exception using errcode='ZX001',message='ROLLBACK_VOYAGE_TEST_SAMPLE';
 exception when sqlstate 'ZX001' then
  -- PL/pgSQL variables survive, all database writes above do not.
  null;
 end;
 return sample;
end $function$
;

update app_private.voyage_bet_rounds
set opens_at=departs_at-interval '1 hour'
where rules='ranking' and departs_at>clock_timestamp() and settled_at is null
 and opens_at is distinct from departs_at-interval '1 hour';

-- Never resend delivered alerts. Only pending alerts adopt the new opening time.
update app_private.push_deliveries d
set source_started_at=r.opens_at,
 payload=jsonb_set(d.payload,'{title}',to_jsonb('만선 승부장 · 출항 1시간 전'::text))
from app_private.voyage_bet_rounds r
where d.category='voyage-bets' and d.source_id=r.id and d.status='pending'
 and r.rules='ranking' and r.departs_at>clock_timestamp() and r.settled_at is null;

commit;
