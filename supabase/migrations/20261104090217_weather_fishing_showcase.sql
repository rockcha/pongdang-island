-- Weather catches share only through an authenticated, completed server reservation.
alter table public.fishing_showcase_posts drop constraint fishing_showcase_posts_rarity_check;
alter table public.fishing_showcase_posts add constraint fishing_showcase_posts_rarity_check
 check (
  rarity in ('epic','mythic')
  or (rarity='rare' and coalesce(species->>'kind'='relic' and species->>'crafted'='true'
   and jsonb_typeof(species->'attached')='object',false))
  or coalesce(species->>'kind'='fish' and species->>'weather_type' in ('rain','snow','dust','meteor','blossom'),false)
 );

CREATE OR REPLACE FUNCTION app_private.publish_fishing_showcase(p_operation_id uuid, p_caption text)
 RETURNS uuid
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''
AS $function$
declare u uuid:=auth.uid();existing uuid;p app_private.prepared_fishing_casts;a public.fishing_attempts;
 result_id uuid;species jsonb;weather_catch boolean;crafted_id text;crafted jsonb;
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
 weather_catch:=coalesce(species->>'kind'='fish'
  and species->>'weather_type' in ('rain','snow','dust','meteor','blossom')
  and p.species_id=species->>'id'
  and p.snapshot->>'id'=species->>'id'
  and p.snapshot->>'weather_type'=species->>'weather_type',false);
 if not found or p.finished_at is null or not p.eligible or a.rarity is null or (a.rarity not in ('epic','mythic') and not weather_catch)
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
end $function$;
