-- Reject equipped material types, including spare copies. Replays stay unchanged.
CREATE OR REPLACE FUNCTION app_private.craft_relic(p_base_id text, p_attached_id text, p_operation_id uuid)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''
AS $function$
declare u uuid:=auth.uid();a public.fishing_relics;b public.fishing_relics;w public.player_wallets;
 previous app_private.relic_craft_operations;cost integer;chance integer;score integer;success boolean;
 consumed text;crafted text;item text;result jsonb;equipped text;
begin
 if u is null then raise exception 'AUTH_REQUIRED';end if;
 if not app_private.notice_is_operator() then raise exception 'OPERATOR_REQUIRED';end if;
 if p_operation_id is null or p_base_id is null or p_attached_id is null then raise exception 'INVALID_OPERATION';end if;
 perform app_private.get_gold_wallet();select * into strict w from public.player_wallets where user_id=u for update;
 select * into previous from app_private.relic_craft_operations where user_id=u and operation_id=p_operation_id;
 if found then
  if previous.base_id<>p_base_id or previous.attached_id<>p_attached_id then raise exception 'OPERATION_CONFLICT';end if;
  return app_private.relic_state()||jsonb_build_object('craft',previous.result,'replayed',true);
 end if;
 if exists(select 1 from public.gold_transactions where user_id=u and operation_id=p_operation_id) then raise exception 'OPERATION_CONFLICT';end if;
 select * into a from public.fishing_relics where id=p_base_id and enabled;
 select * into b from public.fishing_relics where id=p_attached_id and enabled;
 if a.id is null or b.id is null then raise exception 'RELIC_ORIGINAL_REQUIRED';end if;
 if a.effect_kind=b.effect_kind then raise exception 'RELIC_SAME_EFFECT';end if;
 if a.rarity not in('rare','epic','mythic') or b.rarity not in('rare','epic','mythic') then raise exception 'RELIC_ORIGINAL_REQUIRED';end if;
 perform 1 from app_private.player_fishing_relics where user_id=u and relic_id in(a.id,b.id) order by relic_id for update;
 select relic_id into equipped from app_private.player_relic_loadouts where user_id=u;
 if equipped in(a.id,b.id) then raise exception 'RELIC_EQUIPPED';end if;
 if exists(select 1 from (values(a.id),(b.id)) materials(id) where
  coalesce((select quantity from app_private.player_fishing_relics where user_id=u and relic_id=materials.id),0)
  <=case when equipped=materials.id then 1 else 0 end) then raise exception 'RELIC_MATERIAL_UNAVAILABLE';end if;
 score:=case a.rarity when 'rare' then 1 when 'epic' then 2 else 3 end+case b.rarity when 'rare' then 1 when 'epic' then 2 else 3 end;
 cost:=case when score<=3 then 3000 when score=4 then 4000 else 5000 end;
 chance:=case when score<=3 then 45 when score=4 then 40 else 35 end;
 if w.gold<cost then raise exception 'INSUFFICIENT_GOLD';end if;
 success:=random()*100<chance;
 if success then
  insert into app_private.crafted_relics(user_id,base_id,attached_id) values(u,a.id,b.id) returning id into crafted;
 else
  consumed:=case when a.rarity<b.rarity then a.id when b.rarity<a.rarity then b.id when random()<0.5 then a.id else b.id end;
 end if;
 -- Equipped originals are rejected even when spare copies exist.
 delete from app_private.player_fishing_relics where user_id=u and relic_id in(a.id,b.id) and quantity=1 and (success or relic_id=consumed);
 update app_private.player_fishing_relics set quantity=quantity-1 where user_id=u and relic_id in(a.id,b.id) and (success or relic_id=consumed);
 insert into app_private.player_fishing_relic_discoveries(user_id,relic_id) values(u,a.id),(u,b.id) on conflict do nothing;
 update public.player_wallets set gold=gold-cost,updated_at=clock_timestamp() where user_id=u;
 item:='relic-craft:'||a.id||':'||b.id;
 insert into public.gold_transactions(user_id,operation_id,action,item_id,delta) values(u,p_operation_id,'buy',item,-cost);
 result:=jsonb_build_object('success',success,'cost',cost,'chance',chance,'consumedId',consumed,'craftedId',crafted);
 insert into app_private.relic_craft_operations(user_id,operation_id,base_id,attached_id,result) values(u,p_operation_id,a.id,b.id,result);
 return app_private.relic_state()||jsonb_build_object('craft',result,'replayed',false);
end$function$
;
