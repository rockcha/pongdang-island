begin;
create table app_private.ladder_runs (
 id uuid primary key default gen_random_uuid(),
 user_id uuid not null references auth.users(id) on delete cascade,
 operation_id uuid not null,
 mode text not null check(mode in ('calm','wave','storm')),
 stake integer not null check(stake between 20 and 1000 and stake%20=0),
 choice integer not null check(choice between 0 and 3),
 bridges integer[] not null check(cardinality(bridges)=12),
 payouts integer[] not null check(cardinality(payouts)=4),
 destination integer not null check(destination between 0 and 3),
 reward integer not null check(reward between 0 and 4000),
 created_at timestamptz not null default clock_timestamp(),
 unique(user_id,operation_id)
);
create index ladder_runs_latest on app_private.ladder_runs(user_id,created_at desc,id);
alter table app_private.ladder_runs enable row level security;
revoke all on app_private.ladder_runs from public,anon,authenticated;

create function app_private.ladder_game(p_action text,p_operation_id uuid default null,p_mode text default null,p_stake integer default null,p_choice integer default null) returns jsonb
language plpgsql security definer set search_path='' as $$
declare v_uid uuid:=auth.uid();r app_private.ladder_runs;v_gold integer;v_payouts integer[];v_bridges integer[]:='{}';v_col integer;v_link integer;v_reward integer;
begin
 if v_uid is null then raise exception 'AUTH_REQUIRED';end if;
 if p_action='state' then
  select * into r from app_private.ladder_runs where user_id=v_uid order by created_at desc,id limit 1;
  return jsonb_build_object('run',case when r.id is null then null else to_jsonb(r)-'user_id' end);
 end if;
 if p_action is distinct from 'play' or p_operation_id is null or p_mode is null or p_mode not in ('calm','wave','storm')
  or p_stake is null or p_stake not between 20 and 1000 or p_stake%20<>0
  or p_choice is null or p_choice not between 0 and 3 then raise exception 'INVALID_LADDER_REQUEST';end if;
 perform app_private.get_gold_wallet();
 select gold into v_gold from public.player_wallets where user_id=v_uid for update;
 select * into r from app_private.ladder_runs where user_id=v_uid and operation_id=p_operation_id;
 if found then
  if r.mode<>p_mode or r.stake<>p_stake or r.choice<>p_choice then raise exception 'OPERATION_CONFLICT';end if;
  return jsonb_build_object('run',to_jsonb(r)-'user_id');
 end if;
 if v_gold<p_stake then raise exception 'INSUFFICIENT_GOLD';end if;
 -- Independent shuffled endpoints make each payout equally likely for every start.
 select array_agg(x order by random()) into v_payouts from unnest(case p_mode when 'calm' then array[50,75,125,150] when 'wave' then array[0,50,150,200] else array[0,0,0,400] end) x;
 v_col:=p_choice;
 for i in 1..12 loop
  v_link:=floor(random()*4)::integer-1;
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
create function public.ladder_game(p_action text,p_operation_id uuid default null,p_mode text default null,p_stake integer default null,p_choice integer default null) returns jsonb
language sql security invoker set search_path='' as $$select app_private.ladder_game(p_action,p_operation_id,p_mode,p_stake,p_choice)$$;
revoke all on function app_private.ladder_game(text,uuid,text,integer,integer),public.ladder_game(text,uuid,text,integer,integer) from public,anon;
grant execute on function app_private.ladder_game(text,uuid,text,integer,integer),public.ladder_game(text,uuid,text,integer,integer) to authenticated;
create function app_private.ladder_leaderboard(p_offset integer default 0) returns jsonb
language plpgsql stable security definer set search_path='' as $$
declare v_result jsonb;
begin
 if auth.uid() is null then raise exception 'AUTH_REQUIRED';end if;
 if p_offset is null or p_offset<0 or p_offset>10000 then raise exception 'INVALID_OFFSET';end if;
 with personal as (
  select r.*,row_number() over(partition by user_id order by reward desc,created_at,id) rn from app_private.ladder_runs r where reward>0
 ), ranked as (
  select p.*,row_number() over(order by reward desc,created_at,id) rank from personal p where rn=1
 ), page as (select * from ranked order by rank offset p_offset limit 20)
 select jsonb_build_object('total',(select count(*) from ranked),'rows',coalesce((select jsonb_agg(jsonb_build_object('id',p.id,'rank',p.rank,'gold',p.reward,'nickname',coalesce(u.nickname,'섬 여행자'),'mine',p.user_id=auth.uid()) order by p.rank) from page p left join public.player_profiles u on u.id=p.user_id),'[]'::jsonb)) into v_result;
 return v_result;
end $$;
create function public.ladder_leaderboard(p_offset integer default 0) returns jsonb
language sql security invoker set search_path='' as $$select app_private.ladder_leaderboard(p_offset)$$;
revoke all on function app_private.ladder_leaderboard(integer),public.ladder_leaderboard(integer) from public,anon;
grant execute on function app_private.ladder_leaderboard(integer),public.ladder_leaderboard(integer) to authenticated;
notify pgrst,'reload schema';
commit;
