-- Bonus applies to new reservations; existing prepared casts keep their outcome.
create or replace function app_private.fishing_success_chance_bp(p_bait_id text)
returns integer language plpgsql stable set search_path = '' as $$
begin
 if not exists(select 1 from public.fishing_baits where id=p_bait_id) then raise exception 'INVALID_BAIT';end if;
 return case p_bait_id when 'bait_safe' then 10000 when 'bait_forbidden_star' then 6000 else 4000 end;
end;
$$;
revoke all on function app_private.fishing_success_chance_bp(text) from public,anon,authenticated;
