-- One snapshot for the inbox and all badge counts. Invoker security deliberately
-- preserves the existing notice visibility and participant RLS policies.
create function public.notification_inbox()
returns jsonb
language plpgsql
stable
security invoker
set search_path = ''
as $$
declare
  caller uuid := auth.uid();
  result jsonb;
begin
  if caller is null then
    raise exception 'AUTH_REQUIRED' using errcode = '42501';
  end if;
  with recent as (
    select n.* from public.notifications n
    where n.recipient_id = caller
    order by n.created_at desc, n.id desc limit 100
  ), items as (
    select coalesce(jsonb_agg(
      to_jsonb(n) || jsonb_build_object(
        'request', case when r.id is null then null else jsonb_build_object(
          'id', r.id, 'sender_id', r.sender_id, 'recipient_id', r.recipient_id, 'status', r.status) end,
        'notice', case when notice.id is null then null else jsonb_build_object('category', notice.category) end
      ) order by n.created_at desc, n.id desc
    ), '[]'::jsonb) as value
    from recent n
    left join public.friend_requests r on r.id = n.request_id
    left join public.notices notice on notice.id = n.notice_id
  ), unread as (
    select count(*) filter (where category = 'friend') as friend,
      count(*) filter (where category = 'general') as general,
      count(*) filter (where category = 'gift' and kind <> 'gift_received') as gift,
      count(*) filter (where category = 'notice') as notice
    from public.notifications where recipient_id = caller and read_at is null
  ), gifts as (
    select count(*) as pending from public.collectible_gifts
    where recipient_id = caller and status = 'pending' and exchange_hold = false
  )
  select jsonb_build_object('notifications', items.value, 'unread', jsonb_build_object(
    'friend', unread.friend, 'general', unread.general,
    'gift', unread.gift + gifts.pending, 'notice', unread.notice
  )) into result from items cross join unread cross join gifts;
  return result;
end;
$$;
revoke all on function public.notification_inbox() from public, anon;
grant execute on function public.notification_inbox() to authenticated;
