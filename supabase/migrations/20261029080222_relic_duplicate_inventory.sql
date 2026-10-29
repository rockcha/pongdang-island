-- Preserve existing ownership, equipment foreign keys, discovery history and grants.
-- An owned row always represents at least one copy; delete only the final spare.
alter table app_private.player_fishing_relics
 add column quantity integer not null default 1
 constraint player_fishing_relics_quantity_positive check(quantity>0);

CREATE OR REPLACE FUNCTION app_private.fishing_discovery_candidates(p_rarity game_rarity)
 RETURNS TABLE(category text, reward_id text, region_id text, piece_number integer)
 LANGUAGE sql
 STABLE
 SET search_path TO ''
AS $function$
 select 'map'::text,'map-piece-'||b.region_id||'-'||n.piece_number,b.region_id,n.piece_number
 from public.fishing_map_blueprints b join public.regions r on r.id=b.region_id
 cross join lateral generate_series(1,b.piece_count) n(piece_number)
 where b.enabled and r.requires_map_fragment and b.rarity=p_rarity
 and not exists(select 1 from public.player_map_fragments f where f.user_id=auth.uid() and f.region_id=b.region_id)
 and not exists(select 1 from app_private.player_fishing_map_pieces f where f.user_id=auth.uid()
  and f.region_id=b.region_id and f.piece_number=n.piece_number)
 union all
 select 'relic',r.id,null::text,null::integer from public.fishing_relics r
 where r.enabled and r.rarity=p_rarity
$function$;

CREATE OR REPLACE FUNCTION app_private.finish_fishing(p_operation_id uuid, p_won boolean)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''
AS $function$
declare v_uid uuid:=auth.uid();p app_private.prepared_fishing_casts;a public.fishing_attempts;
 v_item uuid;v_success boolean;v_result jsonb;v_first boolean:=false;
begin
 if v_uid is null then raise exception 'AUTH_REQUIRED';end if;
 if p_won is null then raise exception 'INVALID_RESULT';end if;
 perform pg_advisory_xact_lock(hashtextextended('region:'||v_uid::text,0));
 select * into p from app_private.prepared_fishing_casts where user_id=v_uid and operation_id=p_operation_id for update;
 if not found then raise exception 'CAST_NOT_FOUND';end if;
 if p.finished_at is not null then return p.result||jsonb_build_object('replayed',true);end if;
 if p_won and p.confirm_bite and p.fight_started_at is null then raise exception 'CAST_NOT_STARTED';end if;
 if p_won and clock_timestamp()<(case when p.fight_started_at is null
  then p.created_at+make_interval(secs=>p.wait_seconds::double precision+3)
  else p.fight_started_at+interval '3 seconds' end) then raise exception 'CAST_TOO_EARLY';end if;
 v_success:=p_won and p.eligible and clock_timestamp()<=p.expires_at;
 if v_success then
  if p.map_piece_number is not null then
   insert into app_private.player_fishing_map_pieces(user_id,region_id,piece_number)
    values(v_uid,p.map_region_id,p.map_piece_number) on conflict do nothing;
   v_first:=found;
   if not exists(select 1 from public.fishing_map_blueprints b cross join lateral generate_series(1,b.piece_count) n(piece_number)
    where b.region_id=p.map_region_id and not exists(select 1 from app_private.player_fishing_map_pieces f
     where f.user_id=v_uid and f.region_id=b.region_id and f.piece_number=n.piece_number)) then
    insert into public.player_map_fragments(user_id,region_id) values(v_uid,p.map_region_id) on conflict do nothing;
   end if;
   -- Capture real collected count after success, not the random piece number.
   p.snapshot:=p.snapshot||jsonb_build_object(
    'name',app_private.fishing_map_piece_payload(p.map_region_id,p.map_piece_number,v_uid)->>'name',
    'pieceFoundCount',(app_private.fishing_map_piece_payload(p.map_region_id,p.map_piece_number,v_uid)->>'pieceFoundCount')::integer);
  elsif p.relic_id is not null then
   -- Follow the same wallet -> ownership lock order as equipment and sales.
   perform app_private.get_gold_wallet();
   perform 1 from public.player_wallets where user_id=v_uid for update;
   insert into app_private.player_fishing_relics as owned(user_id,relic_id) values(v_uid,p.relic_id)
    on conflict(user_id,relic_id) do update set quantity=owned.quantity+1;
   insert into app_private.player_fishing_relic_discoveries(user_id,relic_id) values(v_uid,p.relic_id) on conflict do nothing;
   v_first:=found;
  else
   if p.map_region_id is not null then
    insert into public.player_map_fragments(user_id,region_id) values(v_uid,p.map_region_id) on conflict do nothing;
   end if;
   insert into public.player_collectibles(user_id,species_id,map_region_id) values(v_uid,p.species_id,p.map_region_id) returning id into v_item;
   insert into public.player_discoveries(user_id,species_id) values(v_uid,p.species_id) on conflict do nothing;
   v_first:=coalesce((select evidence.first_discovery from app_private.title_acquisition_evidence evidence
    where evidence.collectible_id=v_item and evidence.user_id=v_uid),false);
  end if;
 end if;
 -- Experience/title triggers read this immutable reward snapshot.
 update app_private.prepared_fishing_casts set snapshot=p.snapshot where user_id=v_uid and operation_id=p_operation_id;
 insert into public.fishing_attempts(user_id,operation_id,region_id,bait_id,rarity,collectible_id)
 values(v_uid,p.operation_id,p.region_id,p.bait_id,case when v_success then p.rarity end,v_item) returning * into a;
 v_result:=jsonb_build_object('attempt',to_jsonb(a)||jsonb_build_object('species',case when v_success then p.snapshot end,
 'firstDiscovery',v_first),'replayed',false,'failure_reason',case when v_success then null when clock_timestamp()>p.expires_at
  then 'expired' when not p.eligible then p.failure_reason else 'minigame' end);
 update app_private.prepared_fishing_casts set finished_at=clock_timestamp(),result=v_result where user_id=v_uid and operation_id=p_operation_id;
 return v_result;
end $function$;

CREATE OR REPLACE FUNCTION app_private.relic_state()
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''
AS $function$
declare u uuid:=auth.uid();begin
 if u is null then raise exception 'AUTH_REQUIRED';end if;
 return jsonb_build_object('equippedId',(select relic_id from app_private.player_relic_loadouts where user_id=u),'changeFee',500,'equipFee',0,'unequipFee',500,
 'relics',coalesce((select jsonb_agg(to_jsonb(r)||jsonb_build_object('discovered',exists(select 1 from app_private.player_fishing_relic_discoveries d where d.user_id=u and d.relic_id=r.id),'owned',exists(select 1 from app_private.player_fishing_relics d where d.user_id=u and d.relic_id=r.id),
 'quantity',coalesce((select d.quantity from app_private.player_fishing_relics d where d.user_id=u and d.relic_id=r.id),0)) order by r.effect_kind,r.effect_value,r.id) from public.fishing_relics r where r.enabled),'[]'::jsonb));
end$function$;

CREATE OR REPLACE FUNCTION app_private.sell_relic(p_relic_id text, p_operation_id uuid, p_expected_price integer)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''
AS $function$
declare u uuid:=auth.uid(); w public.player_wallets; previous public.gold_transactions; price integer; item text; owned_quantity integer;
begin
 if u is null then raise exception 'AUTH_REQUIRED';end if;
 if p_operation_id is null or p_relic_id is null or p_expected_price is null then raise exception 'INVALID_OPERATION';end if;
 item:='relic-sale:'||p_relic_id;
 perform app_private.get_gold_wallet();select * into strict w from public.player_wallets where user_id=u for update;
 select * into previous from public.gold_transactions where user_id=u and operation_id=p_operation_id;
 if found then
  if previous.action<>'sell' or previous.item_id<>item or previous.delta<>p_expected_price then raise exception 'OPERATION_CONFLICT';end if;
  return app_private.relic_state()||jsonb_build_object('replayed',true);
 end if;
 select quantity into owned_quantity from app_private.player_fishing_relics where user_id=u and relic_id=p_relic_id for update;
 if not found then raise exception 'RELIC_NOT_OWNED';end if;
 if owned_quantity=1 and exists(select 1 from app_private.player_relic_loadouts where user_id=u and relic_id=p_relic_id) then raise exception 'RELIC_EQUIPPED';end if;
 select sell_price into price from public.fishing_relics where id=p_relic_id and enabled;
 if price is null or price<=0 then raise exception 'RELIC_NOT_SELLABLE';end if;
 if price<>p_expected_price then raise exception 'RELIC_PRICE_CHANGED';end if;
 if w.gold::bigint+price>1000000000 then raise exception 'GOLD_LIMIT';end if;
 -- Preserve legacy ownership first; acquisition from now on also records history.
 insert into app_private.player_fishing_relic_discoveries(user_id,relic_id) values(u,p_relic_id) on conflict do nothing;
 if owned_quantity=1 then
  delete from app_private.player_fishing_relics where user_id=u and relic_id=p_relic_id;
 else
  update app_private.player_fishing_relics set quantity=quantity-1 where user_id=u and relic_id=p_relic_id;
 end if;
 update public.player_wallets set gold=gold+price,updated_at=clock_timestamp() where user_id=u;
 insert into public.gold_transactions(user_id,operation_id,action,item_id,delta) values(u,p_operation_id,'sell',item,price);
 return app_private.relic_state()||jsonb_build_object('replayed',false);
end $function$;
