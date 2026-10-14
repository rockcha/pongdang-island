begin;
-- Definer functions are kept in a non-exposed schema, with an auth.uid() check.
-- Public RPC wrappers are SECURITY INVOKER. No direct client table writes are granted.
create or replace function app_private.sync_player_profile()
returns public.player_profiles language plpgsql security definer set search_path = '' as $$
declare v_uid uuid := auth.uid(); v_name text; v_profile public.player_profiles;
begin
  if v_uid is null then raise exception 'AUTH_REQUIRED'; end if;
  select raw_user_meta_data ->> 'game_nickname' into v_name from auth.users where id = v_uid;
  if v_name is null or v_name !~ '^[가-힣a-zA-Z0-9_]{2,12}$' then raise exception 'NICKNAME_REQUIRED'; end if;
  -- Retry only the extraordinarily rare random-code collision.
  for attempt in 1..5 loop
    begin
      insert into public.player_profiles(id, nickname) values (v_uid, v_name)
      on conflict(id) do update set nickname = excluded.nickname
      returning * into v_profile;
      return v_profile;
    exception when unique_violation then
      if attempt = 5 then raise; end if;
    end;
  end loop;
  raise exception 'PROFILE_CREATE_FAILED';
end $$;

create or replace function app_private.find_player_by_code(p_code text)
returns setof public.player_profiles language plpgsql security definer set search_path = '' as $$
begin
  if auth.uid() is null then raise exception 'AUTH_REQUIRED'; end if;
  if upper(trim(p_code)) !~ '^[A-F0-9]{12}$' then raise exception 'INVALID_FRIEND_CODE'; end if;
  return query select * from public.player_profiles where friend_code = upper(trim(p_code)) limit 1;
end $$;

create or replace function app_private.send_friend_request(p_code text)
returns uuid language plpgsql security definer set search_path = '' as $$
declare v_uid uuid := auth.uid(); v_target uuid; v_id uuid; v_name text;
begin
  if v_uid is null then raise exception 'AUTH_REQUIRED'; end if;
  if upper(trim(p_code)) !~ '^[A-F0-9]{12}$' then raise exception 'INVALID_FRIEND_CODE'; end if;
  select id into v_target from public.player_profiles where friend_code = upper(trim(p_code));
  if v_target is null then raise exception 'PLAYER_NOT_FOUND'; end if;
  if v_target = v_uid then raise exception 'CANNOT_FRIEND_SELF'; end if;
  select nickname into v_name from public.player_profiles where id = v_uid;
  if v_name is null then raise exception 'NICKNAME_REQUIRED'; end if;
  -- Serialize a sender's rate limit checks and opposite-direction operations for a pair.
  perform pg_advisory_xact_lock(hashtextextended('sender:' || v_uid::text, 0));
  perform pg_advisory_xact_lock(hashtextextended(least(v_uid, v_target)::text || greatest(v_uid, v_target)::text, 1));
  if exists(select 1 from public.friend_requests where least(sender_id,recipient_id) = least(v_uid,v_target)
    and greatest(sender_id,recipient_id) = greatest(v_uid,v_target) and status in ('pending','accepted')) then
    raise exception 'RELATIONSHIP_EXISTS';
  end if;
  if (select count(*) from public.friend_requests where sender_id = v_uid and created_at > now() - interval '1 minute') >= 5
    or (select count(*) from public.friend_requests where sender_id = v_uid and status = 'pending') >= 30
    or exists(select 1 from public.friend_requests where least(sender_id,recipient_id) = least(v_uid,v_target)
      and greatest(sender_id,recipient_id) = greatest(v_uid,v_target) and updated_at > now() - interval '1 minute') then
    raise exception 'FRIEND_RATE_LIMIT';
  end if;
  insert into public.friend_requests(sender_id,recipient_id) values(v_uid,v_target) returning id into v_id;
  insert into public.notifications(recipient_id,actor_id,category,kind,title,body,request_id)
    values(v_target,v_uid,'friend','friend_request',v_name || '님의 친구 요청','함께 퐁당섬에서 낚시해요.',v_id);
  return v_id;
end $$;

create or replace function app_private.respond_friend_request(p_request_id uuid, p_action text)
returns void language plpgsql security definer set search_path = '' as $$
declare v_uid uuid := auth.uid(); v_request public.friend_requests; v_name text;
begin
  if v_uid is null then raise exception 'AUTH_REQUIRED'; end if;
  select * into v_request from public.friend_requests where id = p_request_id for update;
  if not found then raise exception 'REQUEST_NOT_FOUND'; end if;
  if p_action is null or p_action not in ('accept','decline','cancel') then raise exception 'INVALID_ACTION'; end if;
  if (p_action = 'cancel' and v_request.sender_id <> v_uid)
    or (p_action in ('accept','decline') and v_request.recipient_id <> v_uid) then raise exception 'NOT_ALLOWED'; end if;
  if v_request.status <> 'pending' then raise exception 'REQUEST_ALREADY_HANDLED'; end if;
  update public.friend_requests set status = case p_action when 'accept' then 'accepted' when 'decline' then 'declined' else 'cancelled' end,
    updated_at = now() where id = p_request_id;
  update public.notifications set read_at = coalesce(read_at,now()) where request_id = p_request_id and kind = 'friend_request';
  if p_action = 'accept' then
    select nickname into v_name from public.player_profiles where id = v_uid;
    insert into public.notifications(recipient_id,actor_id,category,kind,title,body,request_id)
      values(v_request.sender_id,v_uid,'friend','friend_accepted',v_name || '님과 친구가 됐어요','친구 목록에서 확인해보세요.',p_request_id);
  end if;
end $$;

create or replace function public.sync_player_profile() returns public.player_profiles
language sql security invoker set search_path = '' as $$ select app_private.sync_player_profile() $$;
create or replace function public.find_player_by_code(p_code text) returns setof public.player_profiles
language sql security invoker set search_path = '' as $$ select * from app_private.find_player_by_code(p_code) $$;
create or replace function public.send_friend_request(p_code text) returns uuid
language sql security invoker set search_path = '' as $$ select app_private.send_friend_request(p_code) $$;
create or replace function public.respond_friend_request(p_request_id uuid, p_action text) returns void
language sql security invoker set search_path = '' as $$ select app_private.respond_friend_request(p_request_id,p_action) $$;

revoke all on function app_private.sync_player_profile(), app_private.find_player_by_code(text), app_private.send_friend_request(text), app_private.respond_friend_request(uuid,text) from public, anon;
revoke all on function public.sync_player_profile(), public.find_player_by_code(text), public.send_friend_request(text), public.respond_friend_request(uuid,text) from public, anon;
grant execute on function app_private.sync_player_profile(), app_private.find_player_by_code(text), app_private.send_friend_request(text), app_private.respond_friend_request(uuid,text) to authenticated;
grant execute on function public.sync_player_profile(), public.find_player_by_code(text), public.send_friend_request(text), public.respond_friend_request(uuid,text) to authenticated;
commit;
