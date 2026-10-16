-- Preserve cumulative streaks and immutable reward history.
begin;
do $$
begin
 if not exists(select 1 from information_schema.columns where table_schema='public' and table_name='player_attendance' and column_name='sheet_streak_offset') then
  alter table public.player_attendance add column sheet_streak_offset integer not null default 0 check(sheet_streak_offset>=0);
  -- Keep the old sheet position, capped at 28; no retroactive rewards.
  update public.player_attendance set
   sheet_streak_offset=((streak-1)/30)*2+greatest((streak-1)%30+1-28,0),
   completed_sheets=completed_sheets+case when (streak-1)%30+1 between 28 and 29 then 1 else 0 end
  where streak>0;
 end if;
end $$;
create or replace function app_private.attendance_state() returns jsonb
language plpgsql security definer set search_path='' as $$
declare v_uid uuid:=auth.uid();v_today date:=(transaction_timestamp() at time zone 'Asia/Seoul')::date;
 a public.player_attendance;v_checked boolean;v_streak integer;v_day integer;
begin
 if v_uid is null then raise exception 'AUTH_REQUIRED'; end if;
 select * into a from public.player_attendance where user_id=v_uid;
 v_checked:=coalesce(a.last_claim_date=v_today,false);
 v_streak:=case when a.last_claim_date between v_today-1 and v_today then a.streak else 0 end;
 if v_streak=0 then a.sheet_streak_offset:=0; end if;
 v_day:=case when v_checked then (v_streak-coalesce(a.sheet_streak_offset,0)-1)%28+1 else (v_streak-coalesce(a.sheet_streak_offset,0))%28+1 end;
 return jsonb_build_object('today',v_today,'checkedIn',v_checked,'streak',v_streak,
  'currentDay',v_day,'completedDays',case when v_checked then v_day else v_day-1 end,
  'sheetNumber',coalesce(a.completed_sheets,0)+case when v_checked and v_day=28 then 0 else 1 end,
  'completedSheets',coalesce(a.completed_sheets,0),'reset',coalesce(a.last_claim_date<v_today-1,false));
end $$;

create or replace function app_private.claim_attendance(p_day date) returns jsonb
language plpgsql security definer set search_path='' as $$
declare v_uid uuid:=auth.uid();v_today date:=(transaction_timestamp() at time zone 'Asia/Seoul')::date;
 a public.player_attendance;c public.attendance_claims;w public.player_wallets;
 v_streak integer;v_day integer;v_bait text;v_count integer;
begin
 if v_uid is null then raise exception 'AUTH_REQUIRED'; end if;
 if p_day is null then raise exception 'INVALID_ATTENDANCE_DAY'; end if;
 perform app_private.get_gold_wallet();
 -- Match the wallet-first lock order used by fishing and equipment purchases.
 select * into w from public.player_wallets where user_id=v_uid for update;
 select * into c from public.attendance_claims where user_id=v_uid and claim_date=p_day;
 if found then
  return app_private.attendance_state()||jsonb_build_object('replayed',true,'reward',to_jsonb(c));
 end if;
 if p_day<>v_today then raise exception 'ATTENDANCE_DAY_CHANGED'; end if;
 insert into public.player_attendance(user_id) values(v_uid) on conflict do nothing;
 select * into a from public.player_attendance where user_id=v_uid;
 v_streak:=case when a.last_claim_date=v_today-1 then a.streak+1 else 1 end;
 if a.last_claim_date is distinct from v_today-1 then a.sheet_streak_offset:=0; end if;
 v_day:=(v_streak-a.sheet_streak_offset-1)%28+1;
 v_bait:=case when v_day=28 then 'bait_epic' when v_day%7=0 then 'bait_special' else null end;
 if w.gold>1000000000-50 then raise exception 'GOLD_LIMIT'; end if;
 if v_bait is not null then
  if not exists(select 1 from public.fishing_baits where id=v_bait) then raise exception 'ATTENDANCE_REWARD_UNAVAILABLE'; end if;
  v_count:=coalesce((w.inventory->>v_bait)::integer,0);
  if v_count>=2147483647 then raise exception 'INVENTORY_LIMIT'; end if;
  w.inventory:=jsonb_set(w.inventory,array[v_bait],to_jsonb(v_count+1));
 end if;
 update public.player_wallets set gold=gold+50,inventory=w.inventory,updated_at=now() where user_id=v_uid;
 update public.player_attendance set last_claim_date=v_today,streak=v_streak,sheet_streak_offset=a.sheet_streak_offset,
  completed_sheets=completed_sheets+case when v_day=28 then 1 else 0 end where user_id=v_uid;
 insert into public.attendance_claims(user_id,claim_date,streak,sheet_day,bait_id)
 values(v_uid,v_today,v_streak,v_day,v_bait) returning * into c;
 insert into public.gold_transactions(user_id,operation_id,action,item_id,delta)
 values(v_uid,c.operation_id,'charge','attendance:'||v_today::text,50);
 return app_private.attendance_state()||jsonb_build_object('replayed',false,'reward',to_jsonb(c));
end $$;
create or replace function public.attendance_state() returns jsonb language sql security invoker set search_path='' as $$select app_private.attendance_state()$$;
create or replace function public.claim_attendance(p_day date) returns jsonb language sql security invoker set search_path='' as $$select app_private.claim_attendance(p_day)$$;
revoke all on function app_private.attendance_state(),public.attendance_state(),app_private.claim_attendance(date),public.claim_attendance(date) from public,anon;
grant execute on function app_private.attendance_state(),public.attendance_state(),app_private.claim_attendance(date),public.claim_attendance(date) to authenticated;
notify pgrst,'reload schema';
commit;
