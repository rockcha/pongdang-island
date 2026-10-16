begin;
create table public.memory_game_runs(
 id uuid primary key default gen_random_uuid(),user_id uuid not null references auth.users(id) on delete cascade,
 operation_id uuid not null,created_at timestamptz not null default clock_timestamp(),
 timer_started_at timestamptz,finished_at timestamptz,abandoned_at timestamptz,
 elapsed_ms bigint check(elapsed_ms>=0),moves integer not null default 0 check(moves>=0),unique(user_id,operation_id)
);
create unique index memory_one_active on public.memory_game_runs(user_id) where finished_at is null and abandoned_at is null;
create index memory_week_rank on public.memory_game_runs(finished_at,elapsed_ms,user_id) where finished_at is not null;
create table app_private.memory_game_boards(
 run_id uuid primary key references public.memory_game_runs(id) on delete cascade,
 deck text[] not null check(array_length(deck,1)=25 and deck[13]='pongi'),
 matched integer[] not null default '{}',first_card integer,second_card integer,clear_at timestamptz
);
alter table public.memory_game_runs enable row level security;
alter table app_private.memory_game_boards enable row level security;
revoke all on public.memory_game_runs,app_private.memory_game_boards from public,anon,authenticated;

create function app_private.memory_response(p_id uuid) returns jsonb language plpgsql set search_path='' as $$
declare r public.memory_game_runs;b app_private.memory_game_boards;v_cards jsonb;
begin
 if p_id is null then return jsonb_build_object('run',null,'serverNow',clock_timestamp()); end if;
 select * into strict r from public.memory_game_runs where id=p_id;
 select * into strict b from app_private.memory_game_boards where run_id=p_id;
 select jsonb_agg(case when i=13 or i=any(b.matched) or i=b.first_card or i=b.second_card then to_jsonb(b.deck[i]) else 'null'::jsonb end order by i) into v_cards from generate_series(1,25) i;
 return jsonb_build_object('serverNow',clock_timestamp(),'run',jsonb_build_object('id',r.id,'cards',v_cards,
 'matched',to_jsonb(b.matched),'first',b.first_card,'second',b.second_card,'clearAt',b.clear_at,
 'startedAt',r.timer_started_at,'elapsedMs',case when r.elapsed_ms is not null then r.elapsed_ms when r.timer_started_at is null then 0 else floor(extract(epoch from(clock_timestamp()-r.timer_started_at))*1000)::bigint end,
 'moves',r.moves,'finished',r.finished_at is not null,'abandoned',r.abandoned_at is not null));
end $$;

create function app_private.memory_game(p_action text,p_operation_id uuid default null,p_run_id uuid default null,p_card integer default null) returns jsonb
language plpgsql security definer set search_path='' as $$
declare v_uid uuid:=auth.uid();r public.memory_game_runs;b app_private.memory_game_boards;v_gold integer;v_deck text[];
begin
 if v_uid is null then raise exception 'AUTH_REQUIRED'; end if;
 if p_action is null or p_action not in ('state','start','flip','clear','leave') then raise exception 'INVALID_MEMORY_ACTION'; end if;
 if p_action='state' then
  if p_run_id is null then select * into r from public.memory_game_runs where user_id=v_uid and finished_at is null and abandoned_at is null;
  else select * into r from public.memory_game_runs where user_id=v_uid and id=p_run_id;
   if not found then raise exception 'MEMORY_RUN_NOT_FOUND'; end if;
  end if;
  return app_private.memory_response(r.id);
 end if;
 perform app_private.get_gold_wallet();
 select gold into v_gold from public.player_wallets where user_id=v_uid for update;
 if p_action='start' then
  if p_operation_id is null then raise exception 'INVALID_OPERATION'; end if;
  select * into r from public.memory_game_runs where user_id=v_uid and operation_id=p_operation_id;
  if found then return app_private.memory_response(r.id); end if;
  select * into r from public.memory_game_runs where user_id=v_uid and finished_at is null and abandoned_at is null;
  if found then return app_private.memory_response(r.id); end if;
  if v_gold<10 then raise exception 'INSUFFICIENT_GOLD'; end if;
  select array_agg(face order by shuffle) into v_deck from (
   select face,random() shuffle from unnest(array['starfish','shell','pearl','rod','float','lighthouse','boat','treasure','coral','fish','shrimp','letter']) face cross join generate_series(1,2)) s;
  v_deck:=v_deck[1:12]||array['pongi']||v_deck[13:24];
  insert into public.memory_game_runs(user_id,operation_id) values(v_uid,p_operation_id) returning * into r;
  insert into app_private.memory_game_boards(run_id,deck) values(r.id,v_deck);
  update public.player_wallets set gold=gold-10,updated_at=clock_timestamp() where user_id=v_uid;
  insert into public.gold_transactions(user_id,operation_id,action,item_id,delta) values(v_uid,p_operation_id,'buy','arcade:memory',-10);
  return app_private.memory_response(r.id);
 end if;
 select * into r from public.memory_game_runs where id=p_run_id and user_id=v_uid for update;
 if not found then raise exception 'MEMORY_RUN_NOT_FOUND'; end if;
 if r.finished_at is not null or r.abandoned_at is not null then return app_private.memory_response(r.id); end if;
 select * into strict b from app_private.memory_game_boards where run_id=r.id;
 if p_action='leave' then
  update public.memory_game_runs set abandoned_at=clock_timestamp() where id=r.id;
  return app_private.memory_response(r.id);
 end if;
 if p_action='clear' then
  if b.clear_at is null or clock_timestamp()<b.clear_at then return app_private.memory_response(r.id); end if;
  update app_private.memory_game_boards set first_card=null,second_card=null,clear_at=null where run_id=r.id;
  return app_private.memory_response(r.id);
 end if;
 if p_card is null or p_card not between 1 and 25 then raise exception 'INVALID_MEMORY_CARD'; end if;
 if p_card=13 or p_card=any(b.matched) or p_card=b.first_card or b.second_card is not null then return app_private.memory_response(r.id); end if;
 if r.timer_started_at is null then
  update public.memory_game_runs set timer_started_at=clock_timestamp() where id=r.id returning * into r;
 end if;
 if b.first_card is null then update app_private.memory_game_boards set first_card=p_card where run_id=r.id;
 else
  update public.memory_game_runs set moves=moves+1 where id=r.id;
  if b.deck[b.first_card]=b.deck[p_card] then
   b.matched:=b.matched||array[b.first_card,p_card];
   update app_private.memory_game_boards set matched=b.matched,first_card=null,second_card=null,clear_at=null where run_id=r.id;
   if cardinality(b.matched)=24 then
    update public.memory_game_runs set finished_at=clock_timestamp(),elapsed_ms=floor(extract(epoch from(clock_timestamp()-r.timer_started_at))*1000)::bigint where id=r.id;
   end if;
  else update app_private.memory_game_boards set second_card=p_card,clear_at=clock_timestamp()+interval '900 milliseconds' where run_id=r.id;
  end if;
 end if;
 return app_private.memory_response(r.id);
end $$;

create function app_private.memory_leaderboard(p_offset integer default 0) returns jsonb
language plpgsql security definer set search_path='' as $$
declare v_start timestamptz:=date_trunc('week',clock_timestamp() at time zone 'Asia/Seoul') at time zone 'Asia/Seoul';v_rows jsonb;v_total bigint;
begin
 if auth.uid() is null then raise exception 'AUTH_REQUIRED'; end if;
 if p_offset is null or p_offset<0 then raise exception 'INVALID_OFFSET'; end if;
 select count(distinct user_id) into v_total from public.memory_game_runs where finished_at>=v_start and abandoned_at is null;
 select coalesce(jsonb_agg(to_jsonb(t) order by t.rank),'[]'::jsonb) into v_rows from (
 select row_number() over(order by r.elapsed_ms,r.finished_at,r.id)+p_offset as rank,r.id,r.elapsed_ms as "elapsedMs",r.moves,
 coalesce(p.nickname,'섬 여행자') as nickname,r.user_id=auth.uid() as mine
 from (select * from (select distinct on(user_id) * from public.memory_game_runs where finished_at>=v_start and abandoned_at is null order by user_id,elapsed_ms,finished_at,id) best order by elapsed_ms,finished_at,id limit 20 offset p_offset) r
 left join public.player_profiles p on p.id=r.user_id) t;
 return jsonb_build_object('rows',v_rows,'total',v_total,'offset',p_offset,'pageSize',20,'weekStart',v_start,'weekEnd',v_start+interval '7 days');
end $$;
create function public.memory_game(p_action text,p_operation_id uuid default null,p_run_id uuid default null,p_card integer default null) returns jsonb language sql security invoker set search_path='' as $$select app_private.memory_game(p_action,p_operation_id,p_run_id,p_card)$$;
create function public.memory_leaderboard(p_offset integer default 0) returns jsonb language sql security invoker set search_path='' as $$select app_private.memory_leaderboard(p_offset)$$;
revoke all on function app_private.memory_response(uuid),app_private.memory_game(text,uuid,uuid,integer),app_private.memory_leaderboard(integer),public.memory_game(text,uuid,uuid,integer),public.memory_leaderboard(integer) from public,anon,authenticated;
grant execute on function app_private.memory_game(text,uuid,uuid,integer),app_private.memory_leaderboard(integer),public.memory_game(text,uuid,uuid,integer),public.memory_leaderboard(integer) to authenticated;
notify pgrst,'reload schema';
commit;
