-- Publish only a server-stored catch from an owned, completed trip. The catch
-- UUID is the existing operation key so retries cannot publish it twice.
create or replace function app_private.publish_expedition_showcase(
 p_source text,p_trip_id uuid,p_collectible_id uuid,p_caption text
) returns uuid language plpgsql security definer set search_path='' as $$
declare u uuid:=auth.uid(); outcome jsonb; caught timestamptz; region_name text;
 item jsonb; existing uuid; result_id uuid;
begin
 if u is null then raise exception 'AUTH_REQUIRED';end if;
 if p_source is null or p_source not in ('trap','harbor') or p_trip_id is null
 or p_collectible_id is null or p_caption is null or char_length(btrim(p_caption))>200
 then raise exception 'INVALID_SHOWCASE';end if;
 if p_source='trap' then
  select t.result,t.claimed_at,r.name into outcome,caught,region_name
  from public.fishing_expeditions t join public.regions r on r.id=t.region_id
  where t.id=p_trip_id and t.user_id=u and t.claimed_at is not null;
 else
  select t.result,t.claimed_at,coalesce(t.result->>'regionName',r.name) into outcome,caught,region_name
  from public.harbor_voyages t join public.regions r on r.id=t.region_id
  where t.id=p_trip_id and t.user_id=u and t.claimed_at is not null;
 end if;
 if outcome is null or caught is null then raise exception 'CATCH_NOT_SHAREABLE';end if;
 select value into item from jsonb_array_elements(outcome->'items')
 where value->>'id'=p_collectible_id::text limit 1;
 if item is null or item->'species'->>'id' is null
 or coalesce(item->'species'->>'rarity','') not in ('epic','mythic')
 then raise exception 'CATCH_NOT_SHAREABLE';end if;
 perform pg_advisory_xact_lock(hashtextextended('showcase:'||u::text||':'||p_collectible_id::text,0));
 select id into existing from public.fishing_showcase_posts where author_id=u and operation_id=p_collectible_id;
 if found then return existing;end if;
 insert into public.fishing_showcase_posts(author_id,operation_id,caption,species,rarity,region_name,caught_at,first_discovery,render_version)
 values(u,p_collectible_id,btrim(p_caption),item->'species',(item->'species'->>'rarity')::public.game_rarity,
 region_name,caught,coalesce((item->>'firstDiscovery')::boolean,false),1) returning id into result_id;
 return result_id;
end $$;
revoke all on function app_private.publish_expedition_showcase(text,uuid,uuid,text) from public,anon,authenticated;
grant execute on function app_private.publish_expedition_showcase(text,uuid,uuid,text) to authenticated;

create or replace function public.publish_expedition_showcase(p_source text,p_trip_id uuid,p_collectible_id uuid,p_caption text)
returns uuid language sql security invoker set search_path='' as $$
 select app_private.publish_expedition_showcase(p_source,p_trip_id,p_collectible_id,p_caption)
$$;
revoke all on function public.publish_expedition_showcase(text,uuid,uuid,text) from public,anon,authenticated;
grant execute on function public.publish_expedition_showcase(text,uuid,uuid,text) to authenticated;
