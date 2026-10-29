-- A crafted relic is shareable only through its owner's confirmed success receipt.
create or replace function app_private.crafted_relic_showcase(p_relic_id text)
returns jsonb language plpgsql stable security definer set search_path to ''
as $function$
declare u uuid:=auth.uid();payload jsonb;
begin
 if u is null then raise exception 'AUTH_REQUIRED';end if;
 select jsonb_build_object('operationId',o.operation_id,'regionName','유물 세공','caughtAt',c.created_at,'firstDiscovery',false,
  'species',jsonb_build_object('id',c.id,'kind','relic','name',a.name||' · '||b.name,
   'description',a.description||' / '||b.description,'rarity',greatest(a.rarity,b.rarity),
   'thumbnail_path',a.thumbnail_path,'sprite_sheet_path',null,'sell_price',0,
   'swim_y_min',null,'swim_y_max',null,'speed',0,'size',1,'crafted',true,
   'attached',jsonb_build_object('id',b.id,'name',b.name,'thumbnail_path',b.thumbnail_path)))
 into payload
 from app_private.crafted_relics c
 join app_private.relic_craft_operations o on o.user_id=c.user_id and o.result->>'craftedId'=c.id
  and o.result->>'success'='true' and o.base_id=c.base_id and o.attached_id=c.attached_id
 join public.fishing_relics a on a.id=c.base_id and a.enabled
 join public.fishing_relics b on b.id=c.attached_id and b.enabled
 where c.user_id=u and c.id=p_relic_id;
 if payload is null then raise exception 'CATCH_NOT_SHAREABLE';end if;
 return payload;
end $function$;
revoke all on function app_private.crafted_relic_showcase(text) from public,anon,authenticated;

alter table public.fishing_showcase_posts drop constraint fishing_showcase_posts_rarity_check;
alter table public.fishing_showcase_posts add constraint fishing_showcase_posts_rarity_check check (
 rarity in ('epic','mythic') or
 (rarity='rare' and coalesce(species->>'kind'='relic' and species->>'crafted'='true'
  and jsonb_typeof(species->'attached')='object',false))
);

create or replace function app_private.relic_showcase_catch(p_relic_id text)
returns jsonb language plpgsql security definer set search_path to ''
as $function$
declare u uuid:=auth.uid();p app_private.prepared_fishing_casts;
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
 if not found then raise exception 'CATCH_NOT_SHAREABLE';end if;
 return jsonb_build_object('operationId',p.operation_id,'species',p.result#>'{attempt,species}',
  'firstDiscovery',coalesce((p.result#>>'{attempt,firstDiscovery}')::boolean,false),
  'regionName',(select name from public.regions where id=p.region_id),'caughtAt',p.created_at);
end $function$;

create or replace function app_private.publish_fishing_showcase(p_operation_id uuid,p_caption text)
returns uuid language plpgsql security definer set search_path to ''
as $function$
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
 or coalesce(species->>'kind','') not in ('fish','trash','decoration','relic')
 then raise exception 'CATCH_NOT_SHAREABLE';end if;
 if species->>'kind'='relic' and (a.rarity<>'mythic' or p.relic_id is null
  or species->>'id' is distinct from 'relic-'||p.relic_id
  or p.snapshot->>'id' is distinct from species->>'id') then raise exception 'CATCH_NOT_SHAREABLE';end if;
 insert into public.fishing_showcase_posts(author_id,operation_id,caption,species,rarity,region_name,caught_at,first_discovery,render_version)
 values(u,p_operation_id,btrim(p_caption),species,a.rarity,
 (select name from public.regions where id=p.region_id),a.created_at,
 coalesce((p.result->'attempt'->>'firstDiscovery')::boolean,false),1) returning id into result_id;
 return result_id;
end $function$;
