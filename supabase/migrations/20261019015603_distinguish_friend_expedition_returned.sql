-- Preserve unclaimed trips in friend status so returned is not confused with absent.
create or replace function app_private.friend_expedition_status()
returns jsonb language plpgsql security definer set search_path='' as $$
declare u uuid:=auth.uid();
begin
 if u is null then raise exception 'AUTH_REQUIRED';end if;
 return jsonb_build_object('serverNow',clock_timestamp(),'friends',coalesce((
  select jsonb_agg(jsonb_build_object('friend_id',f.friend_id,'expedition_id',e.id,'returns_at',e.returns_at,
   'boosted',exists(select 1 from app_private.expedition_boosts b where b.expedition_id=e.id and b.helper_id=u)))
  from (select case when sender_id=u then recipient_id else sender_id end friend_id
   from public.friend_requests where status='accepted' and (sender_id=u or recipient_id=u)) f
  left join public.fishing_expeditions e on e.user_id=f.friend_id and e.claimed_at is null
 ),'[]'::jsonb));
end $$;
