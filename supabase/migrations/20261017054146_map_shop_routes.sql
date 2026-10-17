begin;
-- Maps are route purchases without rarity. Legacy collectible rows remain historical.
create table public.region_maps(
 region_id text primary key references public.regions(id),
 price integer not null check(price between 1 and 1000000000),
 thumbnail_path text not null check(btrim(thumbnail_path)<> '')
);
alter table public.region_maps enable row level security;
revoke all on public.region_maps from public,anon,authenticated;
grant select on public.region_maps to authenticated;
create policy region_maps_read on public.region_maps for select to authenticated using(true);

create function app_private.map_shop_state() returns jsonb
language plpgsql security definer set search_path='' as $$
begin
 if auth.uid() is null then raise exception 'AUTH_REQUIRED';end if;
 return jsonb_build_object('items',(select coalesce(jsonb_agg(jsonb_build_object(
 'region_id',r.id,'name',r.name||' 지도','description',r.description,'price',m.price,'thumbnail_path',m.thumbnail_path,
 'owned',not r.requires_map_fragment or exists(select 1 from public.player_map_fragments f where f.user_id=auth.uid() and f.region_id=r.id)
 ) order by r.sort_order,r.id),'[]'::jsonb) from public.region_maps m join public.regions r on r.id=m.region_id));
end $$;
create function app_private.buy_region_map(p_region_id text,p_operation_id uuid) returns jsonb
language plpgsql security definer set search_path='' as $$
declare v_uid uuid:=auth.uid();m public.region_maps;w public.player_wallets;t public.gold_transactions;
begin
 if v_uid is null then raise exception 'AUTH_REQUIRED';end if;
 if p_operation_id is null or p_region_id is null then raise exception 'INVALID_TRADE';end if;
 perform app_private.get_gold_wallet();
 select * into w from public.player_wallets where user_id=v_uid for update;
 select * into t from public.gold_transactions where user_id=v_uid and operation_id=p_operation_id;
 if found then
  if t.action<>'buy' or t.item_id is distinct from 'map:'||p_region_id then raise exception 'OPERATION_CONFLICT';end if;
  return app_private.get_gold_wallet()||jsonb_build_object('delta',0);
 end if;
 select * into m from public.region_maps where region_id=p_region_id for share;
 if not found then raise exception 'INVALID_MAP';end if;
 if exists(select 1 from public.regions r where r.id=p_region_id and not r.requires_map_fragment)
 or exists(select 1 from public.player_map_fragments where user_id=v_uid and region_id=p_region_id) then raise exception 'MAP_ALREADY_OWNED';end if;
 if w.gold<m.price then raise exception 'INSUFFICIENT_GOLD';end if;
 update public.player_wallets set gold=gold-m.price,updated_at=now() where user_id=v_uid;
 insert into public.player_map_fragments(user_id,region_id) values(v_uid,p_region_id);
 insert into public.gold_transactions(user_id,operation_id,action,item_id,delta) values(v_uid,p_operation_id,'buy','map:'||p_region_id,-m.price);
 return app_private.get_gold_wallet()||jsonb_build_object('delta',-m.price);
end $$;
create function public.map_shop_state() returns jsonb language sql security invoker set search_path='' as $$select app_private.map_shop_state()$$;
create function public.buy_region_map(p_region_id text,p_operation_id uuid) returns jsonb language sql security invoker set search_path='' as $$select app_private.buy_region_map(p_region_id,p_operation_id)$$;
revoke all on function public.map_shop_state(),app_private.map_shop_state(),public.buy_region_map(text,uuid),app_private.buy_region_map(text,uuid) from public,anon;
grant execute on function public.map_shop_state(),app_private.map_shop_state(),public.buy_region_map(text,uuid),app_private.buy_region_map(text,uuid) to authenticated;

-- Keep the old signature for both instant and prepared fishing callers; rolls never yield maps.
create or replace function app_private.pick_regional_collectible(p_region_id text,p_rarity public.game_rarity,p_decoration boolean,p_map_roll integer)
returns table(species_id text,map_region_id text) language plpgsql set search_path='' as $$
begin
 if p_map_roll is null or p_map_roll<0 or p_map_roll>=10000 then raise exception 'INVALID_ROLL';end if;
 return query select s.id,null::text from public.collectible_species s join public.collectible_habitats h on h.species_id=s.id
 where h.region_id=p_region_id and ((p_decoration and s.kind='decoration') or (not p_decoration and s.kind in('fish','trash') and s.rarity=p_rarity))
 order by random() limit 1;
end $$;
create or replace function app_private.collection_state() returns jsonb
language plpgsql security definer set search_path='' as $$
declare v_uid uuid:=auth.uid();
begin
 if v_uid is null then raise exception 'AUTH_REQUIRED';end if;
 return jsonb_build_object('items',app_private.owned_collectibles(),
 'catalog',(select coalesce(jsonb_agg(to_jsonb(s)||jsonb_build_object('discovered',d.species_id is not null,
 'habitats',coalesce((select jsonb_agg(jsonb_build_object('id',r.id,'name',r.name) order by r.sort_order)
 from public.collectible_habitats h join public.regions r on r.id=h.region_id where h.species_id=s.id),'[]'::jsonb)) order by s.kind,s.id),'[]'::jsonb)
 from public.collectible_species s left join public.player_discoveries d on d.species_id=s.id and d.user_id=v_uid where s.kind<>'map'));
end $$;
create or replace function app_private.region_map() returns jsonb
language plpgsql security definer set search_path='' as $$
declare v_uid uuid:=auth.uid();
begin
 if v_uid is null then raise exception 'AUTH_REQUIRED';end if;
 insert into public.player_navigation(user_id) values(v_uid) on conflict do nothing;
 return jsonb_build_object('currentRegion',(select region_id from public.player_navigation where user_id=v_uid),
 'canTestLocks',coalesce((select test_lock_controls from app_private.region_settings where id),false),
 'regions',(select jsonb_agg((to_jsonb(r)-'rarity')||jsonb_build_object('map_image_path',m.thumbnail_path,
 'unlocked',not r.requires_map_fragment or f.region_id is not null,'hasFragment',f.region_id is not null) order by r.sort_order)
 from public.regions r left join public.player_map_fragments f on f.region_id=r.id and f.user_id=v_uid
 left join public.region_maps m on m.region_id=r.id));
end $$;
-- Preserve the remote prepared-fishing state payload while removing obsolete map odds.
create or replace function public.fishing_state() returns jsonb language sql security invoker set search_path='' as $$select app_private.fishing_state()-'mapChanceBp'$$;
notify pgrst,'reload schema';
commit;
