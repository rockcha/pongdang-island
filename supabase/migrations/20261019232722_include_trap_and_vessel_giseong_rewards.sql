begin;

-- All server-verified capture paths share the existing per-species unique key.
create function app_private.grant_giseong_capture_reward(
 p_user_id uuid,p_species_id text,p_captured_at timestamptz,p_now timestamptz default clock_timestamp()
) returns uuid language plpgsql security definer set search_path=''
as $$
declare v_event public.notices;v_species_name text;v_recipient_name text;v_gift uuid;
begin
 if p_species_id is null or p_species_id not in ('giseong-fish','giseong-webfoot-octopus') then return null;end if;
 select * into v_event from public.notices
 where id='a87b4c3e-cdbc-494e-b1d2-ca3810ba749d' and category='event' and status='published';
 if not found or p_now is null or p_captured_at is null
  or v_event.starts_at is null or v_event.ends_at is null
  or p_now<v_event.starts_at or p_captured_at<v_event.starts_at
  or p_now>=least(v_event.ends_at,timestamptz '2026-11-01 00:00:00+09')
  or p_captured_at>=least(v_event.ends_at,timestamptz '2026-11-01 00:00:00+09')
  or p_captured_at>p_now then return null;end if;
 select s.name,p.nickname into v_species_name,v_recipient_name
 from public.collectible_species s cross join public.player_profiles p
 where s.id=p_species_id and p.id=p_user_id;
 if not found then return null;end if;
 insert into public.collectible_gifts(sender_name,recipient_id,recipient_name,operation_id,collectible_ids,
  species,quantity,message,source,reward_kind,reward_id)
 values('퐁당섬 운영자',p_user_id,v_recipient_name,gen_random_uuid(),'{}'::uuid[],
  jsonb_build_object('id','giseong-catch-202610:'||p_species_id,'name',v_species_name||' 포획 보상'),300,
  v_species_name||' 포획 성공! 이벤트 보상 300골드예요. 낚시·통발·어선 포획을 인정하며, 종류별 보상은 계정당 한 번씩 받을 수 있어요.',
  'system','gold','giseong-catch-202610:'||p_species_id)
 on conflict do nothing returning id into v_gift;
 if v_gift is not null then
  insert into public.notifications(recipient_id,category,kind,title,body,gift_id)
  values(p_user_id,'gift','gift_received','기성 포획 이벤트 보상 도착!',
   v_species_name||'를 잡았어요! 선물함에서 300골드를 받아주세요.',v_gift);
 end if;
 return v_gift;
end;
$$;
revoke all on function app_private.grant_giseong_capture_reward(uuid,text,timestamptz,timestamptz) from public,anon,authenticated;

create or replace function app_private.grant_giseong_catch_reward(
 p_user_id uuid,p_operation_id uuid,p_now timestamptz default clock_timestamp()
) returns uuid language plpgsql security definer set search_path=''
as $$
declare v_species_id text;v_captured_at timestamptz;
begin
 select c.species_id,a.created_at into v_species_id,v_captured_at
 from public.fishing_attempts a
 join public.player_collectibles c on c.id=a.collectible_id and c.user_id=a.user_id
 where a.user_id=p_user_id and a.operation_id=p_operation_id and a.rarity is not null;
 if not found then return null;end if;
 return app_private.grant_giseong_capture_reward(p_user_id,v_species_id,v_captured_at,p_now);
end;
$$;
revoke all on function app_private.grant_giseong_catch_reward(uuid,uuid,timestamptz) from public,anon,authenticated;

-- Claim results are written only by server settlement functions. An update to
 -- collectible ownership (gift/exchange) never fires these claim triggers.
create function app_private.giseong_settled_capture_event()
returns trigger language plpgsql security definer set search_path=''
as $$
declare v_item jsonb;v_species_id text;
begin
 if old.claimed_at is not null or new.claimed_at is null
  or jsonb_typeof(new.result->'items') is distinct from 'array' then return new;end if;
 for v_item in select value from jsonb_array_elements(new.result->'items') loop
  select c.species_id into v_species_id from public.player_collectibles c
  where c.user_id=new.user_id and c.id=case
   when v_item->>'id' ~* '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$'
   then (v_item->>'id')::uuid else null end;
  if found then
   perform app_private.grant_giseong_capture_reward(new.user_id,v_species_id,new.claimed_at,clock_timestamp());
  end if;
 end loop;
 return new;
end;
$$;
revoke all on function app_private.giseong_settled_capture_event() from public,anon,authenticated;

create trigger giseong_trap_capture_reward after update of claimed_at,result on public.fishing_expeditions
 for each row when (old.claimed_at is null and new.claimed_at is not null)
 execute function app_private.giseong_settled_capture_event();
create trigger giseong_vessel_capture_reward after update of claimed_at,result on public.harbor_voyages
 for each row when (old.claimed_at is null and new.claimed_at is not null)
 execute function app_private.giseong_settled_capture_event();

-- Honor already-settled catches since event launch, without duplicating rewards.
do $$
declare v_capture record;
begin
 for v_capture in
  select t.user_id,c.species_id,t.claimed_at from (
   select user_id,claimed_at,result from public.fishing_expeditions where claimed_at is not null
   union all
   select user_id,claimed_at,result from public.harbor_voyages where claimed_at is not null
  ) t
  join public.notices n on n.id='a87b4c3e-cdbc-494e-b1d2-ca3810ba749d'
   and t.claimed_at>=n.starts_at and t.claimed_at<least(n.ends_at,timestamptz '2026-11-01 00:00:00+09')
  cross join lateral jsonb_array_elements(case when jsonb_typeof(t.result->'items')='array' then t.result->'items' else '[]'::jsonb end) i
  join public.player_collectibles c on c.user_id=t.user_id and c.id=case
   when i->>'id' ~* '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$'
   then (i->>'id')::uuid else null end
  where c.species_id in ('giseong-fish','giseong-webfoot-octopus')
 loop
  perform app_private.grant_giseong_capture_reward(v_capture.user_id,v_capture.species_id,v_capture.claimed_at,clock_timestamp());
 end loop;
end;
$$;
commit;
