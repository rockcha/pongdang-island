begin;

-- Never erase files implicitly. The inspected rollout has no uploaded showcase images.
do $guard$ begin
 if exists(select 1 from storage.objects where bucket_id='catch-showcases') then
  raise exception 'SHOWCASE_IMAGES_REQUIRE_REVIEW';
 end if;
end $guard$;
drop policy showcase_images_insert on storage.objects;
drop policy showcase_images_read on storage.objects;
drop policy showcase_images_delete on storage.objects;
drop function app_private.showcase_capture_allowed(text);
-- Retire the empty bucket separately through the Storage API. Hosted Storage
-- blocks direct DELETE statements, including statements matching zero rows.

alter table public.fishing_showcase_posts drop column image_path;
alter table public.fishing_showcase_posts
 add column first_discovery boolean not null default false,
 add column render_version smallint not null default 1 check(render_version=1);
update public.fishing_showcase_posts s set first_discovery=coalesce((p.result->'attempt'->>'firstDiscovery')::boolean,false)
from app_private.prepared_fishing_casts p where p.user_id=s.author_id and p.operation_id=s.operation_id;

drop function public.publish_fishing_showcase(uuid,text,text);
drop function app_private.publish_fishing_showcase(uuid,text,text);
create function app_private.publish_fishing_showcase(p_operation_id uuid,p_caption text) returns uuid
language plpgsql security definer set search_path='' as $function$
declare u uuid:=auth.uid();existing uuid;p app_private.prepared_fishing_casts;a public.fishing_attempts;result_id uuid;
begin
 if u is null then raise exception 'AUTH_REQUIRED';end if;
 if p_operation_id is null or p_caption is null or char_length(btrim(p_caption))>200 then raise exception 'INVALID_SHOWCASE';end if;
 perform pg_advisory_xact_lock(hashtextextended('showcase:'||u::text||':'||p_operation_id::text,0));
 select id into existing from public.fishing_showcase_posts where author_id=u and operation_id=p_operation_id;
 if found then return existing;end if;
 select * into p from app_private.prepared_fishing_casts where user_id=u and operation_id=p_operation_id;
 if not found then raise exception 'CATCH_NOT_SHAREABLE';end if;
 select * into a from public.fishing_attempts where user_id=u and operation_id=p_operation_id;
 if not found or p.finished_at is null or not p.eligible or a.rarity is null or a.rarity not in ('epic','mythic')
 or p.result->'attempt'->'species'->>'id' is null
 or p.result->'attempt'->'species'->>'rarity' is distinct from a.rarity::text
 then raise exception 'CATCH_NOT_SHAREABLE';end if;
 insert into public.fishing_showcase_posts(author_id,operation_id,caption,species,rarity,region_name,caught_at,first_discovery,render_version)
 values(u,p_operation_id,btrim(p_caption),p.result->'attempt'->'species',a.rarity,
 (select name from public.regions where id=p.region_id),a.created_at,
 coalesce((p.result->'attempt'->>'firstDiscovery')::boolean,false),1) returning id into result_id;
 return result_id;
end $function$;
create function public.publish_fishing_showcase(p_operation_id uuid,p_caption text) returns uuid
language sql set search_path='' as $function$select app_private.publish_fishing_showcase(p_operation_id,p_caption)$function$;
revoke all on function app_private.publish_fishing_showcase(uuid,text),public.publish_fishing_showcase(uuid,text) from public,anon;
grant execute on function app_private.publish_fishing_showcase(uuid,text),public.publish_fishing_showcase(uuid,text) to authenticated;

create or replace function app_private.delete_fishing_showcase(p_post_id uuid) returns text
language plpgsql security definer set search_path='' as $function$
declare p public.fishing_showcase_posts;
begin
 if auth.uid() is null then raise exception 'AUTH_REQUIRED';end if;
 select * into p from public.fishing_showcase_posts where id=p_post_id for update;
 if not found then raise exception 'SHOWCASE_NOT_FOUND';end if;
 if p.author_id<>auth.uid() and not app_private.notice_is_operator() then raise exception 'NOT_ALLOWED';end if;
 delete from public.fishing_showcase_posts where id=p_post_id;
 return p.id::text;
end $function$;
notify pgrst,'reload schema';
commit;
