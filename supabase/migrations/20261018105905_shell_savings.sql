-- Fixed 24-hour windows from enrollment, independent of timezone/DST.
-- One open account includes missed accounts until their principal is collected.
create table public.shell_savings (
 id uuid primary key default gen_random_uuid(),
 user_id uuid not null references auth.users(id) on delete cascade,
 term_days integer not null check (term_days in (3,5,7)),
 daily_amount integer not null check (daily_amount between 500 and 10000),
 paid_count integer not null default 1 check (paid_count between 1 and term_days),
 started_at timestamptz not null default now(),
 closed_at timestamptz,
 close_kind text check (close_kind in ('matured','cancelled','missed')),
 payout integer check (payout between 500 and 91000),
 constraint savings_closure_consistent check (
  (closed_at is null and close_kind is null and payout is null) or
  (closed_at is not null and close_kind is not null and payout is not null)
 )
);
create unique index shell_savings_one_open on public.shell_savings(user_id) where closed_at is null;
create index shell_savings_history on public.shell_savings(user_id,started_at desc,id);
alter table public.shell_savings enable row level security;
revoke all on public.shell_savings from public,anon,authenticated;
grant select on public.shell_savings to authenticated;
grant all on public.shell_savings to service_role;
create policy shell_savings_own_read on public.shell_savings for select to authenticated
using (user_id=(select auth.uid()));

create table app_private.savings_operations (
 user_id uuid not null references auth.users(id) on delete cascade,
 operation_id uuid not null,
 account_id uuid not null references public.shell_savings(id) on delete cascade,
 signature jsonb not null,
 receipt jsonb not null,
 created_at timestamptz not null default now(),
 primary key(user_id,operation_id)
);
create index savings_operations_account on app_private.savings_operations(account_id);
alter table app_private.savings_operations enable row level security;
revoke all on app_private.savings_operations from public,anon,authenticated;
grant all on app_private.savings_operations to service_role;

create function app_private.savings_payload(a public.shell_savings,p_now timestamptz)
returns jsonb language sql stable set search_path = '' as $$
 select to_jsonb(a)||jsonb_build_object(
  'principal',a.daily_amount*a.paid_count,
  'bonusPercent',case a.term_days when 3 then 20 when 5 then 25 else 30 end,
  'expectedBonus',a.daily_amount*a.term_days*(case a.term_days when 3 then 20 when 5 then 25 else 30 end)/100,
  'expectedPayout',a.daily_amount*a.term_days*(case a.term_days when 3 then 120 when 5 then 125 else 130 end)/100,
  'maturesAt',a.started_at+make_interval(hours=>a.term_days*24),
  'nextOpenAt',case when a.paid_count<a.term_days then a.started_at+make_interval(hours=>a.paid_count*24) end,
  'depositDeadline',case when a.paid_count<a.term_days then a.started_at+make_interval(hours=>(a.paid_count+1)*24) end,
  'status',case
   when a.closed_at is not null then 'closed'
   when a.paid_count=a.term_days and p_now>=a.started_at+make_interval(hours=>a.term_days*24) then 'matured'
   when a.paid_count<a.term_days and p_now>=a.started_at+make_interval(hours=>(a.paid_count+1)*24) then 'missed'
   when a.paid_count<a.term_days and p_now>=a.started_at+make_interval(hours=>a.paid_count*24) then 'due'
   else 'waiting' end
 )
$$;
revoke all on function app_private.savings_payload(public.shell_savings,timestamptz) from public,anon,authenticated;

create function app_private.savings_state() returns jsonb
language plpgsql security definer set search_path = '' as $$
declare v_uid uuid:=auth.uid();v_now timestamptz:=clock_timestamp();v_account jsonb;v_history jsonb;
begin
 if v_uid is null then raise exception 'AUTH_REQUIRED';end if;
 select app_private.savings_payload(a,v_now) into v_account from public.shell_savings a where a.user_id=v_uid and a.closed_at is null;
 select coalesce(jsonb_agg(q.payload),'[]'::jsonb) into v_history from (
  select app_private.savings_payload(a,v_now) payload from public.shell_savings a
  where a.user_id=v_uid and a.closed_at is not null order by a.closed_at desc,a.id limit 5
 ) q;
 return jsonb_build_object('account',v_account,'history',v_history,'serverNow',v_now,
  'gold',coalesce((select gold from public.player_wallets where user_id=v_uid),0));
end;
$$;
revoke all on function app_private.savings_state() from public,anon,authenticated;
grant execute on function app_private.savings_state() to authenticated;
create function public.savings_state() returns jsonb language sql security invoker set search_path = '' as $$
 select app_private.savings_state()
$$;
revoke all on function public.savings_state() from public,anon,authenticated;
grant execute on function public.savings_state() to authenticated;

create function app_private.savings_action(p_action text,p_operation_id uuid,p_account_id uuid default null,p_term_days integer default null,p_daily_amount integer default null)
returns jsonb language plpgsql security definer set search_path = '' as $$
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
  if p_term_days is null or p_term_days not in (3,5,7) or p_daily_amount is null or p_daily_amount not between 500 and 10000 then raise exception 'INVALID_SAVINGS_PLAN';end if;
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
  insert into public.shell_savings(user_id,term_days,daily_amount,started_at) values(v_uid,p_term_days,p_daily_amount,v_now) returning * into v_account;
  update public.player_wallets set gold=gold-p_daily_amount,updated_at=v_now where user_id=v_uid;
 elsif p_action='deposit' then
  if v_gold<v_account.daily_amount then raise exception 'INSUFFICIENT_GOLD';end if;
  update public.shell_savings set paid_count=paid_count+1 where id=v_account.id returning * into v_account;
  update public.player_wallets set gold=gold-v_account.daily_amount,updated_at=v_now where user_id=v_uid;
 else
  v_kind:=case v_status when 'matured' then 'matured' when 'missed' then 'missed' else 'cancelled' end;
  if v_kind='matured' then v_bonus:=(v_account.daily_amount*v_account.paid_count*(case v_account.term_days when 3 then 20 when 5 then 25 else 30 end))/100;end if;
  v_payout:=v_account.daily_amount*v_account.paid_count+v_bonus;
  if v_gold::bigint+v_payout>1000000000 then raise exception 'GOLD_LIMIT';end if;
  update public.player_wallets set gold=gold+v_payout,updated_at=v_now where user_id=v_uid;
  update public.shell_savings set closed_at=v_now,close_kind=v_kind,payout=v_payout where id=v_account.id returning * into v_account;
 end if;
 v_receipt:=jsonb_build_object('action',p_action,'accountId',v_account.id,'paidCount',v_account.paid_count,'payout',v_payout,'bonus',v_bonus,'closeKind',v_kind);
 insert into app_private.savings_operations(user_id,operation_id,account_id,signature,receipt) values(v_uid,p_operation_id,v_account.id,v_signature,v_receipt);
 return app_private.savings_state()||jsonb_build_object('receipt',v_receipt,'replayed',false);
end;
$$;
revoke all on function app_private.savings_action(text,uuid,uuid,integer,integer) from public,anon,authenticated;
grant execute on function app_private.savings_action(text,uuid,uuid,integer,integer) to authenticated;
create function public.savings_action(p_action text,p_operation_id uuid,p_account_id uuid default null,p_term_days integer default null,p_daily_amount integer default null)
returns jsonb language sql security invoker set search_path = '' as $$
 select app_private.savings_action(p_action,p_operation_id,p_account_id,p_term_days,p_daily_amount)
$$;
revoke all on function public.savings_action(text,uuid,uuid,integer,integer) from public,anon,authenticated;
grant execute on function public.savings_action(text,uuid,uuid,integer,integer) to authenticated;
