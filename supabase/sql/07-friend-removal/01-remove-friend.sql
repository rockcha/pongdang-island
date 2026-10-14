-- Apply AFTER 01~06. Keep relationship history so old notifications remain stable.
begin;
alter table public.friend_requests drop constraint if exists friend_requests_status_check;
alter table public.friend_requests add constraint friend_requests_status_check
  check(status in ('pending','accepted','declined','cancelled','removed'));
create or replace function app_private.remove_friend(p_request_id uuid)
returns void language plpgsql security definer set search_path = '' as $$
declare v_uid uuid := auth.uid(); v_request public.friend_requests;
begin
  if v_uid is null then raise exception 'AUTH_REQUIRED'; end if;
  select * into v_request from public.friend_requests where id=p_request_id for update;
  if not found then raise exception 'REQUEST_NOT_FOUND'; end if;
  if v_uid <> v_request.sender_id and v_uid <> v_request.recipient_id then raise exception 'NOT_ALLOWED'; end if;
  if v_request.status <> 'accepted' then raise exception 'FRIENDSHIP_NOT_ACTIVE'; end if;
  update public.friend_requests set status='removed',updated_at=now() where id=p_request_id;
  update public.notifications set read_at=coalesce(read_at,now()) where request_id=p_request_id;
  -- No separate unfriend notification. Existing UPDATE subscriptions update both lists.
end $$;
create or replace function public.remove_friend(p_request_id uuid) returns void
language sql security invoker set search_path = '' as $$ select app_private.remove_friend(p_request_id) $$;
revoke all on function app_private.remove_friend(uuid),public.remove_friend(uuid) from public,anon;
grant execute on function app_private.remove_friend(uuid),public.remove_friend(uuid) to authenticated;
notify pgrst, 'reload schema';
commit;