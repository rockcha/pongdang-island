begin;
-- A ready-notification worker can briefly hold a site without a wallet lock.
-- Skip that site rather than waiting across its expiry boundary. All other
-- receipt, equipment, inventory-cap and owner checks remain authoritative.
create or replace function app_private.auto_claim_production(p_user uuid)
returns integer language plpgsql security definer set search_path='' as $function$
declare w public.player_wallets; run record; equipped text; items jsonb;
 stamp timestamptz; claim_time timestamptz; count_claimed integer:=0; next_count bigint;
 fuel_count bigint:=0; bait_count bigint:=0; summary text;
begin
 if p_user is null or not exists (
  select 1 from app_private.player_relic_loadouts l join public.fishing_relics r on r.id=l.relic_id
  where l.user_id=p_user and r.enabled and r.effect_kind='production_auto_claim' and r.effect_value=1
 ) then return 0; end if;
 select * into w from public.player_wallets where user_id=p_user for update skip locked;
 if not found then return 0; end if;
 select l.relic_id into equipped from app_private.player_relic_loadouts l join public.fishing_relics r on r.id=l.relic_id
 where l.user_id=p_user and r.enabled and r.effect_kind='production_auto_claim' and r.effect_value=1;
 if equipped is null then return 0; end if;
 stamp:=clock_timestamp(); items:=w.inventory;
 for run in
  select 'fuel'::text kind,s.id,s.started_at,s.completes_at,s.expires_at,s.run_output,'fuel'::text item_id
  from app_private.production_sites s where s.user_id=p_user and s.started_at is not null
   and s.completes_at<=stamp and s.expires_at>stamp
  union all
  select 'bait',s.id,s.started_at,s.completes_at,s.expires_at,s.run_output,s.run_bait_id
  from app_private.bait_production_sites s where s.user_id=p_user and s.started_at is not null
   and s.completes_at<=stamp and s.expires_at>stamp
  order by completes_at,kind,id limit 500
 loop
  next_count:=coalesce((items->>run.item_id)::bigint,0)+run.run_output;
  if next_count>1000000000 then continue; end if;
  if run.kind='fuel' then
   perform 1 from app_private.production_sites where id=run.id and user_id=p_user
    and started_at=run.started_at and expires_at>clock_timestamp() for update skip locked;
  else
   perform 1 from app_private.bait_production_sites where id=run.id and user_id=p_user
    and started_at=run.started_at and expires_at>clock_timestamp() for update skip locked;
  end if;
  if not found then continue; end if;
  claim_time:=clock_timestamp();
  if claim_time>=run.expires_at then continue; end if;
  insert into app_private.production_auto_claims(user_id,kind,site_id,started_at,completed_at,claimed_at,item_id,amount,relic_id)
  values(p_user,run.kind,run.id,run.started_at,run.completes_at,claim_time,run.item_id,run.run_output,equipped)
  on conflict(kind,site_id,started_at) do nothing;
  if not found then continue; end if;
  items:=jsonb_set(items,array[run.item_id],to_jsonb(next_count::integer));
  if run.kind='fuel' then
   update app_private.production_sites set started_at=null,completes_at=null,expires_at=null,run_output=null where id=run.id and user_id=p_user;
   fuel_count:=fuel_count+run.run_output;
   update public.notifications set read_at=coalesce(read_at,stamp) where recipient_id=p_user
    and production_site_id=run.id and production_started_at=run.started_at;
  else
   update app_private.bait_production_sites set started_at=null,completes_at=null,expires_at=null,run_output=null,run_bait_id=null,notified_started_at=null
    where id=run.id and user_id=p_user;
   bait_count:=bait_count+run.run_output;
   update public.notifications set read_at=coalesce(read_at,stamp) where recipient_id=p_user
    and bait_production_site_id=run.id and bait_production_started_at=run.started_at;
  end if;
  count_claimed:=count_claimed+1;
 end loop;
 if count_claimed>0 then
  update public.player_wallets set inventory=items,updated_at=clock_timestamp() where user_id=p_user;
  summary:=concat_ws(' · ',case when fuel_count>0 then '연료 '||fuel_count||'개' end,case when bait_count>0 then '미끼 '||bait_count||'개' end);
  insert into public.notifications(recipient_id,category,kind,title,body,production_auto_claim)
  values(p_user,'general','system','수확종이 생산물을 챙겼어요',summary||'를 자동으로 수령했어요. 생산소에서 다음 생산을 시작할 수 있어요.',true);
 end if;
 return count_claimed;
end $function$;
revoke all on function app_private.auto_claim_production(uuid) from public,anon,authenticated;
commit;
