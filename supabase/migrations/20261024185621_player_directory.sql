begin;

create index if not exists player_profiles_directory_order on public.player_profiles(nickname,id);

-- Only display fields are exposed. Presence, XP and friend codes stay private.
create function app_private.player_directory(p_offset integer default 0,p_limit integer default 20)
returns jsonb language plpgsql stable security definer set search_path='' as $$
declare v_user uuid:=auth.uid();v_result jsonb;
begin
 if v_user is null then raise exception 'AUTH_REQUIRED';end if;
 if p_offset is null or p_offset<0 or p_offset>100000 or p_limit is null or p_limit<1 or p_limit>50 then raise exception 'INVALID_DIRECTORY_PAGE';end if;
 with candidates as materialized (
  select p.id,p.nickname,p.avatar_path,p.equipped_title from public.player_profiles p
  where p.id<>v_user order by p.nickname,p.id limit p_limit+1 offset p_offset
 ), page as (select * from candidates order by nickname,id limit p_limit)
 select jsonb_build_object('players',coalesce((
  select jsonb_agg(jsonb_build_object('id',p.id,'nickname',p.nickname,'avatar_path',p.avatar_path,
   'equipped_title',p.equipped_title,'level',app_private.player_level(p.id),
   'relationship',case when r.status='accepted' then 'friend' when r.status='pending' and r.sender_id=v_user then 'outgoing' when r.status='pending' then 'incoming' else 'none' end)
   order by p.nickname,p.id)
  from page p left join lateral (
   select f.status,f.sender_id from public.friend_requests f where f.status in ('pending','accepted') and
    ((f.sender_id=v_user and f.recipient_id=p.id) or (f.recipient_id=v_user and f.sender_id=p.id))
   order by f.updated_at desc,f.id limit 1
  ) r on true
 ),'[]'::jsonb),'hasMore',(select count(*)>p_limit from candidates)) into v_result;
 return v_result;
end $$;

create function public.player_directory(p_offset integer default 0,p_limit integer default 20)
returns jsonb language sql stable set search_path='' as $$ select app_private.player_directory(p_offset,p_limit) $$;

-- Reuse the existing request transaction, notifications and rate limits.
create function app_private.send_player_friend_request(p_player uuid)
returns uuid language plpgsql security definer set search_path='' as $$
declare v_code text;
begin
 if auth.uid() is null then raise exception 'AUTH_REQUIRED';end if;
 select friend_code into v_code from public.player_profiles where id=p_player;
 if v_code is null then raise exception 'PLAYER_NOT_FOUND';end if;
 return app_private.send_friend_request(v_code);
end $$;
create function public.send_player_friend_request(p_player uuid)
returns uuid language sql set search_path='' as $$ select app_private.send_player_friend_request(p_player) $$;

revoke all on function app_private.player_directory(integer,integer),public.player_directory(integer,integer),
 app_private.send_player_friend_request(uuid),public.send_player_friend_request(uuid) from public,anon;
grant execute on function app_private.player_directory(integer,integer),public.player_directory(integer,integer),
 app_private.send_player_friend_request(uuid),public.send_player_friend_request(uuid) to authenticated;
notify pgrst,'reload schema';
commit;
