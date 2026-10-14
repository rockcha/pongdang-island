-- Apply after 10. Shared rarity enum is reusable for fish and items.
begin;
create type public.game_rarity as enum('common','rare','epic','mythic');
create table public.regions (
 id text primary key,name text not null,description text not null,
 rarity public.game_rarity not null,sort_order integer not null unique,
 image_path text not null unique,requires_map_fragment boolean not null default true
);
insert into public.regions values
('pongdang','퐁당섬 앞바다','햇살이 부서지는 잔잔한 바다. 작은 물고기들과 첫 낚시를 시작하는 곳이에요.','common',1,'pongdang.png',false),
('coral','산호빛 여울','파스텔빛 산호 사이로 빠른 물살이 흘러요. 날쌘 물고기들이 여울 속에 숨어 있어요.','common',2,'coral.png',true),
('mistmoon','안개달 해역','은빛 안개와 달빛이 겹치는 고요한 해역. 물결 너머 낯선 움직임이 느껴져요.','common',3,'mistmoon.png',true),
('starruins','별잠 유적','별빛을 품은 오래된 유적. 잠든 바다의 기억과 희귀한 생명이 머물러요.','rare',4,'starruins.png',true),
('dreamabyss','꿈먹는 심연','보랏빛 물결이 어둠 속으로 이어져요. 바다 깊이 감춰진 신비가 기다리고 있어요.','epic',5,'dreamabyss.png',true);
create table public.player_map_fragments (
 user_id uuid not null references auth.users(id) on delete cascade,
 region_id text not null references public.regions(id),
 acquired_at timestamptz not null default now(),primary key(user_id,region_id)
);
create table public.player_navigation (
 user_id uuid primary key references auth.users(id) on delete cascade,
 region_id text not null default 'pongdang' references public.regions(id)
);
alter table public.regions enable row level security;
alter table public.player_map_fragments enable row level security;
alter table public.player_navigation enable row level security;
revoke all on public.regions,public.player_map_fragments,public.player_navigation from public,anon,authenticated;
grant select on public.regions,public.player_map_fragments,public.player_navigation to authenticated;
create policy regions_catalog_read on public.regions for select to authenticated using(true);
create policy fragments_owner_read on public.player_map_fragments for select to authenticated using(user_id=(select auth.uid()));
create policy navigation_owner_read on public.player_navigation for select to authenticated using(user_id=(select auth.uid()));
insert into storage.buckets(id,name,public,file_size_limit,allowed_mime_types)
values('regions','regions',true,10485760,array['image/png','image/webp']) on conflict(id) do nothing;
create function app_private.region_map() returns jsonb language plpgsql security definer set search_path='' as $$
declare v_uid uuid:=auth.uid();
begin
 if v_uid is null then raise exception 'AUTH_REQUIRED'; end if;
 insert into public.player_navigation(user_id) values(v_uid) on conflict do nothing;
 return jsonb_build_object('currentRegion',(select region_id from public.player_navigation where user_id=v_uid),
 'regions',(select jsonb_agg(to_jsonb(r)||jsonb_build_object('unlocked',not r.requires_map_fragment or f.region_id is not null,'hasFragment',f.region_id is not null) order by r.sort_order)
 from public.regions r left join public.player_map_fragments f on f.region_id=r.id and f.user_id=v_uid));
end $$;
create function app_private.travel_region(p_region_id text) returns jsonb language plpgsql security definer set search_path='' as $$
declare v_uid uuid:=auth.uid(); v_region public.regions;
begin
 if v_uid is null then raise exception 'AUTH_REQUIRED'; end if;
 select * into v_region from public.regions where id=p_region_id;
 if not found then raise exception 'REGION_NOT_FOUND'; end if;
 if v_region.requires_map_fragment then
  perform 1 from public.player_map_fragments where user_id=v_uid and region_id=p_region_id for share;
  if not found then raise exception 'REGION_LOCKED'; end if;
 end if;
 insert into public.player_navigation(user_id,region_id) values(v_uid,p_region_id)
 on conflict(user_id) do update set region_id=excluded.region_id;
 return app_private.region_map();
end $$;
create function public.region_map() returns jsonb language sql security invoker set search_path='' as $$select app_private.region_map()$$;
create function public.travel_region(p_region_id text) returns jsonb language sql security invoker set search_path='' as $$select app_private.travel_region(p_region_id)$$;
revoke all on function app_private.region_map(),public.region_map(),app_private.travel_region(text),public.travel_region(text) from public,anon;
grant execute on function app_private.region_map(),public.region_map(),app_private.travel_region(text),public.travel_region(text) to authenticated;
notify pgrst,'reload schema';
commit;