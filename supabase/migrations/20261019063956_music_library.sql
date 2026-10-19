-- Global defaults are copied only once; deleting every personal track stays empty.
create table public.music_defaults (
 video_id text primary key check (video_id ~ '^[A-Za-z0-9_-]{11}$'),
 title text not null default '' check (char_length(title)<=1000),
 sort_order integer not null
);
create table public.music_libraries (
 user_id uuid primary key references auth.users(id) on delete cascade,
 created_at timestamptz not null default now()
);
create table public.music_tracks (
 user_id uuid not null references public.music_libraries(user_id) on delete cascade,
 video_id text not null check (video_id ~ '^[A-Za-z0-9_-]{11}$'),
 title text not null default '' check (char_length(title)<=1000),
 custom_name text not null default '' check (char_length(custom_name)<=150),
 created_at timestamptz not null default now(),
 primary key(user_id,video_id)
);
alter table public.music_defaults enable row level security;
alter table public.music_libraries enable row level security;
alter table public.music_tracks enable row level security;
revoke all on public.music_defaults,public.music_libraries,public.music_tracks from public,anon,authenticated;
grant select on public.music_defaults,public.music_libraries,public.music_tracks to authenticated;
create policy music_defaults_read on public.music_defaults for select to authenticated using (true);
create policy music_libraries_read on public.music_libraries for select to authenticated using (user_id=(select auth.uid()));
create policy music_tracks_read on public.music_tracks for select to authenticated using (user_id=(select auth.uid()));
insert into public.music_defaults(video_id,sort_order) values ('28kGcceYcOI',1),('fqSVyUeiduI',2),('icKtd3wUBug',3);

create function app_private.music_library(p_import jsonb default null) returns jsonb
language plpgsql security definer set search_path='' as $$
declare v_user uuid:=auth.uid(); v_new uuid; v_track jsonb;
begin
 if v_user is null then raise exception 'AUTH_REQUIRED'; end if;
 if p_import is not null then
  if jsonb_typeof(p_import)<>'array' then raise exception 'INVALID_MUSIC_IMPORT'; end if;
  if jsonb_array_length(p_import)>200 then raise exception 'MUSIC_LIMIT'; end if;
  for v_track in select value from jsonb_array_elements(p_import) loop
   if jsonb_typeof(v_track)<>'object' or coalesce(v_track->>'id','') !~ '^[A-Za-z0-9_-]{11}$'
    or jsonb_typeof(v_track->'id') is distinct from 'string'
    or jsonb_typeof(v_track->'title') is distinct from 'string'
    or jsonb_typeof(v_track->'customName') is distinct from 'string'
    or char_length(v_track->>'title')>1000 or char_length(v_track->>'customName')>150
    then raise exception 'INVALID_MUSIC_IMPORT'; end if;
  end loop;
 end if;
 insert into public.music_libraries(user_id) values(v_user) on conflict do nothing returning user_id into v_new;
 -- Serialize initial import and all subsequent changes for this owner only.
 perform 1 from public.music_libraries where user_id=v_user for update;
 if v_new is not null then
  if p_import is null then
   insert into public.music_tracks(user_id,video_id,title,created_at)
   select v_user,video_id,title,now()+sort_order*interval '1 microsecond' from public.music_defaults;
  else
   insert into public.music_tracks(user_id,video_id,title,custom_name,created_at)
   select v_user,t.id,t.title,t.name,now()+t.ord*interval '1 microsecond' from (
    select distinct on (value->>'id') value->>'id' id,value->>'title' title,btrim(value->>'customName') name,ordinality ord
    from jsonb_array_elements(p_import) with ordinality order by value->>'id',ordinality desc
   ) t;
  end if;
 end if;
 return coalesce((select jsonb_agg(jsonb_build_object('id',video_id,'title',title,'customName',custom_name) order by created_at,video_id) from public.music_tracks where user_id=v_user),'[]'::jsonb);
end $$;

create function app_private.music_edit(p_action text,p_id text,p_title text default '',p_name text default '') returns jsonb
language plpgsql security definer set search_path='' as $$
declare v_user uuid:=auth.uid();
begin
 if v_user is null then raise exception 'AUTH_REQUIRED'; end if;
 if p_id is null or p_id !~ '^[A-Za-z0-9_-]{11}$' or p_title is null or char_length(p_title)>1000 or p_name is null or char_length(p_name)>150 then raise exception 'INVALID_MUSIC'; end if;
 perform app_private.music_library();
 if p_action='add' then
  if not exists(select 1 from public.music_tracks where user_id=v_user and video_id=p_id) and (select count(*) from public.music_tracks where user_id=v_user)>=200 then raise exception 'MUSIC_LIMIT'; end if;
  insert into public.music_tracks(user_id,video_id,title,custom_name) values(v_user,p_id,p_title,btrim(p_name))
  on conflict(user_id,video_id) do nothing;
 elsif p_action='rename' then update public.music_tracks set custom_name=btrim(p_name) where user_id=v_user and video_id=p_id;
 elsif p_action='title' then update public.music_tracks set title=p_title where user_id=v_user and video_id=p_id;
 elsif p_action='delete' then delete from public.music_tracks where user_id=v_user and video_id=p_id;
 else raise exception 'INVALID_MUSIC_ACTION'; end if;
 return app_private.music_library();
end $$;
revoke all on function app_private.music_library(jsonb),app_private.music_edit(text,text,text,text) from public,anon,authenticated;
grant execute on function app_private.music_library(jsonb),app_private.music_edit(text,text,text,text) to authenticated;
create function public.music_library(p_import jsonb default null) returns jsonb language sql security invoker set search_path='' as $$select app_private.music_library(p_import)$$;
create function public.music_edit(p_action text,p_id text,p_title text default '',p_name text default '') returns jsonb language sql security invoker set search_path='' as $$select app_private.music_edit(p_action,p_id,p_title,p_name)$$;
revoke all on function public.music_library(jsonb),public.music_edit(text,text,text,text) from public,anon;
grant execute on function public.music_library(jsonb),public.music_edit(text,text,text,text) to authenticated;
