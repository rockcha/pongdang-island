-- Retain the old maximum in row constraints for existing accounts and history.
-- New enrollment is restricted to 10..5000 by the sole write RPC below.
alter table public.shell_savings drop constraint shell_savings_daily_amount_check;
alter table public.shell_savings add constraint shell_savings_daily_amount_check check (daily_amount between 10 and 10000);
alter table public.shell_savings drop constraint shell_savings_payout_check;
alter table public.shell_savings add constraint shell_savings_payout_check check (payout between 10 and 91000);

create or replace function app_private.savings_action(p_action text,p_operation_id uuid,p_account_id uuid default null,p_term_days integer default null,p_daily_amount integer default null)
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
