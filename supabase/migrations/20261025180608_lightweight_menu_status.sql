-- Private production tables must stay inaccessible to the Data API. This
-- authenticated, caller-scoped helper exposes deadlines and counts only.
create function app_private.menu_status()
returns jsonb language plpgsql stable security definer set search_path = ''
as $$
declare caller uuid := auth.uid(); sampled_at timestamptz := now();
begin
  if caller is null then raise exception 'AUTH_REQUIRED' using errcode='42501'; end if;
  return jsonb_build_object(
    'serverNow', sampled_at,
    'production', (select jsonb_build_object('total',count(*),'sites',coalesce(jsonb_agg(
      jsonb_build_object('completesAt',completes_at,'expiresAt',expires_at)
    ) filter(where started_at is not null),'[]'::jsonb)) from app_private.production_sites where user_id=caller),
    'baitProduction', (select jsonb_build_object('total',count(*),'sites',coalesce(jsonb_agg(
      jsonb_build_object('completesAt',completes_at,'expiresAt',expires_at)
    ) filter(where started_at is not null),'[]'::jsonb)) from app_private.bait_production_sites where user_id=caller),
    'harbor', jsonb_build_object(
      'dockSlots',coalesce((select dock_slots from app_private.player_harbor_capacity where user_id=caller),2),
      'returnsAt',coalesce((select jsonb_agg(returns_at) from public.harbor_voyages where user_id=caller and claimed_at is null),'[]'::jsonb)),
    'expedition', jsonb_build_object('returnsAt',(select returns_at from public.fishing_expeditions where user_id=caller and claimed_at is null)),
    'savings', jsonb_build_object('account',(select app_private.savings_payload(a,sampled_at) from public.shell_savings a where a.user_id=caller and a.closed_at is null))
  );
end;
$$;
revoke all on function app_private.menu_status() from public, anon;
grant execute on function app_private.menu_status() to authenticated;
create function public.menu_status()
returns jsonb language sql stable security invoker set search_path = ''
as $$ select app_private.menu_status(); $$;
revoke all on function public.menu_status() from public, anon;
grant execute on function public.menu_status() to authenticated;
