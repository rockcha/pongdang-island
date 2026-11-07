begin;

create table app_private.farm_likes (
 owner_id uuid not null references auth.users(id) on delete cascade,
 visitor_id uuid not null references auth.users(id) on delete cascade,
 created_at timestamptz not null default now(),
 primary key(owner_id,visitor_id),
 check(owner_id<>visitor_id)
);
create index farm_likes_visitor_idx on app_private.farm_likes(visitor_id);
alter table app_private.farm_likes enable row level security;
revoke all on app_private.farm_likes from public,anon,authenticated;

-- Return only visible farm layout. Wallets, inventory, storage, undo and
-- production/research queues never cross the visit boundary.
create function app_private.friend_farm(p_owner uuid)
returns jsonb language plpgsql security definer set search_path='' as $$
declare u uuid:=auth.uid();doc jsonb;profile jsonb;
begin
 if u is null then raise exception 'AUTH_REQUIRED';end if;
 if p_owner is null or (p_owner<>u and not exists(
  select 1 from public.friend_requests where status='accepted' and
  ((sender_id=u and recipient_id=p_owner) or(sender_id=p_owner and recipient_id=u))
 )) then raise exception 'FRIENDSHIP_REQUIRED';end if;
 select f.document,jsonb_build_object('id',p.id,'nickname',p.nickname,'avatar_path',p.avatar_path)
 into doc,profile from app_private.topview_farms f join public.player_profiles p on p.id=f.user_id where f.user_id=p_owner;
 if not found then raise exception 'FARM_NOT_FOUND';end if;
 return jsonb_build_object('owner',profile,'serverNow',clock_timestamp(),
 'likeCount',(select count(*) from app_private.farm_likes where owner_id=p_owner),
 'liked',exists(select 1 from app_private.farm_likes where owner_id=p_owner and visitor_id=u),
 'layout',jsonb_build_object('land',coalesce(doc->'land','[]'::jsonb),'paths',coalesce(doc->'paths','[]'::jsonb),'pathTiles',coalesce(doc->'pathTiles','{}'::jsonb),
 'objects',coalesce((select jsonb_agg(jsonb_strip_nulls(jsonb_build_object('id',o->'id','kind',o->'kind','x',o->'x','y',o->'y','level',o->'level','rotation',o->'rotation','flipped',o->'flipped','constructionReadyAt',o->'constructionReadyAt')) order by n)
 from jsonb_array_elements(coalesce(doc->'objects','[]'::jsonb)) with ordinality a(o,n)),'[]'::jsonb),
 'cropJobs',coalesce((select jsonb_object_agg(k,jsonb_build_object('crop',v->'crop','readyAt',v->'readyAt')) from jsonb_each(coalesce(doc#>'{simulation,cropJobs}','{}'::jsonb)) a(k,v)),'{}'::jsonb)));
end $$;

create function app_private.farm_friends()
returns jsonb language plpgsql security definer set search_path='' as $$
declare u uuid:=auth.uid();
begin
 if u is null then raise exception 'AUTH_REQUIRED';end if;
 return jsonb_build_object('self',(select jsonb_build_object('id',id,'nickname',nickname,'avatar_path',avatar_path) from public.player_profiles where id=u),
 'likeCount',(select count(*) from app_private.farm_likes where owner_id=u),
 'friends',coalesce((select jsonb_agg(jsonb_build_object('id',p.id,'nickname',p.nickname,'avatar_path',p.avatar_path) order by p.nickname,p.id)
 from public.player_profiles p join app_private.topview_farms f on f.user_id=p.id where p.id<>u and exists(
 select 1 from public.friend_requests r where r.status='accepted' and ((r.sender_id=u and r.recipient_id=p.id) or(r.recipient_id=u and r.sender_id=p.id)))),'[]'::jsonb));
end $$;

create function app_private.set_farm_like(p_owner uuid,p_liked boolean)
returns jsonb language plpgsql security definer set search_path='' as $$
declare u uuid:=auth.uid();
begin
 -- Reuse the read authorization, including farms that have not been started.
 perform app_private.friend_farm(p_owner);
 if p_owner=u then raise exception 'OWN_FARM';end if;
 if p_liked is null then raise exception 'INVALID_LIKE';end if;
 if p_liked then insert into app_private.farm_likes(owner_id,visitor_id) values(p_owner,u) on conflict do nothing;
 else delete from app_private.farm_likes where owner_id=p_owner and visitor_id=u;end if;
 return app_private.friend_farm(p_owner);
end $$;

create function public.friend_farm(p_owner uuid) returns jsonb language sql set search_path='' as $$select app_private.friend_farm(p_owner)$$;
create function public.farm_friends() returns jsonb language sql set search_path='' as $$select app_private.farm_friends()$$;
create function public.set_farm_like(p_owner uuid,p_liked boolean) returns jsonb language sql set search_path='' as $$select app_private.set_farm_like(p_owner,p_liked)$$;
revoke all on function app_private.friend_farm(uuid),app_private.farm_friends(),app_private.set_farm_like(uuid,boolean),public.friend_farm(uuid),public.farm_friends(),public.set_farm_like(uuid,boolean) from public,anon;
grant execute on function app_private.friend_farm(uuid),app_private.farm_friends(),app_private.set_farm_like(uuid,boolean),public.friend_farm(uuid),public.farm_friends(),public.set_farm_like(uuid,boolean) to authenticated;

commit;
