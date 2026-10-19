-- Friends visibility is evaluated against the current accepted relationship.
-- Operators may review friends-only posts; adoption rewards are delivered exactly once.
create table public.suggestion_posts (
 id uuid primary key default gen_random_uuid(),
 author_id uuid not null default auth.uid() references public.player_profiles(id) on delete cascade,
 author_name text not null,
 title text not null check (char_length(btrim(title)) between 1 and 80),
 body text not null check (char_length(btrim(body)) between 1 and 3000),
 friends_only boolean not null default false,
 created_at timestamptz not null default now(),
 adopted_at timestamptz,
 adopted_by uuid references public.player_profiles(id) on delete set null,
 reward jsonb not null default '{}'::jsonb,
 updated_at timestamptz not null default now()
);
create index suggestion_posts_feed_idx on public.suggestion_posts(created_at desc, id desc);
create index suggestion_posts_author_idx on public.suggestion_posts(author_id);
-- Invoker security is sufficient: an author can already read their own profile.
create function app_private.stamp_suggestion_author() returns trigger
language plpgsql security invoker set search_path = '' as $$
begin
 if tg_op = 'INSERT' then
  if auth.uid() is null or new.author_id is distinct from auth.uid() then
   raise exception 'SUGGESTION_FORBIDDEN';
  end if;
  select p.nickname into new.author_name from public.player_profiles p where p.id = auth.uid();
  if new.author_name is null then raise exception 'SUGGESTION_PROFILE_REQUIRED'; end if;
 end if;
 new.updated_at := now();
 return new;
end;
$$;
revoke all on function app_private.stamp_suggestion_author() from public, anon, authenticated;
create trigger stamp_suggestion_post before insert or update on public.suggestion_posts
for each row execute function app_private.stamp_suggestion_author();
alter table public.suggestion_posts enable row level security;
revoke all on public.suggestion_posts from public, anon, authenticated;
grant select, delete on public.suggestion_posts to authenticated;
grant insert(id,title,body,friends_only) on public.suggestion_posts to authenticated;
grant update(title,body,friends_only) on public.suggestion_posts to authenticated;
grant all on public.suggestion_posts to service_role;

create policy suggestion_posts_read on public.suggestion_posts for select to authenticated using (
 (select app_private.notice_is_operator()) or author_id = (select auth.uid()) or not friends_only or exists (
  select 1 from public.friend_requests f where f.status = 'accepted' and (
   (f.sender_id = (select auth.uid()) and f.recipient_id = suggestion_posts.author_id) or
   (f.recipient_id = (select auth.uid()) and f.sender_id = suggestion_posts.author_id)
  )
 )
);
create policy suggestion_posts_insert on public.suggestion_posts for insert to authenticated
with check (author_id = (select auth.uid()));
create policy suggestion_posts_update on public.suggestion_posts for update to authenticated
using (author_id = (select auth.uid()) and adopted_at is null) with check (author_id = (select auth.uid()) and adopted_at is null);
create policy suggestion_posts_delete on public.suggestion_posts for delete to authenticated
using (author_id = (select auth.uid()) and adopted_at is null);

-- Serialize on the post then the wallet. A retry returns the original reward,
-- without another draw, wallet increment, or notification.
create function app_private.adopt_suggestion(p_id uuid) returns jsonb
language plpgsql security definer set search_path = '' as $$
declare
 v_post public.suggestion_posts;
 v_inventory jsonb;
 v_rewards jsonb := '{}';
 v_baits text[] := array['bait_safe','bait_special','bait_epic','bait_magnet'];
 v_bait text;
 v_i integer;
begin
 if auth.uid() is null or not app_private.notice_is_operator() then
  raise exception 'SUGGESTION_OPERATOR_REQUIRED';
 end if;
 select * into v_post from public.suggestion_posts where id=p_id for update;
 if not found then raise exception 'SUGGESTION_NOT_FOUND'; end if;
 if v_post.adopted_at is not null then return to_jsonb(v_post); end if;
 -- Explicitly validate the reward pool before touching the wallet.
 if (select count(*) from public.fishing_baits where id=any(v_baits)) <> 4 then
  raise exception 'SUGGESTION_REWARD_UNAVAILABLE';
 end if;
 insert into public.player_wallets(user_id) values(v_post.author_id) on conflict do nothing;
 select inventory into v_inventory from public.player_wallets where user_id=v_post.author_id for update;
 for v_i in 1..2 loop
  v_bait := v_baits[1+floor(random()*cardinality(v_baits))::integer];
  v_rewards := jsonb_set(v_rewards,array[v_bait],to_jsonb(coalesce((v_rewards->>v_bait)::integer,0)+1));
  v_inventory := jsonb_set(v_inventory,array[v_bait],to_jsonb(coalesce((v_inventory->>v_bait)::integer,0)+1));
 end loop;
 update public.player_wallets set inventory=v_inventory,updated_at=now() where user_id=v_post.author_id;
 update public.suggestion_posts set adopted_at=now(),adopted_by=auth.uid(),reward=v_rewards
 where id=p_id returning * into v_post;
 insert into public.notifications(recipient_id,actor_id,category,kind,title,body)
 values(v_post.author_id,auth.uid(),'general','reward','[운영팀] 아이디어가 채택됐어요!',
  '「'||v_post.title||'」 건의가 채택되어 랜덤 특수미끼 2개를 지급했어요. 미끼통에서 확인해주세요.');
 return to_jsonb(v_post);
end;
$$;
revoke all on function app_private.adopt_suggestion(uuid) from public,anon,authenticated;
grant execute on function app_private.adopt_suggestion(uuid) to authenticated;
create function public.adopt_suggestion(p_id uuid) returns jsonb
language sql security invoker set search_path = '' as $$
 select app_private.adopt_suggestion(p_id)
$$;
revoke all on function public.adopt_suggestion(uuid) from public,anon,authenticated;
grant execute on function public.adopt_suggestion(uuid) to authenticated;

