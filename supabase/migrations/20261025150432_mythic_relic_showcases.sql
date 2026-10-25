begin;

create index prepared_relic_showcase_history on app_private.prepared_fishing_casts(user_id,relic_id,finished_at desc)
 where relic_id is not null and finished_at is not null;

CREATE OR REPLACE FUNCTION app_private.publish_fishing_showcase(p_operation_id uuid, p_caption text)
 RETURNS uuid
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''
AS $function$
declare u uuid:=auth.uid();existing uuid;p app_private.prepared_fishing_casts;a public.fishing_attempts;result_id uuid;species jsonb;
begin
 if u is null then raise exception 'AUTH_REQUIRED';end if;
 if p_operation_id is null or p_caption is null or char_length(btrim(p_caption))>200 then raise exception 'INVALID_SHOWCASE';end if;
 perform pg_advisory_xact_lock(hashtextextended('showcase:'||u::text||':'||p_operation_id::text,0));
 select id into existing from public.fishing_showcase_posts where author_id=u and operation_id=p_operation_id;
 if found then return existing;end if;
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

-- Inventory sharing reuses the genuine catch operation, never client artwork
-- or claimed ownership alone. Failed/pending casts cannot become posts.
create function app_private.relic_showcase_catch(p_relic_id text)
returns jsonb language plpgsql security definer set search_path='' as $function$
declare u uuid:=auth.uid();p app_private.prepared_fishing_casts;
begin
 if u is null then raise exception 'AUTH_REQUIRED';end if;
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
create function public.relic_showcase_catch(p_relic_id text)
returns jsonb language sql set search_path='' as $function$select app_private.relic_showcase_catch(p_relic_id)$function$;
revoke all on function app_private.relic_showcase_catch(text) from public,anon,authenticated;
revoke all on function public.relic_showcase_catch(text) from public,anon,authenticated;
grant execute on function app_private.relic_showcase_catch(text) to authenticated;
grant execute on function public.relic_showcase_catch(text) to authenticated;
notify pgrst,'reload schema';
commit;
