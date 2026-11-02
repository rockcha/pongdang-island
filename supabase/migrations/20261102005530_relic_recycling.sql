begin;
-- Expose the original identity so dismantling can preview both returned relics.
create or replace function app_private.relic_state()
returns jsonb language plpgsql security definer set search_path='' as $$
declare u uuid:=auth.uid(); originals jsonb; composites jsonb;
begin
 if u is null then raise exception 'AUTH_REQUIRED';end if;
 select coalesce(jsonb_agg(to_jsonb(r)||jsonb_build_object(
  'discovered',exists(select 1 from app_private.player_fishing_relic_discoveries d where d.user_id=u and d.relic_id=r.id),
  'owned',coalesce(d.quantity,0)>0,'quantity',coalesce(d.quantity,0)) order by r.effect_kind,r.effect_value,r.id),'[]'::jsonb)
 into originals from public.fishing_relics r left join app_private.player_fishing_relics d on d.user_id=u and d.relic_id=r.id where r.enabled;
 select coalesce(jsonb_agg(jsonb_build_object('id',c.id,'baseId',c.base_id,'name',a.name||' · '||b.name,
  'description',a.description||' / '||b.description,'rarity',greatest(a.rarity,b.rarity),'thumbnail_path',a.thumbnail_path,
  'attached',jsonb_build_object('id',b.id,'name',b.name,'thumbnail_path',b.thumbnail_path),
  'crafted',true,'owned',true,'discovered',true,'quantity',1,'sell_price',0,
  'effect_kind',a.effect_kind,'effect_value',a.effect_value,
  'effects',jsonb_build_array(jsonb_build_object('kind',a.effect_kind,'value',a.effect_value),jsonb_build_object('kind',b.effect_kind,'value',b.effect_value))) order by c.created_at,c.id),'[]'::jsonb)
 into composites from app_private.crafted_relics c join public.fishing_relics a on a.id=c.base_id join public.fishing_relics b on b.id=c.attached_id
 where c.user_id=u and a.enabled and b.enabled;
 return jsonb_build_object('equippedId',(select coalesce(crafted_id,relic_id) from app_private.player_relic_loadouts where user_id=u),
  'changeFee',500,'equipFee',0,'unequipFee',500,'canCraft',true,'relics',originals||composites);
end $$;
create table app_private.relic_recycling_operations (
 user_id uuid not null references auth.users(id) on delete cascade,
 operation_id uuid not null,action text not null check(action in ('recombine','dismantle')),
 inputs jsonb not null,result jsonb not null,created_at timestamptz not null default clock_timestamp(),
 primary key(user_id,operation_id)
);
alter table app_private.relic_recycling_operations enable row level security;
revoke all on app_private.relic_recycling_operations from public,anon,authenticated;

create function app_private.recycle_relics(p_action text,p_inputs jsonb,p_operation_id uuid)
returns jsonb language plpgsql security definer set search_path='' as $$
declare u uuid:=auth.uid();previous app_private.relic_recycling_operations;inputs jsonb;
 total integer;distinct_grades integer;source_grade text;target_grade public.game_rarity;
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
 if (p_action='recombine' and total<>6) or (p_action='dismantle' and total<>1) then raise exception 'RELIC_RECOMBINATION_COUNT';end if;
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
  where r.enabled and r.rarity in ('rare','epic');
  if total<>jsonb_array_length(inputs) or distinct_grades<>1 then raise exception 'RELIC_RECOMBINATION_GRADE';end if;
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
end $$;
create function public.recycle_relics(p_action text,p_inputs jsonb,p_operation_id uuid)
returns jsonb language sql security invoker set search_path='' as $$select app_private.recycle_relics(p_action,p_inputs,p_operation_id)$$;
revoke all on function app_private.recycle_relics(text,jsonb,uuid),public.recycle_relics(text,jsonb,uuid) from public,anon;
grant execute on function app_private.recycle_relics(text,jsonb,uuid),public.recycle_relics(text,jsonb,uuid) to authenticated;
-- Share a recombined mythic using its server receipt, never a fabricated catch.
create function app_private.recombined_relic_showcase(p_operation uuid)
returns jsonb language plpgsql stable security definer set search_path='' as $$
declare u uuid:=auth.uid();payload jsonb;
begin
 if u is null then raise exception 'AUTH_REQUIRED';end if;
 select jsonb_build_object('operationId',o.operation_id,'regionName','유물 재조합','caughtAt',o.created_at,'firstDiscovery',false,
  'species',jsonb_build_object('id','relic-'||r.id,'kind','relic','name',r.name,'description',r.description,
   'rarity',r.rarity,'thumbnail_path',r.thumbnail_path,'sprite_sheet_path',null,'sell_price',r.sell_price,
   'swim_y_min',null,'swim_y_max',null,'speed',0,'size',1)) into payload
 from app_private.relic_recycling_operations o join public.fishing_relics r on r.id=o.result#>>'{receivedIds,0}'
 where o.user_id=u and o.operation_id=p_operation and o.action='recombine' and r.enabled and r.rarity='mythic';
 if payload is null then raise exception 'CATCH_NOT_SHAREABLE';end if;
 return payload;
end $$;
revoke all on function app_private.recombined_relic_showcase(uuid) from public,anon,authenticated;

create or replace function app_private.relic_showcase_catch(p_relic_id text)
returns jsonb language plpgsql security definer set search_path='' as $$
declare u uuid:=auth.uid();p app_private.prepared_fishing_casts;operation uuid;
begin
 if u is null then raise exception 'AUTH_REQUIRED';end if;
 if exists(select 1 from app_private.crafted_relics where user_id=u and id=p_relic_id) then
  return app_private.crafted_relic_showcase(p_relic_id);
 end if;
 select c.* into p from app_private.prepared_fishing_casts c
 join public.fishing_attempts a on a.user_id=c.user_id and a.operation_id=c.operation_id
 where c.user_id=u and c.relic_id=p_relic_id and c.finished_at is not null and c.eligible
  and a.rarity='mythic' and c.result#>>'{attempt,species,kind}'='relic'
  and c.result#>>'{attempt,species,rarity}'='mythic'
  and c.result#>>'{attempt,species,id}'='relic-'||p_relic_id
 order by c.finished_at desc,c.operation_id limit 1;
 if found then
  return jsonb_build_object('operationId',p.operation_id,'species',p.result#>'{attempt,species}',
   'firstDiscovery',coalesce((p.result#>>'{attempt,firstDiscovery}')::boolean,false),
   'regionName',(select name from public.regions where id=p.region_id),'caughtAt',p.created_at);
 end if;
 select o.operation_id into operation from app_private.relic_recycling_operations o
 join public.fishing_relics r on r.id=p_relic_id and r.enabled and r.rarity='mythic'
 where o.user_id=u and o.action='recombine' and o.result#>>'{receivedIds,0}'=p_relic_id
 order by o.created_at desc,o.operation_id limit 1;
 if not found then raise exception 'CATCH_NOT_SHAREABLE';end if;
 return app_private.recombined_relic_showcase(operation);
end $$;

create or replace function app_private.publish_fishing_showcase(p_operation_id uuid,p_caption text)
returns uuid language plpgsql security definer set search_path='' as $$
declare u uuid:=auth.uid();existing uuid;p app_private.prepared_fishing_casts;a public.fishing_attempts;
 result_id uuid;species jsonb;crafted_id text;crafted jsonb;
begin
 if u is null then raise exception 'AUTH_REQUIRED';end if;
 if p_operation_id is null or p_caption is null or char_length(btrim(p_caption))>200 then raise exception 'INVALID_SHOWCASE';end if;
 perform pg_advisory_xact_lock(hashtextextended('showcase:'||u::text||':'||p_operation_id::text,0));
 select id into existing from public.fishing_showcase_posts where author_id=u and operation_id=p_operation_id;
 if found then return existing;end if;
 select c.id into crafted_id from app_private.relic_craft_operations o
 join app_private.crafted_relics c on c.user_id=o.user_id and c.id=o.result->>'craftedId'
  and c.base_id=o.base_id and c.attached_id=o.attached_id
 where o.user_id=u and o.operation_id=p_operation_id and o.result->>'success'='true';
 if found then
  crafted:=app_private.crafted_relic_showcase(crafted_id);
 elsif exists(select 1 from app_private.relic_recycling_operations where user_id=u and operation_id=p_operation_id and action='recombine') then
  crafted:=app_private.recombined_relic_showcase(p_operation_id);
 end if;
 if crafted is not null then
  species:=crafted->'species';
  insert into public.fishing_showcase_posts(author_id,operation_id,caption,species,rarity,region_name,caught_at,first_discovery,render_version)
  values(u,p_operation_id,btrim(p_caption),species,(species->>'rarity')::public.game_rarity,
   crafted->>'regionName',(crafted->>'caughtAt')::timestamptz,false,1) returning id into result_id;
  return result_id;
 end if;
 select * into p from app_private.prepared_fishing_casts where user_id=u and operation_id=p_operation_id;
 if not found then raise exception 'CATCH_NOT_SHAREABLE';end if;
 select * into a from public.fishing_attempts where user_id=u and operation_id=p_operation_id;
 species:=p.result->'attempt'->'species';
 if not found or p.finished_at is null or not p.eligible or a.rarity is null or a.rarity not in ('epic','mythic')
 or species->>'id' is null or species->>'rarity' is distinct from a.rarity::text
 or coalesce(species->>'kind','') not in ('fish','trash','decoration','relic') then raise exception 'CATCH_NOT_SHAREABLE';end if;
 if species->>'kind'='relic' and (a.rarity<>'mythic' or p.relic_id is null
  or species->>'id' is distinct from 'relic-'||p.relic_id
  or p.snapshot->>'id' is distinct from species->>'id') then raise exception 'CATCH_NOT_SHAREABLE';end if;
 insert into public.fishing_showcase_posts(author_id,operation_id,caption,species,rarity,region_name,caught_at,first_discovery,render_version)
 values(u,p_operation_id,btrim(p_caption),species,a.rarity,
 (select name from public.regions where id=p.region_id),a.created_at,
 coalesce((p.result->'attempt'->>'firstDiscovery')::boolean,false),1) returning id into result_id;
 return result_id;
end $$;
notify pgrst,'reload schema';
commit;
