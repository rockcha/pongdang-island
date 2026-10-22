begin;
-- Retain settled four-lane runs and their idempotent receipts during the upgrade.
alter table app_private.ladder_runs
 drop constraint ladder_runs_mode_check,
 drop constraint ladder_runs_choice_check,
 drop constraint ladder_runs_destination_check,
 drop constraint ladder_runs_payouts_check,
 drop constraint ladder_runs_reward_check;
alter table app_private.ladder_runs
 add constraint ladder_runs_mode_check check(mode in ('calm','wave','lucky','shark','storm')),
 add constraint ladder_runs_choice_check check(choice>=0 and choice<cardinality(payouts)),
 add constraint ladder_runs_destination_check check(destination>=0 and destination<cardinality(payouts)),
 add constraint ladder_runs_payouts_check check(cardinality(payouts) in (4,6)),
 add constraint ladder_runs_reward_check check(reward between 0 and 6000);

create or replace function app_private.ladder_game(p_action text,p_operation_id uuid default null,p_mode text default null,p_stake integer default null,p_choice integer default null)
returns jsonb language plpgsql security definer set search_path='' as $$
declare v_uid uuid:=auth.uid();r app_private.ladder_runs;v_gold integer;v_payouts integer[];v_bridges integer[]:='{}';v_col integer;v_link integer;v_reward integer;
begin
 if v_uid is null then raise exception 'AUTH_REQUIRED';end if;
 if p_action='state' then
  select * into r from app_private.ladder_runs where user_id=v_uid order by created_at desc,id limit 1;
  return jsonb_build_object('run',case when r.id is null then null else to_jsonb(r)-'user_id' end);
 end if;
 if p_action is distinct from 'play' or p_operation_id is null or p_mode is null or p_mode not in ('calm','wave','lucky','shark','storm')
  or p_stake is null or p_stake not between 20 and 1000 or p_stake%20<>0
  or p_choice is null or p_choice not between 0 and 5 then raise exception 'INVALID_LADDER_REQUEST';end if;
 perform app_private.get_gold_wallet();
 select gold into v_gold from public.player_wallets where user_id=v_uid for update;
 select * into r from app_private.ladder_runs where user_id=v_uid and operation_id=p_operation_id;
 if found then
  if r.mode<>p_mode or r.stake<>p_stake or r.choice<>p_choice then raise exception 'OPERATION_CONFLICT';end if;
  return jsonb_build_object('run',to_jsonb(r)-'user_id');
 end if;
 if v_gold<p_stake then raise exception 'INSUFFICIENT_GOLD';end if;
 -- Every start has the same six equally likely endpoints, independently of bridges.
 -- Stakes are multiples of 20; these tenths pay integral gold without rounding loss.
 select array_agg(x order by random()) into v_payouts from unnest(case p_mode
  when 'calm' then array[70,80,90,100,120,140]
  when 'wave' then array[0,50,80,100,150,220]
  when 'lucky' then array[0,20,120,130,150,180]
  when 'shark' then array[0,0,0,50,150,400]
  else array[0,0,0,0,0,600] end) x;
 v_col:=p_choice;
 for i in 1..12 loop
  v_link:=floor(random()*6)::integer-1;
  v_bridges:=array_append(v_bridges,v_link);
  if v_link>=0 then
   if v_link=v_col then v_col:=v_col+1;elsif v_link=v_col-1 then v_col:=v_col-1;end if;
  end if;
 end loop;
 v_reward:=p_stake*v_payouts[v_col+1]/100;
 if v_gold-p_stake+v_reward>1000000000 then raise exception 'GOLD_LIMIT';end if;
 insert into app_private.ladder_runs(user_id,operation_id,mode,stake,choice,bridges,payouts,destination,reward)
 values(v_uid,p_operation_id,p_mode,p_stake,p_choice,v_bridges,v_payouts,v_col,v_reward) returning * into r;
 update public.player_wallets set gold=gold-p_stake+v_reward,updated_at=clock_timestamp() where user_id=v_uid;
 insert into public.gold_transactions(user_id,operation_id,action,item_id,delta)
 values(v_uid,p_operation_id,'buy','arcade:ladder:'||r.id::text,-p_stake);
 if v_reward>0 then
  insert into public.gold_transactions(user_id,operation_id,action,item_id,delta)
  values(v_uid,gen_random_uuid(),'charge','arcade:ladder:'||r.id::text,v_reward);
 end if;
 return jsonb_build_object('run',to_jsonb(r)-'user_id');
end $$;
commit;
