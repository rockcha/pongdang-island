begin;
create table public.aquarium_feedings(
 id uuid primary key default gen_random_uuid(),
 visitor_id uuid not null references public.player_profiles(id) on delete cascade,
 owner_id uuid not null references public.player_profiles(id) on delete cascade,
 tank_id uuid references public.aquarium_tanks(id) on delete set null,
 operation_id uuid not null,clicks integer not null check(clicks between 1 and 3),
 created_at timestamptz not null default transaction_timestamp(),completed_at timestamptz,
 unique(visitor_id,operation_id),check(visitor_id<>owner_id),check((clicks=3)=(completed_at is not null))
);
create index aquarium_feedings_owner on public.aquarium_feedings(owner_id,completed_at desc) where completed_at is not null;
alter table public.aquarium_feedings enable row level security;
revoke all on public.aquarium_feedings from public,anon,authenticated;
grant select on public.aquarium_feedings to authenticated;
create policy aquarium_feedings_participants on public.aquarium_feedings for select to authenticated
 using(visitor_id=(select auth.uid()) or owner_id=(select auth.uid()));
create table app_private.aquarium_feed_notices(
 visitor_id uuid not null references public.player_profiles(id) on delete cascade,
 owner_id uuid not null references public.player_profiles(id) on delete cascade,
 notice_day date not null,primary key(visitor_id,owner_id,notice_day)
);
alter table app_private.aquarium_feed_notices enable row level security;
revoke all on app_private.aquarium_feed_notices from public,anon,authenticated;

create function app_private.require_aquarium_friend(p_owner uuid) returns void
language plpgsql security invoker set search_path='' as $$
begin
 if auth.uid() is null then raise exception 'AUTH_REQUIRED';end if;
 if p_owner is null or p_owner=auth.uid() then raise exception 'FRIENDSHIP_REQUIRED';end if;
 perform 1 from public.friend_requests where status='accepted' and
 ((sender_id=auth.uid() and recipient_id=p_owner) or (recipient_id=auth.uid() and sender_id=p_owner)) for share;
 if not found then raise exception 'FRIENDSHIP_REQUIRED';end if;
end $$;
revoke all on function app_private.require_aquarium_friend(uuid) from public,anon,authenticated;

create function app_private.friend_aquarium(p_owner uuid) returns jsonb
language plpgsql security definer set search_path='' as $$
begin
 perform app_private.require_aquarium_friend(p_owner);
 return jsonb_build_object(
 'owner',(select jsonb_build_object('id',id,'nickname',nickname,'avatar_path',avatar_path) from public.player_profiles where id=p_owner),
 'tanks',coalesce((select jsonb_agg(jsonb_build_object('id',id,'name',name,'background_id',background_id,'is_default',is_default,'created_at',created_at) order by created_at,id) from public.aquarium_tanks where user_id=p_owner),'[]'::jsonb),
 'inhabitants',coalesce((select jsonb_agg(to_jsonb(c)||jsonb_build_object('species',app_private.species_payload(c.species_id,c.map_region_id)) order by c.acquired_at,c.id)
 from public.player_collectibles c join public.collectible_species s on s.id=c.species_id
 join public.aquarium_tanks t on t.id=c.tank_id and t.user_id=p_owner
 where c.user_id=p_owner and c.sold_at is null and c.escrow_gift_id is null and s.kind in('fish','trash','decoration')),'[]'::jsonb),
 'backgrounds',(select coalesce(jsonb_agg(jsonb_build_object('id',id,'name',name,'image_path',image_path)),'[]'::jsonb) from public.aquarium_backgrounds));
end $$;

create function app_private.feed_friend_aquarium(p_tank uuid,p_operation uuid,p_step integer) returns jsonb
language plpgsql security definer set search_path='' as $$
declare v_uid uuid:=auth.uid();v_owner uuid;v_tank_name text;f public.aquarium_feedings;v_replayed boolean:=false;
begin
 if v_uid is null then raise exception 'AUTH_REQUIRED';end if;
 if p_tank is null or p_operation is null or p_step is null or p_step not between 1 and 3 then raise exception 'INVALID_FEEDING';end if;
 select user_id,name into v_owner,v_tank_name from public.aquarium_tanks where id=p_tank for share;
 if not found then raise exception 'TANK_NOT_FOUND';end if;
 perform app_private.require_aquarium_friend(v_owner);
 if p_step=1 then
  insert into public.aquarium_feedings(visitor_id,owner_id,tank_id,operation_id,clicks)
  values(v_uid,v_owner,p_tank,p_operation,1) on conflict(visitor_id,operation_id) do nothing;
  v_replayed:=not found;
 end if;
 select * into f from public.aquarium_feedings where visitor_id=v_uid and operation_id=p_operation for update;
 if not found then raise exception 'FEEDING_STEP_REQUIRED';end if;
 if f.tank_id is distinct from p_tank or f.owner_id<>v_owner then raise exception 'OPERATION_CONFLICT';end if;
 if p_step>f.clicks+1 then raise exception 'FEEDING_STEP_REQUIRED';end if;
 if p_step<=f.clicks then
  if p_step<>1 then v_replayed:=true;end if;
 else
  update public.aquarium_feedings set clicks=p_step,completed_at=case when p_step=3 then transaction_timestamp() end
  where id=f.id returning * into f;
  if p_step=3 then
   insert into app_private.aquarium_feed_notices(visitor_id,owner_id,notice_day)
   values(v_uid,v_owner,(transaction_timestamp() at time zone 'Asia/Seoul')::date) on conflict do nothing;
   if found then
    insert into public.notifications(recipient_id,actor_id,category,kind,title,body)
    values(v_owner,v_uid,'general','system','친구가 먹이를 줬어요',
    (select nickname from public.player_profiles where id=v_uid)||'님이 '||v_tank_name||'에 먹이를 줬어요.');
   end if;
  end if;
 end if;
 return jsonb_build_object('id',f.id,'clicks',f.clicks,'completed',f.completed_at is not null,'replayed',v_replayed);
end $$;
create function public.friend_aquarium(p_owner uuid) returns jsonb language sql security invoker set search_path='' as $$select app_private.friend_aquarium(p_owner)$$;
create function public.feed_friend_aquarium(p_tank uuid,p_operation uuid,p_step integer) returns jsonb language sql security invoker set search_path='' as $$select app_private.feed_friend_aquarium(p_tank,p_operation,p_step)$$;
revoke all on function app_private.friend_aquarium(uuid),public.friend_aquarium(uuid),app_private.feed_friend_aquarium(uuid,uuid,integer),public.feed_friend_aquarium(uuid,uuid,integer) from public,anon;
grant execute on function app_private.friend_aquarium(uuid),public.friend_aquarium(uuid),app_private.feed_friend_aquarium(uuid,uuid,integer),public.feed_friend_aquarium(uuid,uuid,integer) to authenticated;
notify pgrst,'reload schema';
commit;
