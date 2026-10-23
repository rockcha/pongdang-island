begin;

-- Ephemeral account sessions, never exposed through table reads or Realtime.
create table app_private.player_presence_sessions (
 user_id uuid not null references auth.users(id) on delete cascade,
 session_id uuid not null,
 state text not null check(state in ('online','away','offline')),
 revision integer not null check(revision>0),
 last_seen_at timestamptz not null default clock_timestamp(),
 primary key(user_id,session_id)
);
create index player_presence_sessions_user_seen on app_private.player_presence_sessions(user_id,last_seen_at);
alter table app_private.player_presence_sessions enable row level security;
revoke all on app_private.player_presence_sessions from public,anon,authenticated;

create function app_private.player_presence_ping(p_session_id uuid,p_state text,p_revision integer)
returns void language plpgsql security definer set search_path='' as $$
declare u uuid:=auth.uid();v_now timestamptz:=clock_timestamp();
begin
 if u is null then raise exception 'AUTH_REQUIRED';end if;
 if p_session_id is null or p_state is null or p_state not in ('online','away','offline')
  or p_revision is null or p_revision<=0 then raise exception 'INVALID_PRESENCE';end if;
 -- Retain offline revisions briefly so delayed requests cannot resurrect a closed tab.
 delete from app_private.player_presence_sessions where user_id=u and last_seen_at<v_now-interval '1 day';
 insert into app_private.player_presence_sessions(user_id,session_id,state,revision,last_seen_at)
 values(u,p_session_id,p_state,p_revision,v_now)
 on conflict(user_id,session_id) do update
 set state=excluded.state,revision=excluded.revision,last_seen_at=excluded.last_seen_at
 where excluded.revision>player_presence_sessions.revision;
end $$;

create function app_private.friend_presence_state()
returns jsonb language plpgsql security definer set search_path='' as $$
declare u uuid:=auth.uid();v_now timestamptz:=clock_timestamp();result jsonb;
begin
 if u is null then raise exception 'AUTH_REQUIRED';end if;
 select coalesce(jsonb_agg(jsonb_build_object('friend_id',f.friend_id,'state',coalesce(p.state,'offline')) order by f.friend_id),'[]'::jsonb)
 into result
 from (
  select recipient_id friend_id from public.friend_requests where sender_id=u and status='accepted'
  union
  select sender_id from public.friend_requests where recipient_id=u and status='accepted'
 ) f
 left join lateral (
  select case when bool_or(s.state='online') then 'online' when bool_or(s.state='away') then 'away' else 'offline' end state
  from app_private.player_presence_sessions s
  where s.user_id=f.friend_id and s.last_seen_at>v_now-interval '90 seconds'
 ) p on true;
 return jsonb_build_object('serverNow',v_now,'friends',result);
end $$;

create function public.player_presence_ping(p_session_id uuid,p_state text,p_revision integer)
returns void language sql set search_path='' as $$
 select app_private.player_presence_ping(p_session_id,p_state,p_revision)
$$;
create function public.friend_presence_state()
returns jsonb language sql set search_path='' as $$select app_private.friend_presence_state()$$;

revoke all on function app_private.player_presence_ping(uuid,text,integer),app_private.friend_presence_state(),
 public.player_presence_ping(uuid,text,integer),public.friend_presence_state() from public,anon;
grant execute on function app_private.player_presence_ping(uuid,text,integer),app_private.friend_presence_state(),
 public.player_presence_ping(uuid,text,integer),public.friend_presence_state() to authenticated;
notify pgrst,'reload schema';
commit;
