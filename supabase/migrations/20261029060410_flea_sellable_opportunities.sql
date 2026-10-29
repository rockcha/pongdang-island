-- Eligibility is caller-scoped and shared by pagination and the lightweight menu.
create or replace function app_private.flea_sellable_posts()
returns table(post_id uuid)
language plpgsql stable security invoker set search_path=''
as $$
declare caller uuid:=auth.uid(); fuel integer;
begin
 if caller is null then raise exception 'AUTH_REQUIRED' using errcode='42501';end if;
 select coalesce((inventory->>'fuel')::integer,0) into fuel from public.player_wallets where user_id=caller;
 return query
 select p.id from app_private.flea_posts p
 where p.side='buy' and p.status='active' and p.owner_id<>caller
 and exists(
  select 1 from app_private.flea_lines l where l.post_id=p.id and l.remaining>0
  and ((l.kind='fuel' and l.item_id='fuel' and coalesce(fuel,0)>0)
   or (l.kind='collectible' and exists(
    select 1 from public.player_collectibles c where c.user_id=caller and c.species_id=l.item_id
    and c.sold_at is null and c.tank_id is null and c.escrow_gift_id is null
   )))
 );
end $$;
revoke all on function app_private.flea_sellable_posts() from public,anon,authenticated;

create or replace function app_private.flea_sellable_state(p_query text default '',p_offset integer default 0)
returns jsonb language plpgsql stable security definer set search_path=''
as $$
declare caller uuid:=auth.uid(); ids uuid[]; total bigint;
begin
 if caller is null then raise exception 'AUTH_REQUIRED' using errcode='42501';end if;
 if p_query is null or char_length(p_query)>80 or p_offset is null or p_offset<0 or p_offset>100000 then raise exception 'INVALID_FLEA';end if;
 with matched as materialized (
  select p.id,p.created_at from app_private.flea_sellable_posts() eligible
  join app_private.flea_posts p on p.id=eligible.post_id
  where btrim(p_query)='' or position(lower(btrim(p_query)) in lower(p.title))>0
   or exists(select 1 from app_private.flea_lines l where l.post_id=p.id
    and position(replace(lower(btrim(p_query)),'연료','기름') in lower(l.asset->>'name'))>0)
 ) select (select count(*) from matched),(select array_agg(id order by created_at desc,id)
   from(select * from matched order by created_at desc,id limit 20 offset p_offset) page)
 into total,ids;
 return jsonb_build_object('items',coalesce((select jsonb_agg(app_private.flea_post_payload(id) order by ord)
  from unnest(ids) with ordinality q(id,ord)),'[]'::jsonb),'total',total);
end $$;
revoke all on function app_private.flea_sellable_state(text,integer) from public,anon;
grant execute on function app_private.flea_sellable_state(text,integer) to authenticated;

create or replace function public.flea_sellable_state(p_query text default '',p_offset integer default 0)
returns jsonb language sql stable security invoker set search_path=''
as $$select app_private.flea_sellable_state(p_query,p_offset)$$;
revoke all on function public.flea_sellable_state(text,integer) from public,anon;
grant execute on function public.flea_sellable_state(text,integer) to authenticated;

create or replace function app_private.menu_status()
returns jsonb language plpgsql stable security definer set search_path=''
as $$
declare caller uuid:=auth.uid(); sampled_at timestamptz:=now();
begin
 if caller is null then raise exception 'AUTH_REQUIRED' using errcode='42501';end if;
 return jsonb_build_object(
  'serverNow',sampled_at,
  'production',(select jsonb_build_object('total',count(*),'sites',coalesce(jsonb_agg(jsonb_build_object('completesAt',completes_at,'expiresAt',expires_at)) filter(where started_at is not null),'[]'::jsonb)) from app_private.production_sites where user_id=caller),
  'baitProduction',(select jsonb_build_object('total',count(*),'sites',coalesce(jsonb_agg(jsonb_build_object('completesAt',completes_at,'expiresAt',expires_at)) filter(where started_at is not null),'[]'::jsonb)) from app_private.bait_production_sites where user_id=caller),
  'harbor',jsonb_build_object('total',(select count(*) from public.harbor_boats where user_id=caller and sold_at is null),
   'dockSlots',coalesce((select dock_slots from app_private.player_harbor_capacity where user_id=caller),2),
   'returnsAt',coalesce((select jsonb_agg(returns_at) from public.harbor_voyages where user_id=caller and claimed_at is null),'[]'::jsonb)),
  'expedition',jsonb_build_object('returnsAt',(select returns_at from public.fishing_expeditions where user_id=caller and claimed_at is null)),
  'personalBait',jsonb_build_object('completesAt',(select completes_at from app_private.personal_bait_jobs where user_id=caller and claimed_at is null order by started_at desc limit 1)),
  'savings',jsonb_build_object('account',(select app_private.savings_payload(a,sampled_at) from public.shell_savings a where a.user_id=caller and a.closed_at is null)),
  'merchant',app_private.merchant_summary(),
  'flea',jsonb_build_object('sellable',(select count(*) from app_private.flea_sellable_posts()))
 );
end $$;
notify pgrst,'reload schema';
