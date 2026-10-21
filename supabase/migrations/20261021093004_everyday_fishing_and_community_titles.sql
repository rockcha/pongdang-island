begin;

create function app_private.everyday_title_metrics(p_user uuid)
returns jsonb language sql stable security definer set search_path='' as $$
with manual as materialized (
 select species_id,row_number() over w position,lag(species_id) over w previous_species
 from app_private.title_fishing_log where user_id=p_user and source='manual'
 window w as (order by occurred_at,id)
)
select jsonb_build_object(
 'operation_failures',(select count(*) from app_private.prepared_fishing_casts
  where user_id=p_user and finished_at is not null and result->>'failure_reason'='minigame'),
 'fishing_failures',(select count(*) from manual where species_id is null),
 'recovery_catches',(select count(*) from manual where position>1 and previous_species is null and species_id is not null),
 'community_posts',(select count(*) from public.board_posts where author_id=p_user),
 'community_likes',(select count(*) from public.board_reactions r join public.board_posts p on p.id=r.post_id
  where p.author_id=p_user and r.user_id<>p_user and r.comment_id is null and r.value=1)
);
$$;
revoke all on function app_private.everyday_title_metrics(uuid) from public,anon,authenticated;

create or replace function app_private.sync_player_titles(p_user uuid)
returns jsonb language plpgsql security definer set search_path='' as $$
declare metrics jsonb;t record;
begin
 perform pg_advisory_xact_lock(hashtextextended('titles:'||p_user::text,0));
 metrics:=app_private.title_metrics(p_user)||app_private.rare_title_metrics(p_user)||app_private.challenge_title_metrics(p_user)||app_private.everyday_title_metrics(p_user);
 for t in select * from public.title_catalog c where coalesce((metrics->>c.metric)::bigint,0)>=c.target
 and (c.extra_metric is null or coalesce((metrics->>c.extra_metric)::bigint,0)>=c.extra_target)
 and not exists(select 1 from public.player_titles o where o.user_id=p_user and o.title_id=c.id) order by sort_order
 loop perform app_private.award_title(p_user,t.id);end loop;
 return metrics;
end $$;

-- Mark authors for reevaluation when posts or their reactions change.
create function app_private.title_board_activity()
returns trigger language plpgsql security definer set search_path='' as $$
declare previous_author uuid;current_author uuid;previous_post uuid;current_post uuid;
begin
 if tg_table_name='board_posts' then
  if tg_op<>'INSERT' then previous_author:=old.author_id;end if;
  if tg_op<>'DELETE' then current_author:=new.author_id;end if;
 else
  if tg_op<>'INSERT' then previous_post:=old.post_id;end if;
  if tg_op<>'DELETE' then current_post:=new.post_id;end if;
  insert into app_private.title_dirty(user_id)
   select distinct author_id from public.board_posts where id in (previous_post,current_post) on conflict do nothing;
 end if;
 if previous_author is not null then insert into app_private.title_dirty values(previous_author) on conflict do nothing;end if;
 if current_author is not null then insert into app_private.title_dirty values(current_author) on conflict do nothing;end if;
 return null;
end $$;
revoke all on function app_private.title_board_activity() from public,anon,authenticated;
create trigger title_board_posts after insert or update or delete on public.board_posts
 for each row execute function app_private.title_board_activity();
create trigger title_board_reactions after insert or update or delete on public.board_reactions
 for each row execute function app_private.title_board_activity();
notify pgrst,'reload schema';
commit;
