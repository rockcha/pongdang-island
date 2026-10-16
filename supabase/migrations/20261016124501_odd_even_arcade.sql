begin;
create table public.odd_even_runs(
 id uuid primary key default gen_random_uuid(),
 user_id uuid not null references auth.users(id) on delete cascade,
 operation_id uuid not null, payout_operation_id uuid not null default gen_random_uuid(),
 stake integer not null default 10 check(stake between 0 and 10485760),
 wins integer not null default 0 check(wins between 0 and 20),
 round integer not null default 1 check(round between 1 and 20),
 stage text not null default 'choose' check(stage in ('choose','decision','lost','banked')),
 pearls integer check(pearls between 1 and 10), choice text check(choice in ('odd','even')),
 started_at timestamptz not null default clock_timestamp(), finished_at timestamptz,
 unique(user_id,operation_id),
 check((finished_at is not null)=(stage in ('lost','banked')))
);
create unique index odd_even_one_active on public.odd_even_runs(user_id) where finished_at is null;
create index odd_even_best on public.odd_even_runs(stake desc,finished_at,id) where stage='banked';
alter table public.odd_even_runs enable row level security;
revoke all on public.odd_even_runs from public,anon,authenticated;

create function app_private.odd_even_response(p_id uuid) returns jsonb
language sql set search_path='' as $$
 select jsonb_build_object('run',(select jsonb_build_object('id',r.id,'stake',r.stake,'wins',r.wins,'round',r.round,'stage',r.stage,'pearls',r.pearls,'choice',r.choice) from public.odd_even_runs r where r.id=p_id),'maxWins',20)
$$;

create function app_private.odd_even_game(p_action text,p_operation_id uuid default null,p_run_id uuid default null,p_round integer default null,p_choice text default null) returns jsonb
language plpgsql security definer set search_path='' as $$
declare v_uid uuid:=auth.uid();r public.odd_even_runs;v_gold integer;v_pearls integer;v_win boolean;
begin
 if v_uid is null then raise exception 'AUTH_REQUIRED';end if;
 if p_action is null or p_action not in ('state','start','answer','double','cashout') then raise exception 'INVALID_ODD_EVEN_ACTION';end if;
 if p_action='state' then
  select * into r from public.odd_even_runs where user_id=v_uid and finished_at is null;
  return app_private.odd_even_response(r.id);
 end if;
 perform app_private.get_gold_wallet();
 select gold into v_gold from public.player_wallets where user_id=v_uid for update;
 if p_action='start' then
  if p_operation_id is null then raise exception 'INVALID_OPERATION';end if;
  select * into r from public.odd_even_runs where user_id=v_uid and operation_id=p_operation_id;
  if found then return app_private.odd_even_response(r.id);end if;
  select * into r from public.odd_even_runs where user_id=v_uid and finished_at is null;
  if found then return app_private.odd_even_response(r.id);end if;
  if v_gold<10 then raise exception 'INSUFFICIENT_GOLD';end if;
  insert into public.odd_even_runs(user_id,operation_id) values(v_uid,p_operation_id) returning * into r;
  update public.player_wallets set gold=gold-10,updated_at=clock_timestamp() where user_id=v_uid;
  insert into public.gold_transactions(user_id,operation_id,action,item_id,delta) values(v_uid,p_operation_id,'buy','arcade:odd-even',-10);
  return app_private.odd_even_response(r.id);
 end if;
 select * into r from public.odd_even_runs where id=p_run_id and user_id=v_uid for update;
 if not found then raise exception 'ODD_EVEN_RUN_NOT_FOUND';end if;
 if r.finished_at is not null then return app_private.odd_even_response(r.id);end if;
 if p_round is null then raise exception 'INVALID_ROUND';end if;
 if p_round<r.round then return app_private.odd_even_response(r.id);end if;
 if p_round<>r.round then raise exception 'INVALID_ROUND';end if;
 if p_action='answer' then
  if r.stage<>'choose' then return app_private.odd_even_response(r.id);end if;
  if p_choice is null or p_choice not in ('odd','even') then raise exception 'INVALID_CHOICE';end if;
  v_pearls:=1+floor(random()*10)::integer;
  v_win:=(v_pearls%2=1)=(p_choice='odd');
  update public.odd_even_runs set pearls=v_pearls,choice=p_choice,stake=case when v_win then stake*2 else 0 end,
   wins=wins+case when v_win then 1 else 0 end,stage=case when v_win then 'decision' else 'lost' end,
   finished_at=case when v_win then null else clock_timestamp() end where id=r.id;
 elsif p_action='double' then
  if r.stage='choose' then return app_private.odd_even_response(r.id);end if;
  if r.wins>=20 then raise exception 'ODD_EVEN_LIMIT';end if;
  update public.odd_even_runs set stage='choose',round=round+1,pearls=null,choice=null where id=r.id;
 else
  if r.stage<>'decision' then raise exception 'ODD_EVEN_WIN_REQUIRED';end if;
  if v_gold>1000000000-r.stake then raise exception 'GOLD_LIMIT';end if;
  update public.player_wallets set gold=gold+r.stake,updated_at=clock_timestamp() where user_id=v_uid;
  insert into public.gold_transactions(user_id,operation_id,action,item_id,delta) values(v_uid,r.payout_operation_id,'charge','arcade:odd-even:'||r.id::text,r.stake);
  update public.odd_even_runs set stage='banked',finished_at=clock_timestamp() where id=r.id;
 end if;
 return app_private.odd_even_response(r.id);
end $$;

create function app_private.odd_even_leaderboard(p_offset integer default 0) returns jsonb
language plpgsql security definer set search_path='' as $$
declare v_rows jsonb;v_total bigint;
begin
 if auth.uid() is null then raise exception 'AUTH_REQUIRED';end if;
 if p_offset is null or p_offset<0 then raise exception 'INVALID_OFFSET';end if;
 select count(distinct user_id) into v_total from public.odd_even_runs where stage='banked';
 select coalesce(jsonb_agg(to_jsonb(t) order by t.rank),'[]'::jsonb) into v_rows from (
  select row_number() over(order by r.stake desc,r.finished_at,r.id)+p_offset as rank,r.id,r.stake as gold,r.wins,
   coalesce(p.nickname,'섬 여행자') as nickname,r.user_id=auth.uid() as mine
  from (select * from (select distinct on(user_id) * from public.odd_even_runs where stage='banked' order by user_id,stake desc,finished_at,id) best order by stake desc,finished_at,id limit 20 offset p_offset) r
  left join public.player_profiles p on p.id=r.user_id
 ) t;
 return jsonb_build_object('rows',v_rows,'total',v_total);
end $$;
create function public.odd_even_game(p_action text,p_operation_id uuid default null,p_run_id uuid default null,p_round integer default null,p_choice text default null) returns jsonb
language sql security invoker set search_path='' as $$select app_private.odd_even_game(p_action,p_operation_id,p_run_id,p_round,p_choice)$$;
create function public.odd_even_leaderboard(p_offset integer default 0) returns jsonb
language sql security invoker set search_path='' as $$select app_private.odd_even_leaderboard(p_offset)$$;
revoke all on function app_private.odd_even_response(uuid),app_private.odd_even_game(text,uuid,uuid,integer,text),public.odd_even_game(text,uuid,uuid,integer,text),app_private.odd_even_leaderboard(integer),public.odd_even_leaderboard(integer) from public,anon,authenticated;
grant execute on function app_private.odd_even_game(text,uuid,uuid,integer,text),public.odd_even_game(text,uuid,uuid,integer,text),app_private.odd_even_leaderboard(integer),public.odd_even_leaderboard(integer) to authenticated;
notify pgrst,'reload schema';
commit;
