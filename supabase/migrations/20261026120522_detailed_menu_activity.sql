-- Add caller-owned activity summaries; existing fields and grants are preserved.
begin;
create or replace function app_private.menu_status()
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
      'total',(select count(*) from public.harbor_boats where user_id=caller and sold_at is null),
      'dockSlots',coalesce((select dock_slots from app_private.player_harbor_capacity where user_id=caller),2),
      'returnsAt',coalesce((select jsonb_agg(returns_at) from public.harbor_voyages where user_id=caller and claimed_at is null),'[]'::jsonb)),
    'expedition', jsonb_build_object('returnsAt',(select returns_at from public.fishing_expeditions where user_id=caller and claimed_at is null)),
    'personalBait',jsonb_build_object('completesAt',(select completes_at from app_private.personal_bait_jobs where user_id=caller and claimed_at is null order by started_at desc limit 1)),
    'savings', jsonb_build_object('account',(select app_private.savings_payload(a,sampled_at) from public.shell_savings a where a.user_id=caller and a.closed_at is null))
  );
end;
$$;
notify pgrst,'reload schema';
commit;
