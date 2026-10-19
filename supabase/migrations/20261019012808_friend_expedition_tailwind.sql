-- A helper may send one tailwind per departure. Row locks serialize helpers
-- against each other and result collection; all effects commit together.
create table app_private.expedition_boosts (
 id uuid primary key default gen_random_uuid(),
 expedition_id uuid not null references public.fishing_expeditions(id) on delete cascade,
 helper_id uuid not null references public.player_profiles(id) on delete cascade,
 nickname text not null,
 avatar_path text,
 minutes integer not null default 10 check (minutes=10),
 created_at timestamptz not null default clock_timestamp(),
 unique(expedition_id,helper_id)
);
create index expedition_boosts_helper on app_private.expedition_boosts(helper_id);
alter table app_private.expedition_boosts enable row level security;
revoke all on app_private.expedition_boosts from public,anon,authenticated;

-- Keep the existing one-return-notice-per-trip key untouched.
alter table public.notifications add column expedition_boost_id uuid references app_private.expedition_boosts(id) on delete set null;
create unique index notifications_expedition_boost_once on public.notifications(expedition_boost_id) where expedition_boost_id is not null;

create function app_private.expedition_boosts_payload(p_expedition uuid)
returns jsonb language sql stable set search_path='' as $$
 select coalesce(jsonb_agg(jsonb_build_object('id',id,'nickname',nickname,'avatar_path',avatar_path,'minutes',minutes,'created_at',created_at) order by created_at,id),'[]'::jsonb)
 from app_private.expedition_boosts where expedition_id=p_expedition;
$$;
revoke all on function app_private.expedition_boosts_payload(uuid) from public,anon,authenticated;

create function app_private.friend_expedition_status()
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

create function app_private.boost_friend_expedition(p_expedition_id uuid)
returns jsonb language plpgsql security definer set search_path='' as $$
declare u uuid:=auth.uid();e public.fishing_expeditions;b app_private.expedition_boosts;owner_id uuid;t timestamptz;
begin
 if u is null then raise exception 'AUTH_REQUIRED';end if;
 select user_id into owner_id from public.fishing_expeditions where id=p_expedition_id;
 if not found then raise exception 'EXPEDITION_NOT_FOUND';end if;
 -- Locks the accepted friendship before the expedition, also excluding self.
 perform app_private.require_aquarium_friend(owner_id);
 select * into e from public.fishing_expeditions where id=p_expedition_id for update;
 if not found then raise exception 'EXPEDITION_NOT_FOUND';end if;
 -- A retried response must succeed even when this help caused the boat to return.
 select * into b from app_private.expedition_boosts where expedition_id=e.id and helper_id=u;
 if found then return app_private.friend_expedition_status()||jsonb_build_object('replayed',true);end if;
 t:=clock_timestamp();
 if e.claimed_at is not null or e.returns_at<=t then raise exception 'EXPEDITION_NOT_SAILING';end if;
 insert into app_private.expedition_boosts(expedition_id,helper_id,nickname,avatar_path)
 select e.id,u,nickname,avatar_path from public.player_profiles where id=u returning * into b;
 if not found then raise exception 'NICKNAME_REQUIRED';end if;
 insert into public.notifications(recipient_id,actor_id,category,kind,title,body,expedition_boost_id)
 values(e.user_id,u,'general','system',b.nickname||'님이 순풍을 보내줬어요',
 '파견 중인 '||(e.vessel_snapshot->>'name')||'의 귀항이 최대 10분 빨라졌어요.',b.id);
 update public.fishing_expeditions set returns_at=greatest(t,returns_at-interval '10 minutes') where id=e.id;
 return app_private.friend_expedition_status()||jsonb_build_object('replayed',false);
end $$;

create function public.friend_expedition_status()
returns jsonb language sql security invoker set search_path='' as $$ select app_private.friend_expedition_status(); $$;
create function public.boost_friend_expedition(p_expedition_id uuid)
returns jsonb language sql security invoker set search_path='' as $$ select app_private.boost_friend_expedition(p_expedition_id); $$;
revoke all on function app_private.friend_expedition_status(),app_private.boost_friend_expedition(uuid),public.friend_expedition_status(),public.boost_friend_expedition(uuid) from public,anon,authenticated;
grant execute on function app_private.friend_expedition_status(),app_private.boost_friend_expedition(uuid),public.friend_expedition_status(),public.boost_friend_expedition(uuid) to authenticated;

create or replace function app_private.expedition_state()
returns jsonb language plpgsql security definer set search_path='' as $$
declare u uuid:=auth.uid();
begin
 if u is null then raise exception 'AUTH_REQUIRED';end if;
 return jsonb_build_object('serverNow',clock_timestamp(),'testEnabled',(select instant_return_enabled from app_private.expedition_settings where id),
 'vessels',(select jsonb_agg(to_jsonb(v)||jsonb_build_object('owned',v.price=0 or exists(select 1 from public.player_fishing_vessels o where o.user_id=u and o.vessel_id=v.id)) order by sort_order) from public.fishing_vessels v),
 'active',(select (to_jsonb(e)-'result')||jsonb_build_object('boosts',app_private.expedition_boosts_payload(e.id)) from public.fishing_expeditions e where user_id=u and claimed_at is null),
 'history',coalesce((select jsonb_agg(to_jsonb(h)||jsonb_build_object('boosts',app_private.expedition_boosts_payload(h.id)) order by departed_at desc) from (select * from public.fishing_expeditions where user_id=u and claimed_at is not null order by departed_at desc limit 5) h),'[]'::jsonb),
 'baits',(select jsonb_agg(to_jsonb(b) order by sort_order) from public.fishing_baits b));
end $$;
