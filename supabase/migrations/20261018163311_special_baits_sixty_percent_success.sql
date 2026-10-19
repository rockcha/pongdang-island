begin;
create or replace function app_private.fishing_success_chance_bp(p_bait_id text)
returns integer language plpgsql stable set search_path='' as $$
begin
 if not exists(select 1 from public.fishing_baits where id=p_bait_id) then raise exception 'INVALID_BAIT';end if;
 return case
  when p_bait_id='bait_safe' then 10000
  when p_bait_id in ('bait_forbidden_star','bait_epic','bait_special') then 6000
  else 4000
 end;
end;
$$;
revoke all on function app_private.fishing_success_chance_bp(text) from public,anon,authenticated;
notify pgrst,'reload schema';
commit;
