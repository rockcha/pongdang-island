-- Every signed-in player can report bugs. Operator confirmation grants one reward, once.
create table public.bug_reports (
 id uuid primary key default gen_random_uuid(),
 author_id uuid not null default auth.uid() references public.player_profiles(id) on delete cascade,
 author_name text not null,
 title text not null check (char_length(btrim(title)) between 1 and 80),
 body text not null check (char_length(btrim(body)) between 1 and 3000),
 created_at timestamptz not null default now(),
 confirmed_at timestamptz,
 confirmed_by uuid references public.player_profiles(id) on delete set null,
 reward jsonb not null default '{}'::jsonb,
 updated_at timestamptz not null default now()
);
create index bug_reports_feed_idx on public.bug_reports(created_at desc, id desc);
create index bug_reports_author_idx on public.bug_reports(author_id);
-- Invoker security is sufficient: an author can already read their own profile.
create function app_private.stamp_bug_report_author() returns trigger
language plpgsql security invoker set search_path = '' as $$
begin
 if tg_op = 'INSERT' then
  if auth.uid() is null or new.author_id is distinct from auth.uid() then
   raise exception 'BUG_REPORT_FORBIDDEN';
  end if;
  select p.nickname into new.author_name from public.player_profiles p where p.id = auth.uid();
  if new.author_name is null then raise exception 'BUG_REPORT_PROFILE_REQUIRED'; end if;
 end if;
 new.updated_at := now();
 return new;
end;
$$;
revoke all on function app_private.stamp_bug_report_author() from public, anon, authenticated;
create trigger stamp_bug_report before insert or update on public.bug_reports
for each row execute function app_private.stamp_bug_report_author();
alter table public.bug_reports enable row level security;
revoke all on public.bug_reports from public, anon, authenticated;
grant select, delete on public.bug_reports to authenticated;
grant insert(id,title,body) on public.bug_reports to authenticated;
grant update(title,body) on public.bug_reports to authenticated;
grant all on public.bug_reports to service_role;

create policy bug_reports_read on public.bug_reports for select to authenticated using (true);
create policy bug_reports_insert on public.bug_reports for insert to authenticated
with check (author_id = (select auth.uid()));
create policy bug_reports_update on public.bug_reports for update to authenticated
using (author_id = (select auth.uid()) and confirmed_at is null) with check (author_id = (select auth.uid()) and confirmed_at is null);
create policy bug_reports_delete on public.bug_reports for delete to authenticated
using (author_id = (select auth.uid()) and confirmed_at is null);

-- Serialize on the post then the wallet. A retry returns the original reward,
-- without another draw, wallet increment, or notification.
create function app_private.confirm_bug_report(p_id uuid) returns jsonb
language plpgsql security definer set search_path = '' as $$
declare
 v_post public.bug_reports;
 v_inventory jsonb;
 v_rewards jsonb := '{}';
 v_baits text[] := array['bait_safe','bait_special','bait_epic','bait_magnet'];
 v_bait text;
begin
 if auth.uid() is null or not app_private.notice_is_operator() then
  raise exception 'BUG_REPORT_OPERATOR_REQUIRED';
 end if;
 select * into v_post from public.bug_reports where id=p_id for update;
 if not found then raise exception 'BUG_REPORT_NOT_FOUND'; end if;
 if v_post.confirmed_at is not null then return to_jsonb(v_post); end if;
 -- Explicitly validate the reward pool before touching the wallet.
 if (select count(*) from public.fishing_baits where id=any(v_baits)) <> 4 then
  raise exception 'BUG_REPORT_REWARD_UNAVAILABLE';
 end if;
 insert into public.player_wallets(user_id) values(v_post.author_id) on conflict do nothing;
 select inventory into v_inventory from public.player_wallets where user_id=v_post.author_id for update;
 v_bait := v_baits[1+floor(random()*cardinality(v_baits))::integer];
 v_rewards := jsonb_build_object(v_bait,1);
 v_inventory := jsonb_set(v_inventory,array[v_bait],to_jsonb(coalesce((v_inventory->>v_bait)::integer,0)+1));
 update public.player_wallets set inventory=v_inventory,updated_at=now() where user_id=v_post.author_id;
 update public.bug_reports set confirmed_at=now(),confirmed_by=auth.uid(),reward=v_rewards
 where id=p_id returning * into v_post;
 insert into public.notifications(recipient_id,actor_id,category,kind,title,body)
 values(v_post.author_id,auth.uid(),'general','reward','[운영팀] 버그 제보가 확인됐어요!',
  '「'||v_post.title||'」 제보가 버그로 확인되어 랜덤 특수미끼 1개를 지급했어요. 미끼통에서 확인해주세요.');
 return to_jsonb(v_post);
end;
$$;
revoke all on function app_private.confirm_bug_report(uuid) from public,anon,authenticated;
grant execute on function app_private.confirm_bug_report(uuid) to authenticated;
create function public.confirm_bug_report(p_id uuid) returns jsonb
language sql security invoker set search_path = '' as $$
 select app_private.confirm_bug_report(p_id)
$$;
revoke all on function public.confirm_bug_report(uuid) from public,anon,authenticated;
grant execute on function public.confirm_bug_report(uuid) to authenticated;

