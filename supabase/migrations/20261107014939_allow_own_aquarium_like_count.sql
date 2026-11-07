begin;
do $$begin
 if md5(replace(pg_get_functiondef('app_private.aquarium_like_state(uuid)'::regprocedure),chr(13),''))<>'2c7a748c3aeef53b49f821ca143f27cb' then raise exception 'AQUARIUM_LIKE_STATE_DRIFT';end if;
end$$;

CREATE OR REPLACE FUNCTION app_private.aquarium_like_state(p_owner uuid)
 RETURNS jsonb
 LANGUAGE plpgsql
 STABLE SECURITY DEFINER
 SET search_path TO ''
AS $function$
declare v_day date := (statement_timestamp() at time zone 'Asia/Seoul')::date;
begin
  if auth.uid() is null then raise exception 'AUTH_REQUIRED';end if;
  -- A player may read their own cumulative total; other owners remain friend-only.
  if p_owner is distinct from auth.uid() then
    perform app_private.require_aquarium_friend(p_owner);
  end if;
  return jsonb_build_object(
    'count', (select count(*) from app_private.aquarium_likes where owner_id = p_owner),
    'liked', exists (select 1 from app_private.aquarium_likes
      where owner_id = p_owner and visitor_id = auth.uid() and like_day = v_day),
    'nextLikeAt', ((v_day + 1)::timestamp at time zone 'Asia/Seoul'),
    'serverNow', statement_timestamp()
  );
end $function$;
commit;
