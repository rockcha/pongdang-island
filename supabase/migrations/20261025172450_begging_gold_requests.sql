create table app_private.begging_requests (
 id uuid primary key,
 creator_id uuid references auth.users(id) on delete set null,
 creator_name text not null,
 creator_avatar text,
 story text not null check(char_length(btrim(story)) between 1 and 500 and story ~ '[^[:space:]]'),
 goal_gold integer not null check(goal_gold between 100 and 1000000000),
 received_gold bigint not null default 0 check(received_gold>=0),
 status text not null default 'active' check(status in ('active','completed','closed')),
 created_at timestamptz not null default clock_timestamp(),
 closed_at timestamptz,
 check((status='active' and received_gold<goal_gold and closed_at is null)
  or(status='completed' and received_gold>=goal_gold and closed_at is not null)
  or(status='closed' and closed_at is not null))
);
create unique index begging_one_active on app_private.begging_requests(creator_id) where status='active';
create index begging_active_feed on app_private.begging_requests(created_at desc,id) where status='active' and creator_id is not null;
create index begging_creator_feed on app_private.begging_requests(creator_id,created_at desc,id);
alter table app_private.begging_requests enable row level security;
revoke all on app_private.begging_requests from public,anon,authenticated;

create table app_private.begging_transfers (
 id uuid primary key,
 request_id uuid not null references app_private.begging_requests(id),
 sender_id uuid references auth.users(id) on delete set null,
 recipient_id uuid references auth.users(id) on delete set null,
 sender_name text not null,
 sender_avatar text,
 recipient_name text not null,
 recipient_avatar text,
 gold integer not null check(gold between 100 and 1000000000),
 xp integer not null default 2 check(xp=2),
 created_at timestamptz not null default clock_timestamp(),
 check(sender_id is distinct from recipient_id or sender_id is null)
);
create index begging_transfers_request on app_private.begging_transfers(request_id,created_at,id);
create index begging_transfers_sender on app_private.begging_transfers(sender_id,created_at desc,id);
create index begging_transfers_recipient on app_private.begging_transfers(recipient_id,created_at desc,id);
alter table app_private.begging_transfers enable row level security;
revoke all on app_private.begging_transfers from public,anon,authenticated;

create function app_private.begging_payload(p_id uuid) returns jsonb
language sql stable set search_path='' as $function$
 select jsonb_build_object('id',r.id,'story',r.story,'goalGold',r.goal_gold,'receivedGold',r.received_gold,
  'status',case when r.creator_id is null and r.status='active' then 'closed' else r.status end,
  'createdAt',r.created_at,'closedAt',r.closed_at,'mine',coalesce(r.creator_id=auth.uid(),false),
  'owner',jsonb_build_object('id',r.creator_id,'nickname',coalesce(p.nickname,r.creator_name),'avatarPath',case when p.id is not null then p.avatar_path else r.creator_avatar end),
  'transferCount',(select count(*) from app_private.begging_transfers t where t.request_id=r.id),
  'donors',coalesce((select jsonb_agg(q.person order by q.created_at,q.id) from (
   select t.id,t.created_at,jsonb_build_object('id',t.id,'nickname',coalesce(p.nickname,t.sender_name),
    'avatarPath',case when p.id is not null then p.avatar_path else t.sender_avatar end,'gold',t.gold) person
   from app_private.begging_transfers t left join public.player_profiles p on p.id=t.sender_id
   where t.request_id=r.id order by t.created_at,t.id limit 4
  )q),'[]'::jsonb)
 ) from app_private.begging_requests r left join public.player_profiles p on p.id=r.creator_id where r.id=p_id
$function$;
revoke all on function app_private.begging_payload(uuid) from public,anon,authenticated;

create function app_private.begging_state(p_tab text default 'active',p_offset integer default 0) returns jsonb
language plpgsql stable security definer set search_path='' as $function$
declare u uuid:=auth.uid();items jsonb;
begin
 if u is null then raise exception 'AUTH_REQUIRED';end if;
 if p_tab is null or p_tab not in ('active','mine') or p_offset is null or p_offset<0 or p_offset>10000 then raise exception 'INVALID_BEGGING';end if;
 select coalesce(jsonb_agg(app_private.begging_payload(q.id) order by q.created_at desc,q.id),'[]'::jsonb) into items from (
  select r.id,r.created_at from app_private.begging_requests r where
  (p_tab='active' and r.status='active' and r.creator_id is not null) or(p_tab='mine' and r.creator_id=u)
  order by r.created_at desc,r.id limit 11 offset p_offset
 )q;
 return jsonb_build_object('items',case when jsonb_array_length(items)>10 then items-10 else items end,'hasMore',jsonb_array_length(items)>10);
end $function$;

create function app_private.begging_detail(p_id uuid,p_offset integer default 0) returns jsonb
language plpgsql stable security definer set search_path='' as $function$
declare r jsonb;items jsonb;
begin
 if auth.uid() is null then raise exception 'AUTH_REQUIRED';end if;
 if p_offset is null or p_offset<0 or p_offset>10000000 then raise exception 'INVALID_BEGGING';end if;
 r:=app_private.begging_payload(p_id);if r is null then raise exception 'BEGGING_NOT_FOUND';end if;
 select coalesce(jsonb_agg(q.person order by q.created_at,q.id),'[]'::jsonb) into items from (
  select t.id,t.created_at,jsonb_build_object('id',t.id,'nickname',coalesce(p.nickname,t.sender_name),
   'avatarPath',case when p.id is not null then p.avatar_path else t.sender_avatar end,'gold',t.gold,'createdAt',t.created_at) person
  from app_private.begging_transfers t left join public.player_profiles p on p.id=t.sender_id
  where t.request_id=p_id order by t.created_at,t.id limit 21 offset p_offset
 )q;
 return jsonb_build_object('request',r,'items',case when jsonb_array_length(items)>20 then items-20 else items end,'hasMore',jsonb_array_length(items)>20);
end $function$;

create function app_private.begging_history(p_offset integer default 0) returns jsonb
language plpgsql stable security definer set search_path='' as $function$
declare u uuid:=auth.uid();items jsonb;
begin
 if u is null then raise exception 'AUTH_REQUIRED';end if;
 if p_offset is null or p_offset<0 or p_offset>10000000 then raise exception 'INVALID_BEGGING';end if;
 select coalesce(jsonb_agg(q.item order by q.created_at desc,q.id desc),'[]'::jsonb) into items from (
  select t.id,t.created_at,jsonb_build_object('id',t.id,'requestId',t.request_id,'story',left(r.story,80),
   'gold',t.gold,'xp',case when t.sender_id=u then t.xp else 0 end,'direction',case when t.sender_id=u then 'sent' else 'received' end,
   'createdAt',t.created_at,'person',case when t.sender_id=u then
    jsonb_build_object('nickname',coalesce(b.nickname,t.recipient_name),'avatarPath',case when b.id is not null then b.avatar_path else t.recipient_avatar end)
    else jsonb_build_object('nickname',coalesce(a.nickname,t.sender_name),'avatarPath',case when a.id is not null then a.avatar_path else t.sender_avatar end) end) item
  from app_private.begging_transfers t join app_private.begging_requests r on r.id=t.request_id
  left join public.player_profiles a on a.id=t.sender_id left join public.player_profiles b on b.id=t.recipient_id
  where t.sender_id=u or t.recipient_id=u order by t.created_at desc,t.id desc limit 21 offset p_offset
 )q;
 return jsonb_build_object('items',case when jsonb_array_length(items)>20 then items-20 else items end,'hasMore',jsonb_array_length(items)>20);
end $function$;

create function app_private.begging_create(p_operation_id uuid,p_story text,p_goal_gold integer) returns jsonb
language plpgsql security definer set search_path='' as $function$
declare u uuid:=auth.uid();p public.player_profiles;r app_private.begging_requests;body text:=btrim(p_story);
begin
 if u is null then raise exception 'AUTH_REQUIRED';end if;
 if p_operation_id is null or body is null or char_length(body) not between 1 and 500 or body !~ '[^[:space:]]' or p_goal_gold is null or p_goal_gold not between 100 and 1000000000 then raise exception 'INVALID_BEGGING';end if;
 select * into p from public.player_profiles where id=u;
 if not found then p:=app_private.sync_player_profile();end if;
 perform app_private.get_gold_wallet();
 perform 1 from public.player_wallets where user_id=u for update;
 select * into r from app_private.begging_requests where id=p_operation_id;
 if found then
  if r.creator_id is distinct from u or r.story<>body or r.goal_gold<>p_goal_gold then raise exception 'OPERATION_CONFLICT';end if;
  return app_private.begging_payload(r.id);
 end if;
 if exists(select 1 from app_private.begging_requests where creator_id=u and status='active') then raise exception 'BEGGING_ALREADY_ACTIVE';end if;
 insert into app_private.begging_requests(id,creator_id,creator_name,creator_avatar,story,goal_gold)
 values(p_operation_id,u,p.nickname,p.avatar_path,body,p_goal_gold);
 return app_private.begging_payload(p_operation_id);
end $function$;

create function app_private.begging_give(p_id uuid,p_gold integer,p_operation_id uuid) returns jsonb
language plpgsql security definer set search_path='' as $function$
declare u uuid:=auth.uid();recipient uuid;sender public.player_profiles;receiver public.player_profiles;
 sender_gold integer;receiver_gold integer;r app_private.begging_requests;previous app_private.begging_transfers;
begin
 if u is null then raise exception 'AUTH_REQUIRED';end if;
 if p_id is null or p_operation_id is null or p_gold is null or p_gold not between 100 and 1000000000 then raise exception 'INVALID_BEGGING_AMOUNT';end if;
 -- Completed receipts remain replayable even if the recipient later leaves.
 select * into previous from app_private.begging_transfers where id=p_operation_id;
 if found then
  if previous.sender_id is distinct from u or previous.request_id<>p_id or previous.gold<>p_gold then raise exception 'OPERATION_CONFLICT';end if;
  return jsonb_build_object('request',app_private.begging_payload(p_id),'receipt',jsonb_build_object('id',previous.id,'gold',previous.gold,'xp',previous.xp,'replayed',true));
 end if;
 select * into sender from public.player_profiles where id=u;
 if not found then sender:=app_private.sync_player_profile();end if;
 select creator_id into recipient from app_private.begging_requests where id=p_id;
 if not found then raise exception 'BEGGING_NOT_FOUND';end if;
 if recipient=u then raise exception 'BEGGING_SELF_GIVE';end if;
 if recipient is null then raise exception 'BEGGING_CLOSED';end if;
 perform app_private.get_gold_wallet();
 -- Lock both wallets in UUID order BEFORE the request and XP rows. Opposite
 -- donations between the same accounts therefore use the same lock order.
 insert into public.player_wallets(user_id) values(recipient) on conflict do nothing;
 perform 1 from public.player_wallets where user_id in(u,recipient) order by user_id for update;
 select * into previous from app_private.begging_transfers where id=p_operation_id;
 if found then
  if previous.sender_id is distinct from u or previous.request_id<>p_id or previous.gold<>p_gold then raise exception 'OPERATION_CONFLICT';end if;
  return jsonb_build_object('request',app_private.begging_payload(p_id),'receipt',jsonb_build_object('id',previous.id,'gold',previous.gold,'xp',previous.xp,'replayed',true));
 end if;
 select * into r from app_private.begging_requests where id=p_id for update;
 if r.status<>'active' or r.creator_id is distinct from recipient then raise exception 'BEGGING_CLOSED';end if;
 select gold into strict sender_gold from public.player_wallets where user_id=u;
 select gold into strict receiver_gold from public.player_wallets where user_id=recipient;
 if sender_gold<p_gold then raise exception 'INSUFFICIENT_GOLD';end if;
 if receiver_gold::bigint+p_gold>1000000000 then raise exception 'RECIPIENT_GOLD_LIMIT';end if;
 select * into strict receiver from public.player_profiles where id=recipient;
 insert into app_private.begging_transfers(id,request_id,sender_id,recipient_id,sender_name,sender_avatar,recipient_name,recipient_avatar,gold)
 values(p_operation_id,p_id,u,recipient,sender.nickname,sender.avatar_path,receiver.nickname,receiver.avatar_path,p_gold);
 update public.player_wallets set gold=gold+case when user_id=u then -p_gold else p_gold end,updated_at=clock_timestamp() where user_id in(u,recipient);
 update app_private.begging_requests set received_gold=received_gold+p_gold,
  status=case when received_gold+p_gold>=goal_gold then 'completed' else 'active' end,
  closed_at=case when received_gold+p_gold>=goal_gold then clock_timestamp() else null end where id=p_id;
 perform app_private.award_experience(u,'begging',p_operation_id,2);
 return jsonb_build_object('request',app_private.begging_payload(p_id),'receipt',jsonb_build_object('id',p_operation_id,'gold',p_gold,'xp',2,'replayed',false));
end $function$;

create function app_private.begging_close(p_id uuid) returns jsonb
language plpgsql security definer set search_path='' as $function$
declare u uuid:=auth.uid();r app_private.begging_requests;
begin
 if u is null then raise exception 'AUTH_REQUIRED';end if;
 select * into r from app_private.begging_requests where id=p_id for update;
 if not found then raise exception 'BEGGING_NOT_FOUND';end if;
 if r.creator_id is distinct from u then raise exception 'BEGGING_FORBIDDEN';end if;
 if r.status='active' then update app_private.begging_requests set status='closed',closed_at=clock_timestamp() where id=p_id;end if;
 return app_private.begging_payload(p_id);
end $function$;

create function public.begging_state(p_tab text default 'active',p_offset integer default 0) returns jsonb language sql set search_path='' as $function$select app_private.begging_state(p_tab,p_offset)$function$;
create function public.begging_detail(p_id uuid,p_offset integer default 0) returns jsonb language sql set search_path='' as $function$select app_private.begging_detail(p_id,p_offset)$function$;
create function public.begging_history(p_offset integer default 0) returns jsonb language sql set search_path='' as $function$select app_private.begging_history(p_offset)$function$;
create function public.begging_create(p_operation_id uuid,p_story text,p_goal_gold integer) returns jsonb language sql set search_path='' as $function$select app_private.begging_create(p_operation_id,p_story,p_goal_gold)$function$;
create function public.begging_give(p_id uuid,p_gold integer,p_operation_id uuid) returns jsonb language sql set search_path='' as $function$select app_private.begging_give(p_id,p_gold,p_operation_id)$function$;
create function public.begging_close(p_id uuid) returns jsonb language sql set search_path='' as $function$select app_private.begging_close(p_id)$function$;
revoke all on function app_private.begging_state(text,integer),app_private.begging_detail(uuid,integer),app_private.begging_history(integer),app_private.begging_create(uuid,text,integer),app_private.begging_give(uuid,integer,uuid),app_private.begging_close(uuid),public.begging_state(text,integer),public.begging_detail(uuid,integer),public.begging_history(integer),public.begging_create(uuid,text,integer),public.begging_give(uuid,integer,uuid),public.begging_close(uuid) from public,anon,authenticated;
grant execute on function app_private.begging_state(text,integer),app_private.begging_detail(uuid,integer),app_private.begging_history(integer),app_private.begging_create(uuid,text,integer),app_private.begging_give(uuid,integer,uuid),app_private.begging_close(uuid),public.begging_state(text,integer),public.begging_detail(uuid,integer),public.begging_history(integer),public.begging_create(uuid,text,integer),public.begging_give(uuid,integer,uuid),public.begging_close(uuid) to authenticated;
notify pgrst,'reload schema';
-- Add the new XP source last, then validate in a separate migration/transaction
-- so existing XP writes are not blocked while historical rows are checked.
alter table app_private.experience_events drop constraint experience_events_source_check,
 add constraint experience_events_source_check check(source in('manual','trap','harbor','friend_lure','friend_feeding','friend_cleaning','begging')) not valid;
