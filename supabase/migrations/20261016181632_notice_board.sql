begin;
-- Operators are assigned by a database owner, never by editable user metadata.
create table app_private.notice_operators(user_id uuid primary key references auth.users(id) on delete cascade);
alter table app_private.notice_operators enable row level security;
revoke all on app_private.notice_operators from public,anon,authenticated;
create function app_private.notice_is_operator() returns boolean language sql stable security definer set search_path='' as $$
 select auth.uid() is not null and exists(select 1 from app_private.notice_operators where user_id=auth.uid())
$$;
create function public.notice_is_operator() returns boolean language sql stable security invoker set search_path='' as $$select app_private.notice_is_operator()$$;
revoke all on function app_private.notice_is_operator(),public.notice_is_operator() from public,anon;
grant execute on function app_private.notice_is_operator(),public.notice_is_operator() to authenticated;

create table public.notices(
 id uuid primary key,category text not null check(category in('guide','update','maintenance','event')),
 title text not null check(char_length(title) between 2 and 100),body text not null default '' check(char_length(body)<=20000),
 images text[] not null default '{}' check(cardinality(images)<=6),
 status text not null check(status in('draft','published','hidden')),pinned boolean not null default false,
 starts_at timestamptz,ends_at timestamptz,check(ends_at is null or starts_at is null or ends_at>starts_at),
 author_id uuid references auth.users(id) on delete set null,
 created_at timestamptz not null default clock_timestamp(),updated_at timestamptz not null default clock_timestamp(),published_at timestamptz,
 revision integer not null default 1
);
create index notices_published on public.notices(pinned desc,published_at desc,id) where status='published';
alter table public.notices enable row level security;
revoke all on public.notices from public,anon,authenticated;
grant select on public.notices to authenticated;
create policy notices_read on public.notices for select to authenticated using(status='published' or (select app_private.notice_is_operator()));

-- Private bucket: unpublished images cannot be read by guessing a URL.
insert into storage.buckets(id,name,public,file_size_limit,allowed_mime_types)
values('notice-images','notice-images',false,5242880,array['image/webp','image/png','image/jpeg'])
on conflict(id) do update set public=false,file_size_limit=excluded.file_size_limit,allowed_mime_types=excluded.allowed_mime_types;
create policy notice_images_read on storage.objects for select to authenticated using(
 bucket_id='notice-images' and ((select app_private.notice_is_operator()) or exists(
 select 1 from public.notices n where n.status='published' and storage.objects.name=any(n.images))));
create policy notice_images_upload on storage.objects for insert to authenticated with check(
 bucket_id='notice-images' and (select app_private.notice_is_operator()) and name ~ '^[0-9a-f-]{36}/[0-9a-f-]{36}\.(webp|png|jpg)$');
-- Images referenced by a saved notice cannot be removed accidentally.
create policy notice_images_delete on storage.objects for delete to authenticated using(
 bucket_id='notice-images' and (select app_private.notice_is_operator()) and not exists(select 1 from public.notices n where storage.objects.name=any(n.images)));

create function app_private.notice_save(p_id uuid,p_category text,p_title text,p_body text,p_images text[],p_status text,p_pinned boolean,p_starts_at timestamptz,p_ends_at timestamptz,p_revision integer) returns jsonb
language plpgsql security definer set search_path='' as $$
declare n public.notices;v_path text;
begin
 if not app_private.notice_is_operator() then raise exception 'NOTICE_FORBIDDEN';end if;
 if p_id is null or p_category is null or p_category not in('guide','update','maintenance','event') or p_title is null or char_length(btrim(p_title)) not between 2 and 100
 or p_body is null or char_length(p_body)>20000 or p_images is null or cardinality(p_images)>6 or array_position(p_images,null) is not null
 or p_status is null or p_status not in('draft','published','hidden') or p_pinned is null or p_revision is null or p_revision<0
 or (p_starts_at is not null and p_ends_at is not null and p_ends_at<=p_starts_at) then raise exception 'INVALID_NOTICE';end if;
 if p_status='published' and btrim(p_body)='' and cardinality(p_images)=0 then raise exception 'NOTICE_EMPTY';end if;
 foreach v_path in array p_images loop
  if split_part(v_path,'/',1)<>p_id::text or not exists(select 1 from storage.objects where bucket_id='notice-images' and name=v_path and metadata->>'mimetype' in('image/png','image/jpeg','image/webp')) then raise exception 'NOTICE_IMAGE_INVALID';end if;
 end loop;
 -- Serialize creates and updates, including duplicate retries of the same document.
 perform pg_advisory_xact_lock(hashtextextended(p_id::text,0));
 select * into n from public.notices where id=p_id for update;
 if found then
  if n.revision<>p_revision then raise exception 'NOTICE_CHANGED';end if;
  update public.notices set category=p_category,title=btrim(p_title),body=p_body,images=p_images,status=p_status,pinned=p_pinned,
   starts_at=p_starts_at,ends_at=p_ends_at,updated_at=clock_timestamp(),revision=revision+1,
   published_at=case when p_status='published' then coalesce(published_at,clock_timestamp()) else published_at end where id=p_id returning * into n;
 else
  if p_revision<>0 then raise exception 'NOTICE_CHANGED';end if;
  insert into public.notices(id,category,title,body,images,status,pinned,starts_at,ends_at,author_id,published_at)
  values(p_id,p_category,btrim(p_title),p_body,p_images,p_status,p_pinned,p_starts_at,p_ends_at,auth.uid(),case when p_status='published' then clock_timestamp() end) returning * into n;
 end if;
 return to_jsonb(n);
end $$;
create function public.notice_save(p_id uuid,p_category text,p_title text,p_body text,p_images text[],p_status text,p_pinned boolean,p_starts_at timestamptz,p_ends_at timestamptz,p_revision integer) returns jsonb
language sql security invoker set search_path='' as $$select app_private.notice_save(p_id,p_category,p_title,p_body,p_images,p_status,p_pinned,p_starts_at,p_ends_at,p_revision)$$;
revoke all on function app_private.notice_save(uuid,text,text,text,text[],text,boolean,timestamptz,timestamptz,integer),public.notice_save(uuid,text,text,text,text[],text,boolean,timestamptz,timestamptz,integer) from public,anon;
grant execute on function app_private.notice_save(uuid,text,text,text,text[],text,boolean,timestamptz,timestamptz,integer),public.notice_save(uuid,text,text,text,text[],text,boolean,timestamptz,timestamptz,integer) to authenticated;
notify pgrst,'reload schema';
commit;
