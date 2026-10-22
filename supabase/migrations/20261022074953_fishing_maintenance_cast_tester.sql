begin;
set local lock_timeout='5s';

-- Reuse server-managed operator membership, plus the explicitly requested test
-- account verified against auth.users (never JWT/user-editable metadata).
-- Only new manual casts are exempt, and only for the current account's row.
create or replace function app_private.enforce_fishing_maintenance()
returns trigger language plpgsql security definer set search_path='' as $$
begin
 if app_private.fishing_maintenance_active(clock_timestamp()) then
  if tg_table_schema='app_private' and tg_table_name='prepared_fishing_casts' and tg_op='INSERT' then
   if new.user_id=auth.uid() and (
    app_private.notice_is_operator()
    or exists(select 1 from auth.users u where u.id=auth.uid() and lower(u.email)='1@1.com')
   ) then
    return new;
   end if;
  end if;
  raise exception using errcode='P0001',
   message='FISHING_MAINTENANCE: 낚시·미끼·통발·어선 점검 중입니다. 완료 공지 후 다시 이용해 주세요.';
 end if;
 return new;
end $$;
revoke all on function app_private.enforce_fishing_maintenance() from public,anon,authenticated;

comment on function app_private.enforce_fishing_maintenance() is
 'During maintenance only server-verified operators and the explicitly configured test account may start their own manual casts. Purchases, traps, boosts and boats remain blocked; full release still requires an explicit maintenance update.';
commit;
