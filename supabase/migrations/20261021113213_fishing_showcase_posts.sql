begin;

create table public.fishing_showcase_posts (
 id uuid primary key default gen_random_uuid(),
 author_id uuid not null references auth.users(id) on delete cascade,
 operation_id uuid not null,
 image_path text not null unique,
 caption text not null default '' check(char_length(caption)<=200),
 species jsonb not null check(jsonb_typeof(species)='object'),
 rarity public.game_rarity not null check(rarity in ('epic','mythic')),
 region_name text not null,
 caught_at timestamptz not null,
 created_at timestamptz not null default now(),
 unique(author_id,operation_id)
);
create index fishing_showcase_posts_feed_idx on public.fishing_showcase_posts(created_at desc,id desc);
create index fishing_showcase_posts_author_idx on public.fishing_showcase_posts(author_id,created_at desc,id desc);
create table public.fishing_showcase_reactions (
 post_id uuid not null references public.fishing_showcase_posts(id) on delete cascade,
 user_id uuid not null references auth.users(id) on delete cascade,
 reaction text not null check(reaction in ('celebrate','love','wow','luck')),
 primary key(post_id,user_id)
);
create index fishing_showcase_reactions_user_idx on public.fishing_showcase_reactions(user_id);
alter table public.fishing_showcase_posts enable row level security;
alter table public.fishing_showcase_reactions enable row level security;
revoke all on public.fishing_showcase_posts,public.fishing_showcase_reactions from anon,authenticated;
grant select on public.fishing_showcase_posts,public.fishing_showcase_reactions to authenticated;
create policy showcase_posts_read on public.fishing_showcase_posts for select to authenticated using((select auth.uid()) is not null);
create policy showcase_reactions_read on public.fishing_showcase_reactions for select to authenticated using((select auth.uid()) is not null);

insert into storage.buckets(id,name,public,file_size_limit,allowed_mime_types)
values('catch-showcases','catch-showcases',false,5242880,array['image/png']);

-- Only a completed, successful direct-fishing reservation authorizes capture uploads.
-- Keep the server reservation snapshot: selling the creature must not erase its catch evidence.
create function app_private.showcase_capture_allowed(p_path text) returns boolean
language sql stable security definer set search_path='' as $function$
 select auth.uid() is not null
 and p_path ~ '^[0-9a-f-]{36}/[0-9a-f-]{36}/[0-9a-f-]{36}\.png$'
 and split_part(p_path,'/',1)=auth.uid()::text
 and exists(select 1 from app_private.prepared_fishing_casts p
 join public.fishing_attempts a on a.user_id=p.user_id and a.operation_id=p.operation_id
 where p.user_id=auth.uid() and p.operation_id::text=split_part(p_path,'/',2)
 and p.finished_at is not null and p.eligible and a.rarity in ('epic','mythic')
 and p.result->'attempt'->'species'->>'id' is not null
 and p.result->'attempt'->'species'->>'rarity'=a.rarity::text)
$function$;
revoke all on function app_private.showcase_capture_allowed(text) from public,anon;
grant execute on function app_private.showcase_capture_allowed(text) to authenticated;
create policy showcase_images_insert on storage.objects for insert to authenticated
with check(bucket_id='catch-showcases' and app_private.showcase_capture_allowed(name));
create policy showcase_images_read on storage.objects for select to authenticated using(
 bucket_id='catch-showcases' and ((select auth.uid())::text=split_part(name,'/',1)
 or exists(select 1 from public.fishing_showcase_posts p where p.image_path=name)));
create policy showcase_images_delete on storage.objects for delete to authenticated using(
 bucket_id='catch-showcases' and (select auth.uid())::text=split_part(name,'/',1)
 and not exists(select 1 from public.fishing_showcase_posts p where p.image_path=name));

create function app_private.showcase_post_json(p public.fishing_showcase_posts) returns jsonb
language sql stable set search_path='' as $function$
 select to_jsonb(p)||jsonb_build_object('author_name',a.nickname,'avatar_path',a.avatar_path,
 'reactions',coalesce((select jsonb_object_agg(q.reaction,q.n) from
 (select reaction,count(*)::int n from public.fishing_showcase_reactions where post_id=p.id group by reaction) q),'{}'::jsonb),
 'my_reaction',(select reaction from public.fishing_showcase_reactions where post_id=p.id and user_id=auth.uid()))
 from public.player_profiles a where a.id=p.author_id
$function$;
revoke all on function app_private.showcase_post_json(public.fishing_showcase_posts) from public,anon,authenticated;

create function app_private.showcase_feed(p_mine boolean default false,p_offset integer default 0) returns jsonb
language plpgsql stable security definer set search_path='' as $function$
declare result jsonb;
begin
 if auth.uid() is null then raise exception 'AUTH_REQUIRED';end if;
 if p_offset is null or p_offset<0 or p_offset>10000 or p_mine is null then raise exception 'INVALID_SHOWCASE';end if;
 select jsonb_build_object('items',coalesce(jsonb_agg(app_private.showcase_post_json(p) order by p.created_at desc,p.id desc),'[]'::jsonb),
 'total',(select count(*) from public.fishing_showcase_posts where not p_mine or author_id=auth.uid())) into result
 from (select * from public.fishing_showcase_posts where not p_mine or author_id=auth.uid() order by created_at desc,id desc limit 20 offset p_offset) p;
 return result;
end $function$;

create function app_private.publish_fishing_showcase(p_operation_id uuid,p_image_path text,p_caption text) returns uuid
language plpgsql security definer set search_path='' as $function$
declare u uuid:=auth.uid();existing public.fishing_showcase_posts;p app_private.prepared_fishing_casts;result_id uuid;
begin
 if u is null then raise exception 'AUTH_REQUIRED';end if;
 if p_operation_id is null or p_caption is null or char_length(btrim(p_caption))>200 then raise exception 'INVALID_SHOWCASE';end if;
 perform pg_advisory_xact_lock(hashtextextended('showcase:'||u::text||':'||p_operation_id::text,0));
 select * into existing from public.fishing_showcase_posts where author_id=u and operation_id=p_operation_id;
 if found then return existing.id;end if;
 if p_image_path is null or split_part(p_image_path,'/',2)<>p_operation_id::text or not app_private.showcase_capture_allowed(p_image_path) then raise exception 'CATCH_NOT_SHAREABLE';end if;
 if not exists(select 1 from storage.objects where bucket_id='catch-showcases' and name=p_image_path
 and metadata->>'mimetype'='image/png' and (metadata->>'size')::bigint between 1 and 5242880) then raise exception 'INVALID_SHOWCASE_IMAGE';end if;
 select * into strict p from app_private.prepared_fishing_casts where user_id=u and operation_id=p_operation_id;
 insert into public.fishing_showcase_posts(author_id,operation_id,image_path,caption,species,rarity,region_name,caught_at)
 values(u,p_operation_id,p_image_path,btrim(p_caption),p.result->'attempt'->'species',p.rarity,
 (select name from public.regions where id=p.region_id),(p.result->'attempt'->>'created_at')::timestamptz) returning id into result_id;
 return result_id;
end $function$;

create function app_private.react_fishing_showcase(p_post_id uuid,p_reaction text default null) returns jsonb
language plpgsql security definer set search_path='' as $function$
declare p public.fishing_showcase_posts;u uuid:=auth.uid();
begin
 if u is null then raise exception 'AUTH_REQUIRED';end if;
 if p_reaction is not null and p_reaction not in ('celebrate','love','wow','luck') then raise exception 'INVALID_SHOWCASE_REACTION';end if;
 select * into p from public.fishing_showcase_posts where id=p_post_id for share;
 if not found then raise exception 'SHOWCASE_NOT_FOUND';end if;
 perform pg_advisory_xact_lock(hashtextextended('showcase-react:'||p_post_id::text||':'||u::text,0));
 if p_reaction is null then delete from public.fishing_showcase_reactions where post_id=p_post_id and user_id=u;
 else insert into public.fishing_showcase_reactions(post_id,user_id,reaction) values(p_post_id,u,p_reaction)
 on conflict(post_id,user_id) do update set reaction=excluded.reaction;end if;
 return app_private.showcase_post_json(p);
end $function$;

create function app_private.delete_fishing_showcase(p_post_id uuid) returns text
language plpgsql security definer set search_path='' as $function$
declare p public.fishing_showcase_posts;
begin
 if auth.uid() is null then raise exception 'AUTH_REQUIRED';end if;
 select * into p from public.fishing_showcase_posts where id=p_post_id for update;
 if not found then raise exception 'SHOWCASE_NOT_FOUND';end if;
 if p.author_id<>auth.uid() and not app_private.notice_is_operator() then raise exception 'NOT_ALLOWED';end if;
 delete from public.fishing_showcase_posts where id=p_post_id;
 return p.image_path;
end $function$;

create function public.showcase_feed(p_mine boolean default false,p_offset integer default 0) returns jsonb
language sql set search_path='' as $function$select app_private.showcase_feed(p_mine,p_offset)$function$;
create function public.publish_fishing_showcase(p_operation_id uuid,p_image_path text,p_caption text) returns uuid
language sql set search_path='' as $function$select app_private.publish_fishing_showcase(p_operation_id,p_image_path,p_caption)$function$;
create function public.react_fishing_showcase(p_post_id uuid,p_reaction text default null) returns jsonb
language sql set search_path='' as $function$select app_private.react_fishing_showcase(p_post_id,p_reaction)$function$;
create function public.delete_fishing_showcase(p_post_id uuid) returns text
language sql set search_path='' as $function$select app_private.delete_fishing_showcase(p_post_id)$function$;

revoke all on function app_private.showcase_feed(boolean,integer),app_private.publish_fishing_showcase(uuid,text,text),app_private.react_fishing_showcase(uuid,text),app_private.delete_fishing_showcase(uuid),
 public.showcase_feed(boolean,integer),public.publish_fishing_showcase(uuid,text,text),public.react_fishing_showcase(uuid,text),public.delete_fishing_showcase(uuid) from public,anon;
grant execute on function app_private.showcase_feed(boolean,integer),app_private.publish_fishing_showcase(uuid,text,text),app_private.react_fishing_showcase(uuid,text),app_private.delete_fishing_showcase(uuid),
 public.showcase_feed(boolean,integer),public.publish_fishing_showcase(uuid,text,text),public.react_fishing_showcase(uuid,text),public.delete_fishing_showcase(uuid) to authenticated;
notify pgrst,'reload schema';
commit;
