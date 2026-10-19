-- Preserve past mixed rewards; new milestone claims grant bait only.
begin;
alter table public.attendance_claims drop constraint attendance_claims_reward_check;
alter table public.attendance_claims add constraint attendance_claims_reward_check check(
 (gold=50 and fuel=0) or (gold=0 and fuel=1) or (gold=0 and fuel=0 and bait_id is not null)
);

create or replace function app_private.claim_attendance(p_day date) returns jsonb
language plpgsql security definer set search_path='' as $$
declare v_uid uuid:=auth.uid();v_today date:=(transaction_timestamp() at time zone 'Asia/Seoul')::date;
 a public.player_attendance;c public.attendance_claims;w public.player_wallets;
 v_streak integer;v_day integer;v_bait text;v_count integer;v_gold integer;v_fuel integer;
begin
 if v_uid is null then raise exception 'AUTH_REQUIRED'; end if;
 if p_day is null then raise exception 'INVALID_ATTENDANCE_DAY'; end if;
 perform app_private.get_gold_wallet();
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
 v_gold:=case when v_day%7<>0 and v_day%2=1 then 50 else 0 end;
 v_fuel:=case when v_day%7<>0 and v_day%2=0 then 1 else 0 end;
 v_bait:=case when v_day=28 then 'bait_epic' when v_day%7=0 then 'bait_first_greeting' else null end;
 if v_gold>0 and w.gold>1000000000-v_gold then raise exception 'GOLD_LIMIT'; end if;
 if v_fuel>0 then
  v_count:=coalesce((w.inventory->>'fuel')::integer,0);
  if v_count>100000-v_fuel then raise exception 'FUEL_LIMIT'; end if;
  w.inventory:=jsonb_set(w.inventory,'{fuel}',to_jsonb(v_count+v_fuel));
 end if;
 if v_bait is not null then
  if not exists(select 1 from public.fishing_baits where id=v_bait) then raise exception 'ATTENDANCE_REWARD_UNAVAILABLE'; end if;
  v_count:=coalesce((w.inventory->>v_bait)::integer,0);
  if v_count>=2147483647 then raise exception 'INVENTORY_LIMIT'; end if;
  w.inventory:=jsonb_set(w.inventory,array[v_bait],to_jsonb(v_count+1));
 end if;
 update public.player_wallets set gold=gold+v_gold,inventory=w.inventory,updated_at=now() where user_id=v_uid;
 update public.player_attendance set last_claim_date=v_today,streak=v_streak,sheet_streak_offset=a.sheet_streak_offset,
  completed_sheets=completed_sheets+case when v_day=28 then 1 else 0 end where user_id=v_uid;
 insert into public.attendance_claims(user_id,claim_date,streak,sheet_day,bait_id,gold,fuel)
 values(v_uid,v_today,v_streak,v_day,v_bait,v_gold,v_fuel) returning * into c;
 if v_gold>0 then
  insert into public.gold_transactions(user_id,operation_id,action,item_id,delta)
  values(v_uid,c.operation_id,'charge','attendance:'||v_today::text,v_gold);
 end if;
 return app_private.attendance_state()||jsonb_build_object('replayed',false,'reward',to_jsonb(c));
end $$;
revoke all on function app_private.claim_attendance(date) from public,anon;
grant execute on function app_private.claim_attendance(date) to authenticated;
notify pgrst,'reload schema';
commit;
