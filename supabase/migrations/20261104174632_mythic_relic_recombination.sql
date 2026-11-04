-- Mythic originals: three copies yield one enabled random mythic.
-- Preserve wallet-first locking, equipped-copy protection and operation replay.
CREATE OR REPLACE FUNCTION app_private.recycle_relics(p_action text, p_inputs jsonb, p_operation_id uuid)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''
AS $function$
declare u uuid:=auth.uid();previous app_private.relic_recycling_operations;inputs jsonb;
 total integer;material_count integer;distinct_grades integer;source_grade text;target_grade public.game_rarity;
 equipped text;composite app_private.crafted_relics;received text[];reward text;result jsonb;unequipped boolean:=false;
begin
 if u is null then raise exception 'AUTH_REQUIRED';end if;
 if p_operation_id is null or p_action is null or p_action not in ('recombine','dismantle') then raise exception 'INVALID_RECYCLING_REQUEST';end if;
 if jsonb_typeof(p_inputs) is distinct from 'array' then raise exception 'INVALID_RECYCLING_REQUEST';end if;
 if jsonb_array_length(p_inputs) not between 1 and 6 then raise exception 'INVALID_RECYCLING_REQUEST';end if;
 if exists(select 1 from jsonb_array_elements(p_inputs) e where jsonb_typeof(e) is distinct from 'object'
  or jsonb_typeof(e->'id') is distinct from 'string' or length(e->>'id') not between 1 and 200
  or jsonb_typeof(e->'quantity') is distinct from 'number' or coalesce(e->>'quantity','') !~ '^[1-6]$') then raise exception 'INVALID_RECYCLING_REQUEST';end if;
 select jsonb_agg(jsonb_build_object('id',id,'quantity',quantity) order by id),sum(quantity)::integer into inputs,total
 from(select id,sum(quantity)::integer quantity from jsonb_to_recordset(p_inputs) as i(id text,quantity integer) group by id)i;
 material_count:=total;
 if (p_action='recombine' and total not in (3,6)) or (p_action='dismantle' and total<>1) then raise exception 'RELIC_RECOMBINATION_COUNT';end if;
 -- Match the wallet-first locking order used by crafting, selling and equipment.
 perform app_private.get_gold_wallet();perform 1 from public.player_wallets where user_id=u for update;
 select * into previous from app_private.relic_recycling_operations where user_id=u and operation_id=p_operation_id;
 if found then
  if previous.action<>p_action or previous.inputs<>inputs then raise exception 'OPERATION_CONFLICT';end if;
  return app_private.relic_state()||jsonb_build_object('recycling',previous.result,'replayed',true);
 end if;
 if exists(select 1 from public.gold_transactions where user_id=u and operation_id=p_operation_id) then raise exception 'OPERATION_CONFLICT';end if;
 if p_action='recombine' then
  select count(*),count(distinct r.rarity),min(r.rarity::text) into total,distinct_grades,source_grade
  from public.fishing_relics r join jsonb_to_recordset(inputs) as i(id text,quantity integer) on r.id=i.id
  where r.enabled and r.rarity in ('rare','epic','mythic');
  if total<>jsonb_array_length(inputs) or distinct_grades<>1 then raise exception 'RELIC_RECOMBINATION_GRADE';end if;
  if material_count<>(case when source_grade='mythic' then 3 else 6 end) then raise exception 'RELIC_RECOMBINATION_COUNT';end if;
  target_grade:=case source_grade when 'rare' then 'epic'::public.game_rarity else 'mythic'::public.game_rarity end;
  perform 1 from app_private.player_fishing_relics r where r.user_id=u and r.relic_id in(select i->>'id' from jsonb_array_elements(inputs)i) order by relic_id for update;
  select relic_id into equipped from app_private.player_relic_loadouts where user_id=u;
  if exists(select 1 from jsonb_to_recordset(inputs) as i(id text,quantity integer)
   left join app_private.player_fishing_relics r on r.user_id=u and r.relic_id=i.id
   where coalesce(r.quantity,0)-case when equipped=i.id then 1 else 0 end<i.quantity) then raise exception 'RELIC_MATERIAL_UNAVAILABLE';end if;
  select id into reward from public.fishing_relics where enabled and rarity=target_grade order by random() limit 1;
  if reward is null then raise exception 'RELIC_RECOMBINATION_EMPTY';end if;
  delete from app_private.player_fishing_relics r using jsonb_to_recordset(inputs) as i(id text,quantity integer)
   where r.user_id=u and r.relic_id=i.id and r.quantity=i.quantity;
  update app_private.player_fishing_relics r set quantity=r.quantity-i.quantity from jsonb_to_recordset(inputs) as i(id text,quantity integer)
   where r.user_id=u and r.relic_id=i.id;
  insert into app_private.player_fishing_relic_discoveries(user_id,relic_id) select u,i->>'id' from jsonb_array_elements(inputs)i on conflict do nothing;
  received:=array[reward];
 else
  select * into composite from app_private.crafted_relics where user_id=u and id=inputs->0->>'id' for update;
  if not found then raise exception 'RELIC_CRAFTED_NOT_OWNED';end if;
  if exists(select 1 from app_private.player_relic_loadouts where user_id=u and crafted_id=composite.id) then
   if app_private.production_active_count()>4 then raise exception 'RELIC_FUEL_PRODUCTION_ACTIVE:4';end if;
   if app_private.bait_production_active_count()>4 then raise exception 'RELIC_BAIT_PRODUCTION_ACTIVE:4';end if;
   delete from app_private.player_relic_loadouts where user_id=u and crafted_id=composite.id;
   unequipped:=true;
  end if;
  received:=array[composite.base_id,composite.attached_id];
  delete from app_private.crafted_relics where user_id=u and id=composite.id;
 end if;
 insert into app_private.player_fishing_relics(user_id,relic_id,quantity)
  select u,id,1 from unnest(received)id order by id
  on conflict(user_id,relic_id) do update set quantity=app_private.player_fishing_relics.quantity+1;
 insert into app_private.player_fishing_relic_discoveries(user_id,relic_id) select u,id from unnest(received)id on conflict do nothing;
 result:=jsonb_build_object('action',p_action,'cost',0,'consumed',inputs,'receivedIds',to_jsonb(received),'unequipped',unequipped);
 insert into app_private.relic_recycling_operations(user_id,operation_id,action,inputs,result) values(u,p_operation_id,p_action,inputs,result);
 -- A zero-value receipt shares the operation namespace with existing relic commands.
 insert into public.gold_transactions(user_id,operation_id,action,item_id,delta) values(u,p_operation_id,'buy','relic-recycle:'||p_action,0);
 return app_private.relic_state()||jsonb_build_object('recycling',result,'replayed',false);
end $function$
;
