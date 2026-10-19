-- Friend assistance is available only while sailing, including on the visit page.
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
  left join public.fishing_expeditions e on e.user_id=f.friend_id and e.claimed_at is null and e.returns_at>clock_timestamp()
 ),'[]'::jsonb));
end $$;

create function app_private.friend_expedition(p_owner uuid)
returns jsonb language plpgsql security definer set search_path='' as $$
declare e public.fishing_expeditions;
begin
 perform app_private.require_aquarium_friend(p_owner);
 select * into e from public.fishing_expeditions where user_id=p_owner and claimed_at is null and returns_at>clock_timestamp();
 return jsonb_build_object('serverNow',clock_timestamp(),
  'owner',(select jsonb_build_object('id',id,'nickname',nickname,'avatar_path',avatar_path) from public.player_profiles where id=p_owner),
  'active',case when e.id is null then null else jsonb_build_object('id',e.id,'region_id',e.region_id,'departed_at',e.departed_at,'returns_at',e.returns_at,
   'vessel_snapshot',e.vessel_snapshot,'cargo',e.cargo,'boosts',app_private.expedition_boosts_payload(e.id)) end,
  'regionName',(select name from public.regions where id=e.region_id),
  'boosted',exists(select 1 from app_private.expedition_boosts where expedition_id=e.id and helper_id=auth.uid()),
  'baits',coalesce((select jsonb_agg(jsonb_build_object('id',id,'name',name,'image_path',image_path) order by sort_order) from public.fishing_baits where e.cargo ? id),'[]'::jsonb));
end $$;
create function public.friend_expedition(p_owner uuid)
returns jsonb language sql security invoker set search_path='' as $$ select app_private.friend_expedition(p_owner); $$;
revoke all on function app_private.friend_expedition(uuid),public.friend_expedition(uuid) from public,anon,authenticated;
grant execute on function app_private.friend_expedition(uuid),public.friend_expedition(uuid) to authenticated;
