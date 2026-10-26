-- Preserve existing likes as historical contributions, dated in Korea time.
alter table app_private.aquarium_likes add column like_day date;
update app_private.aquarium_likes set like_day = (created_at at time zone 'Asia/Seoul')::date;
alter table app_private.aquarium_likes
  alter column like_day set not null,
  alter column like_day set default ((statement_timestamp() at time zone 'Asia/Seoul')::date),
  drop constraint aquarium_likes_pkey,
  add primary key (owner_id, visitor_id, like_day);

create or replace function app_private.aquarium_like_state(p_owner uuid)
returns jsonb language plpgsql stable security definer set search_path = '' as $function$
declare v_day date := (statement_timestamp() at time zone 'Asia/Seoul')::date;
begin
  perform app_private.require_aquarium_friend(p_owner);
  return jsonb_build_object(
    'count', (select count(*) from app_private.aquarium_likes where owner_id = p_owner),
    'liked', exists (select 1 from app_private.aquarium_likes
      where owner_id = p_owner and visitor_id = auth.uid() and like_day = v_day),
    'nextLikeAt', ((v_day + 1)::timestamp at time zone 'Asia/Seoul'),
    'serverNow', statement_timestamp()
  );
end $function$;

create or replace function app_private.set_aquarium_like(p_owner uuid, p_liked boolean)
returns jsonb language plpgsql security definer set search_path = '' as $function$
begin
  perform app_private.require_aquarium_friend(p_owner);
  if p_liked is null or p_owner = auth.uid() then raise exception 'INVALID_LIKE'; end if;
  perform pg_advisory_xact_lock(hashtextextended('aquarium-like:' || p_owner::text, 0));
  if p_liked then
    insert into app_private.aquarium_likes(owner_id, visitor_id, like_day)
    values (p_owner, auth.uid(), (statement_timestamp() at time zone 'Asia/Seoul')::date)
    on conflict (owner_id, visitor_id, like_day) do nothing;
  end if;
  -- Older clients may still send false. Cumulative likes cannot be removed.
  return app_private.aquarium_like_state(p_owner);
end $function$;

revoke all on app_private.aquarium_likes from public, anon, authenticated;
revoke all on function app_private.aquarium_like_state(uuid), app_private.set_aquarium_like(uuid, boolean) from public, anon;
grant execute on function app_private.aquarium_like_state(uuid), app_private.set_aquarium_like(uuid, boolean) to authenticated;
