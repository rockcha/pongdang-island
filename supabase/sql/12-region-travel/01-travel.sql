-- Apply after 11. Development-only own-account lock controls; disable before release.
begin;
create table app_private.region_settings (
 id boolean primary key default true check(id), test_lock_controls boolean not null default true
);
insert into app_private.region_settings(id) values(true);
alter table app_private.region_settings enable row level security;
revoke all on app_private.region_settings from public,anon,authenticated;
create or replace function app_private.region_map() returns jsonb language plpgsql security definer set search_path='' as $$
declare v_uid uuid:=auth.uid();
begin
 if v_uid is null then raise exception 'AUTH_REQUIRED'; end if;
 insert into public.player_navigation(user_id) values(v_uid) on conflict do nothing;
 return jsonb_build_object('currentRegion',(select region_id from public.player_navigation where user_id=v_uid),
 'canTestLocks',coalesce((select test_lock_controls from app_private.region_settings where id),false),
 'regions',(select jsonb_agg(to_jsonb(r)||jsonb_build_object('unlocked',not r.requires_map_fragment or f.region_id is not null,'hasFragment',f.region_id is not null) order by r.sort_order)
 from public.regions r left join public.player_map_fragments f on f.region_id=r.id and f.user_id=v_uid));
end $$;
create or replace function app_private.travel_region(p_region_id text) returns jsonb language plpgsql security definer set search_path='' as $$
declare v_uid uuid:=auth.uid(); v_region public.regions;
begin
 if v_uid is null then raise exception 'AUTH_REQUIRED'; end if;
 perform pg_advisory_xact_lock(hashtextextended('region:'||v_uid::text,0));
 select * into v_region from public.regions where id=p_region_id;
 if not found then raise exception 'REGION_NOT_FOUND'; end if;
 if v_region.requires_map_fragment and not exists(select 1 from public.player_map_fragments where user_id=v_uid and region_id=p_region_id) then raise exception 'REGION_LOCKED'; end if;
 insert into public.player_navigation(user_id,region_id) values(v_uid,p_region_id)
 on conflict(user_id) do update set region_id=excluded.region_id;
 return app_private.region_map();
end $$;
create function app_private.set_region_test_lock(p_region_id text,p_locked boolean) returns jsonb language plpgsql security definer set search_path='' as $$
declare v_uid uuid:=auth.uid(); v_region public.regions;
begin
 if v_uid is null then raise exception 'AUTH_REQUIRED'; end if;
 if not coalesce((select test_lock_controls from app_private.region_settings where id),false) then raise exception 'TEST_CONTROLS_DISABLED'; end if;
 if p_locked is null then raise exception 'INVALID_LOCK_STATE'; end if;
 perform pg_advisory_xact_lock(hashtextextended('region:'||v_uid::text,0));
 select * into v_region from public.regions where id=p_region_id;
 if not found then raise exception 'REGION_NOT_FOUND'; end if;
 if not v_region.requires_map_fragment then raise exception 'DEFAULT_REGION_ALWAYS_OPEN'; end if;
 if p_locked then
  delete from public.player_map_fragments where user_id=v_uid and region_id=p_region_id;
  update public.player_navigation set region_id='pongdang' where user_id=v_uid and region_id=p_region_id;
 else
  insert into public.player_map_fragments(user_id,region_id) values(v_uid,p_region_id) on conflict do nothing;
 end if;
 return app_private.region_map();
end $$;
create function public.set_region_test_lock(p_region_id text,p_locked boolean) returns jsonb language sql security invoker set search_path='' as $$select app_private.set_region_test_lock(p_region_id,p_locked)$$;
revoke all on function app_private.set_region_test_lock(text,boolean),public.set_region_test_lock(text,boolean) from public,anon;
grant execute on function app_private.set_region_test_lock(text,boolean),public.set_region_test_lock(text,boolean) to authenticated;
notify pgrst,'reload schema';
commit;