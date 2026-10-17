begin;
-- Independent cleaning progress preserves all previously recorded feeding sessions.
create table public.aquarium_cleanings(
 id uuid primary key default gen_random_uuid(),
 visitor_id uuid not null references public.player_profiles(id) on delete cascade,
 owner_id uuid not null references public.player_profiles(id) on delete cascade,
 tank_id uuid references public.aquarium_tanks(id) on delete set null,
 operation_id uuid not null,strokes integer not null check(strokes between 1 and 3),
 created_at timestamptz not null default transaction_timestamp(),completed_at timestamptz,
 unique(visitor_id,operation_id),check(visitor_id<>owner_id),check((strokes=3)=(completed_at is not null))
);
create index aquarium_cleanings_owner on public.aquarium_cleanings(owner_id,completed_at desc) where completed_at is not null;
alter table public.aquarium_cleanings enable row level security;
revoke all on public.aquarium_cleanings from public,anon,authenticated;
grant select on public.aquarium_cleanings to authenticated;
create policy aquarium_cleanings_participants on public.aquarium_cleanings for select to authenticated
 using(visitor_id=(select auth.uid()) or owner_id=(select auth.uid()));
create table app_private.aquarium_clean_notices(
 visitor_id uuid not null references public.player_profiles(id) on delete cascade,
 owner_id uuid not null references public.player_profiles(id) on delete cascade,
 notice_day date not null,primary key(visitor_id,owner_id,notice_day)
);
alter table app_private.aquarium_clean_notices enable row level security;
revoke all on app_private.aquarium_clean_notices from public,anon,authenticated;

create function app_private.clean_friend_aquarium(p_tank uuid,p_operation uuid,p_step integer) returns jsonb
language plpgsql security definer set search_path='' as $$
declare v_uid uuid:=auth.uid();v_owner uuid;v_tank_name text;f public.aquarium_cleanings;v_replayed boolean:=false;
begin
 if v_uid is null then raise exception 'AUTH_REQUIRED';end if;
 if p_tank is null or p_operation is null or p_step is null or p_step not between 1 and 3 then raise exception 'INVALID_CLEANING';end if;
 select user_id,name into v_owner,v_tank_name from public.aquarium_tanks where id=p_tank for share;
 if not found then raise exception 'TANK_NOT_FOUND';end if;
 perform app_private.require_aquarium_friend(v_owner);
 if p_step=1 then
  insert into public.aquarium_cleanings(visitor_id,owner_id,tank_id,operation_id,strokes)
  values(v_uid,v_owner,p_tank,p_operation,1) on conflict(visitor_id,operation_id) do nothing;
  v_replayed:=not found;
 end if;
 select * into f from public.aquarium_cleanings where visitor_id=v_uid and operation_id=p_operation for update;
 if not found then raise exception 'CLEANING_STEP_REQUIRED';end if;
 if f.tank_id is distinct from p_tank or f.owner_id<>v_owner then raise exception 'OPERATION_CONFLICT';end if;
 if p_step>f.strokes+1 then raise exception 'CLEANING_STEP_REQUIRED';end if;
 if p_step<=f.strokes then
  if p_step<>1 then v_replayed:=true;end if;
 else
  update public.aquarium_cleanings set strokes=p_step,completed_at=case when p_step=3 then transaction_timestamp() end
  where id=f.id returning * into f;
  if p_step=3 then
   insert into app_private.aquarium_clean_notices(visitor_id,owner_id,notice_day)
   values(v_uid,v_owner,(transaction_timestamp() at time zone 'Asia/Seoul')::date) on conflict do nothing;
   if found then
    insert into public.notifications(recipient_id,actor_id,category,kind,title,body)
    values(v_owner,v_uid,'general','system','친구가 어항을 닦아줬어요',
    (select nickname from public.player_profiles where id=v_uid)||'님이 '||v_tank_name||'을 반짝이게 닦아줬어요.');
   end if;
  end if;
 end if;
 return jsonb_build_object('id',f.id,'strokes',f.strokes,'completed',f.completed_at is not null,'replayed',v_replayed);
end $$;
create function public.clean_friend_aquarium(p_tank uuid,p_operation uuid,p_step integer) returns jsonb language sql security invoker set search_path='' as $$select app_private.clean_friend_aquarium(p_tank,p_operation,p_step)$$;
revoke all on function app_private.clean_friend_aquarium(uuid,uuid,integer),public.clean_friend_aquarium(uuid,uuid,integer) from public,anon;
grant execute on function app_private.clean_friend_aquarium(uuid,uuid,integer),public.clean_friend_aquarium(uuid,uuid,integer) to authenticated;
notify pgrst,'reload schema';
commit;
