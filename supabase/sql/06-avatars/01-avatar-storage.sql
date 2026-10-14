-- Apply AFTER 01~05. Additive change for already-installed databases.
begin;
alter table public.player_profiles add column if not exists avatar_path text;
insert into storage.buckets(id,name,public,file_size_limit,allowed_mime_types)
values ('avatars','avatars',true,5242880,array['image/webp'])
on conflict(id) do update set public=true,file_size_limit=5242880,allowed_mime_types=array['image/webp'];

-- Public bucket serves image URLs. Object listing/writes are limited to the owner folder.
drop policy if exists avatars_owner_select on storage.objects;
create policy avatars_owner_select on storage.objects for select to authenticated
  using(bucket_id='avatars' and split_part(name,'/',1)=(select auth.uid())::text);
drop policy if exists avatars_owner_insert on storage.objects;
create policy avatars_owner_insert on storage.objects for insert to authenticated
  with check(bucket_id='avatars' and name ~ ('^' || (select auth.uid())::text || '/[a-f0-9-]{36}\.webp$'));
drop policy if exists avatars_owner_delete on storage.objects;
create policy avatars_owner_delete on storage.objects for delete to authenticated
  using(bucket_id='avatars' and split_part(name,'/',1)=(select auth.uid())::text);
-- Uploads always use a new UUID filename, not upsert; no UPDATE policy is required.

create or replace function app_private.set_player_avatar(p_path text)
returns public.player_profiles language plpgsql security definer set search_path = '' as $$
declare v_uid uuid := auth.uid(); v_profile public.player_profiles;
begin
  if v_uid is null then raise exception 'AUTH_REQUIRED'; end if;
  perform app_private.sync_player_profile();
  if p_path is not null then
    if p_path !~ ('^' || v_uid::text || '/[a-f0-9-]{36}\.webp$') then raise exception 'INVALID_AVATAR_PATH'; end if;
    if not exists(select 1 from storage.objects where bucket_id='avatars' and name=p_path and metadata->>'mimetype'='image/webp') then
      raise exception 'AVATAR_NOT_FOUND';
    end if;
  end if;
  update public.player_profiles set avatar_path=p_path where id=v_uid returning * into v_profile;
  return v_profile;
end $$;
create or replace function public.set_player_avatar(p_path text) returns public.player_profiles
language sql security invoker set search_path = '' as $$ select app_private.set_player_avatar(p_path) $$;
revoke all on function app_private.set_player_avatar(text),public.set_player_avatar(text) from public,anon;
grant execute on function app_private.set_player_avatar(text),public.set_player_avatar(text) to authenticated;

-- Related users receive profile changes under the existing profiles_related_read RLS policy.
do $$ begin
  if not exists(select 1 from pg_publication_tables where pubname='supabase_realtime' and schemaname='public' and tablename='player_profiles') then
    alter publication supabase_realtime add table public.player_profiles;
  end if;
end $$;
notify pgrst, 'reload schema';
commit;
