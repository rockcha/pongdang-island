begin;

-- The top-view farm is separate from the older island farm. Existing saves and
-- wallet inventory are preserved. Only the authenticated Edge Function settles it.
create table app_private.topview_farms (
 user_id uuid primary key references auth.users(id) on delete cascade,
 document jsonb not null check (jsonb_typeof(document)='object'),
 revision bigint not null default 0 check (revision>=0),
 undo_document jsonb,
 updated_at timestamptz not null default now()
);
create table app_private.topview_farm_operations (
 user_id uuid not null references auth.users(id) on delete cascade,
 operation_id uuid not null,
 command jsonb not null,
 delta integer not null,
 revision bigint not null,
 created_at timestamptz not null default now(),
 primary key(user_id,operation_id)
);
alter table app_private.topview_farms enable row level security;
alter table app_private.topview_farm_operations enable row level security;
revoke all on app_private.topview_farms,app_private.topview_farm_operations from public,anon,authenticated;

create function app_private.topview_farm_snapshot(p_user_id uuid,p_initial jsonb,p_operation_id uuid default null,p_command jsonb default null)
returns jsonb language plpgsql security definer set search_path='' as $$
declare o app_private.topview_farm_operations;v_result jsonb;
begin
 if p_user_id is null then raise exception 'AUTH_REQUIRED';end if;
 if jsonb_typeof(p_initial) is distinct from 'object' then raise exception 'INVALID_INITIAL_FARM';end if;
 insert into public.player_wallets(user_id) values(p_user_id) on conflict do nothing;
 -- A single statement samples the wallet and farm from the same MVCC snapshot.
 insert into app_private.topview_farms(user_id,document) values(p_user_id,p_initial-'gold') on conflict do nothing;
 select jsonb_build_object('state',farm.document||jsonb_build_object('gold',wallet.gold),'revision',farm.revision,'undo',farm.undo_document,
  'serverNow',clock_timestamp(),'wallet',jsonb_build_object('gold',wallet.gold,'inventory',wallet.inventory,'testClaimed',wallet.test_claimed,'testEnabled',(select test_charge_enabled from app_private.gold_settings where id)))
 into v_result from app_private.topview_farms farm join public.player_wallets wallet using(user_id) where farm.user_id=p_user_id;
 if p_operation_id is not null then
  select * into o from app_private.topview_farm_operations where user_id=p_user_id and operation_id=p_operation_id;
  if found and o.command is distinct from p_command then raise exception 'OPERATION_CONFLICT';end if;
 end if;
 return v_result||jsonb_build_object('receipt',case when o.operation_id is null then null else jsonb_build_object('operationId',o.operation_id,'applied',false,'delta',o.delta) end);
end $$;

create function app_private.topview_farm_commit(p_user_id uuid,p_operation_id uuid,p_command jsonb,p_expected_revision bigint,p_expected_gold integer,p_state jsonb,p_delta integer)
returns jsonb language plpgsql security definer set search_path='' as $$
declare f app_private.topview_farms;w public.player_wallets;o app_private.topview_farm_operations;v_undo jsonb;v_result jsonb;v_layout boolean;
begin
 if p_user_id is null or p_operation_id is null or p_command is null then raise exception 'INVALID_FARM_COMMAND';end if;
 -- All financial operations lock the shared wallet before domain rows.
 select * into w from public.player_wallets where user_id=p_user_id for update;
 if not found then raise exception 'WALLET_NOT_FOUND';end if;
 select * into f from app_private.topview_farms where user_id=p_user_id for update;
 if not found then raise exception 'FARM_NOT_FOUND';end if;
 select * into o from app_private.topview_farm_operations where user_id=p_user_id and operation_id=p_operation_id;
 if found then
  if o.command is distinct from p_command then raise exception 'OPERATION_CONFLICT';end if;
  return app_private.topview_farm_snapshot(p_user_id,f.document,p_operation_id,p_command);
 end if;
 if p_expected_revision is distinct from f.revision or p_expected_gold is distinct from w.gold then raise exception 'FARM_STATE_CONFLICT';end if;
 if p_delta is null or w.gold::bigint+p_delta not between 0 and 1000000000 then raise exception 'INSUFFICIENT_GOLD';end if;
 if jsonb_typeof(p_state) is distinct from 'object' or (p_state->>'gold')::bigint is distinct from w.gold::bigint+p_delta
  or octet_length(p_state::text)>1000000 or jsonb_typeof(p_state->'objects') is distinct from 'array' then raise exception 'INVALID_FARM_STATE';end if;
 v_layout:=(p_command->>'type') in ('place','move','recover','transform','land','tile','clear');
 if p_command->>'type'='undo' then
  if f.undo_document is null or p_delta<>0 or (p_state-'gold'-'nextId') is distinct from (f.undo_document-'gold'-'nextId') then raise exception 'INVALID_FARM_UNDO';end if;
 elsif v_layout and p_delta=0 then v_undo:=f.document;
 end if;
 if p_delta<>0 then
  update public.player_wallets set gold=gold+p_delta,updated_at=clock_timestamp() where user_id=p_user_id;
  insert into public.gold_transactions(user_id,operation_id,action,item_id,delta)
   values(p_user_id,p_operation_id,case when p_delta<0 then 'buy' else 'sell' end,'farm:'||(p_command->>'type'),p_delta);
 end if;
 update app_private.topview_farms set document=p_state-'gold',revision=revision+1,undo_document=v_undo,updated_at=clock_timestamp() where user_id=p_user_id;
 insert into app_private.topview_farm_operations(user_id,operation_id,command,delta,revision) values(p_user_id,p_operation_id,p_command,p_delta,f.revision+1);
 v_result:=app_private.topview_farm_snapshot(p_user_id,p_state,p_operation_id,p_command);
 return jsonb_set(v_result,'{receipt,applied}','true');
end $$;

create function public.topview_farm_snapshot(p_user_id uuid,p_initial jsonb,p_operation_id uuid default null,p_command jsonb default null)
returns jsonb language sql set search_path='' as $$select app_private.topview_farm_snapshot(p_user_id,p_initial,p_operation_id,p_command)$$;
create function public.topview_farm_commit(p_user_id uuid,p_operation_id uuid,p_command jsonb,p_expected_revision bigint,p_expected_gold integer,p_state jsonb,p_delta integer)
returns jsonb language sql set search_path='' as $$select app_private.topview_farm_commit(p_user_id,p_operation_id,p_command,p_expected_revision,p_expected_gold,p_state,p_delta)$$;
revoke all on function app_private.topview_farm_snapshot(uuid,jsonb,uuid,jsonb),app_private.topview_farm_commit(uuid,uuid,jsonb,bigint,integer,jsonb,integer),public.topview_farm_snapshot(uuid,jsonb,uuid,jsonb),public.topview_farm_commit(uuid,uuid,jsonb,bigint,integer,jsonb,integer) from public,anon,authenticated;
grant execute on function app_private.topview_farm_snapshot(uuid,jsonb,uuid,jsonb),app_private.topview_farm_commit(uuid,uuid,jsonb,bigint,integer,jsonb,integer),public.topview_farm_snapshot(uuid,jsonb,uuid,jsonb),public.topview_farm_commit(uuid,uuid,jsonb,bigint,integer,jsonb,integer) to service_role;
commit;
