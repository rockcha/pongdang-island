-- Keep queued work intact when another transaction is already processing it.
create or replace function app_private.sync_titles() returns integer
language plpgsql security definer set search_path='' as $function$
declare u uuid:=auth.uid();before_count integer;after_count integer;
begin
 if u is null then raise exception 'AUTH_REQUIRED';end if;
 perform 1 from app_private.title_dirty where user_id=u for update skip locked;
 if not found then return 0;end if;
 if not pg_try_advisory_xact_lock(hashtextextended('titles:'||u::text,0)) then return 0;end if;
 delete from app_private.title_dirty where user_id=u;
 select count(*) into before_count from public.player_titles where user_id=u;
 perform app_private.sync_player_titles(u);
 select count(*) into after_count from public.player_titles where user_id=u;
 return after_count-before_count;
end $function$;

-- Limit the batch's lock lifetime and skip players being processed elsewhere.
-- Unprocessed dirty rows remain queued for the next run.
create or replace function app_private.process_title_queue() returns integer
language plpgsql security definer set search_path='' as $function$
declare r record;n integer:=0;started timestamptz:=clock_timestamp();
begin
 for r in select user_id from app_private.title_dirty order by user_id limit 10 for update skip locked loop
  exit when clock_timestamp()-started>interval '1 second';
  if not pg_try_advisory_xact_lock(hashtextextended('titles:'||r.user_id::text,0)) then continue;end if;
  perform app_private.sync_player_titles(r.user_id);
  delete from app_private.title_dirty where user_id=r.user_id;n:=n+1;
 end loop;
 return n;
end $function$;

-- Invoker rights preserve each feed's existing RLS, including friends-only posts.
-- Return timestamps only: no counts, post bodies, avatars or reactions.
create function public.new_content_state() returns jsonb
language plpgsql stable security invoker set search_path='' as $function$
declare u uuid:=auth.uid();
begin
 if u is null then raise exception 'AUTH_REQUIRED';end if;
 return jsonb_build_object(
  'board',(select created_at from public.board_posts where author_id<>u order by created_at desc,id desc limit 1),
  'exchange',(select created_at from public.exchange_listings where owner_id<>u and status='active' and side='sell'
   and offer->>'kind' in ('collectible','bait','fuel') and wanted->>'kind'='gold' and wanted->>'id'='gold'
   order by created_at desc,id limit 1),
  'suggestions',(select created_at from public.suggestion_posts where author_id<>u order by created_at desc,id desc limit 1),
  'bugs',(select created_at from public.bug_reports where author_id<>u order by created_at desc,id desc limit 1),
  'showcase',(select created_at from public.fishing_showcase_posts where author_id<>u order by created_at desc,id desc limit 1)
 );
end $function$;
revoke all on function public.new_content_state() from public,anon,authenticated;
grant execute on function public.new_content_state() to authenticated;
notify pgrst,'reload schema';
