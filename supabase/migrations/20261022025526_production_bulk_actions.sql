begin;
-- Reuse the single-site rules inside one transaction. Any changed state or
-- missing material rolls back every site, and retries replay the parent receipt.
create function app_private.production_bulk_action(p_action text,p_operation_id uuid,p_steps jsonb,p_allow_valuable boolean default false)
returns jsonb language plpgsql security definer set search_path='' as $$
declare u uuid:=auth.uid();sig jsonb;prev app_private.production_operations;step jsonb;result jsonb;receipt jsonb;total_fuel integer:=0;n integer;
begin
 if u is null then raise exception 'AUTH_REQUIRED';end if;
 if p_operation_id is null or p_action is null or p_action not in ('start','claim','discard') then raise exception 'INVALID_PRODUCTION';end if;
 if p_steps is null or jsonb_typeof(p_steps)<>'array' then raise exception 'INVALID_PRODUCTION';end if;
 n:=jsonb_array_length(p_steps);
 if n not between 1 and 100 then raise exception 'INVALID_PRODUCTION';end if;
 if exists(select 1 from jsonb_array_elements(p_steps) e where jsonb_typeof(e)<>'object'
  or jsonb_typeof(e->'facility') is distinct from 'string' or jsonb_typeof(e->'materials') is distinct from 'object') then raise exception 'INVALID_PRODUCTION';end if;
 if (select count(distinct e->>'facility') from jsonb_array_elements(p_steps)e)<>n then raise exception 'INVALID_PRODUCTION';end if;
 sig:=jsonb_build_object('action','bulk_'||p_action,'steps',p_steps,'allowValuable',coalesce(p_allow_valuable,false));
 perform app_private.get_gold_wallet();
 perform 1 from public.player_wallets where user_id=u for update;
 select * into prev from app_private.production_operations where user_id=u and operation_id=p_operation_id;
 if found then
  if prev.signature<>sig then raise exception 'OPERATION_CONFLICT';end if;
  return app_private.production_state()||jsonb_build_object('receipt',prev.receipt,'replayed',true);
 end if;
 if (select count(*) from jsonb_array_elements(p_steps)e join app_private.production_sites s on s.facility_id=e->>'facility' and s.user_id=u)<>n then raise exception 'PRODUCTION_NOT_OWNED';end if;
 -- Exact reviewed species/quantities are submitted. No replacement or automatic
 -- fallback to a more valuable material is ever performed on the server.
 if p_action='start' and not coalesce(p_allow_valuable,false) and exists(
  select 1 from jsonb_array_elements(p_steps)e cross join lateral jsonb_object_keys(e->'materials') m(id)
  join public.collectible_species cs on cs.id=m.id where cs.rarity in ('epic','mythic')
 ) then raise exception 'VALUABLE_MATERIAL_CONFIRM_REQUIRED';end if;
 for step in select e from jsonb_array_elements(p_steps)e join public.production_facilities f on f.id=e->>'facility' order by f.price,f.id loop
  result:=app_private.production_action(p_action,gen_random_uuid(),step->>'facility',step->'materials');
  total_fuel:=total_fuel+coalesce((result->'receipt'->>'fuel')::integer,0);
 end loop;
 receipt:=jsonb_build_object('action','bulk_'||p_action,'count',n,'fuel',total_fuel);
 insert into app_private.production_operations(user_id,operation_id,signature,receipt) values(u,p_operation_id,sig,receipt);
 return app_private.production_state()||jsonb_build_object('receipt',receipt,'replayed',false);
end $$;
create function public.production_bulk_action(p_action text,p_operation_id uuid,p_steps jsonb,p_allow_valuable boolean default false)
returns jsonb language sql security invoker set search_path='' as $$select app_private.production_bulk_action(p_action,p_operation_id,p_steps,p_allow_valuable)$$;
revoke all on function app_private.production_bulk_action(text,uuid,jsonb,boolean),public.production_bulk_action(text,uuid,jsonb,boolean) from public,anon;
grant execute on function app_private.production_bulk_action(text,uuid,jsonb,boolean),public.production_bulk_action(text,uuid,jsonb,boolean) to authenticated;
notify pgrst,'reload schema';
commit;
