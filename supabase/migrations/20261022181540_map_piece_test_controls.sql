begin;
set local lock_timeout='5s';

-- This control changes only the signed-in test account, verified server-side.
create function app_private.set_map_piece_test_count(p_region_id text,p_count integer)
returns jsonb language plpgsql security definer set search_path='' as $$
declare u uuid:=auth.uid();total integer;
begin
 if u is null then raise exception 'AUTH_REQUIRED';end if;
 if not exists(select 1 from auth.users where id=u and lower(email)='1@1.com') then raise exception 'TEST_ACCOUNT_REQUIRED';end if;
 perform pg_advisory_xact_lock(hashtextextended('region:'||u::text,0));
 select b.piece_count into total from public.fishing_map_blueprints b join public.regions r on r.id=b.region_id
 where b.region_id=p_region_id and b.enabled and r.requires_map_fragment for share of b,r;
 if not found then raise exception 'MAP_BLUEPRINT_NOT_FOUND';end if;
 if p_count is null or p_count<0 or p_count>total then raise exception 'INVALID_MAP_PIECE_COUNT';end if;
 -- An entered count represents the first N fixed pieces, including resetting to zero.
 delete from app_private.player_fishing_map_pieces where user_id=u and region_id=p_region_id and piece_number>p_count;
 insert into app_private.player_fishing_map_pieces(user_id,region_id,piece_number)
 select u,p_region_id,n from generate_series(1,p_count) n on conflict do nothing;
 if p_count=total then
  insert into public.player_map_fragments(user_id,region_id) values(u,p_region_id) on conflict do nothing;
 else
  delete from public.player_map_fragments where user_id=u and region_id=p_region_id;
  update public.player_navigation set region_id='pongdang' where user_id=u and region_id=p_region_id;
 end if;
 return app_private.region_map();
end $$;
revoke all on function app_private.set_map_piece_test_count(text,integer) from public,anon;
grant execute on function app_private.set_map_piece_test_count(text,integer) to authenticated;
create function public.set_map_piece_test_count(p_region_id text,p_count integer)
returns jsonb language sql security invoker set search_path='' as $$
 select app_private.set_map_piece_test_count(p_region_id,p_count)
$$;
revoke all on function public.set_map_piece_test_count(text,integer) from public,anon;
grant execute on function public.set_map_piece_test_count(text,integer) to authenticated;
notify pgrst,'reload schema';
commit;
