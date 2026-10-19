begin;

-- Preserve existing supported gift forms and add only the two 300-gold rewards.
alter table public.collectible_gifts drop constraint gift_asset_shape;
alter table public.collectible_gifts add constraint gift_asset_shape check (
 (reward_kind='collectible' and quantity between 1 and 20 and cardinality(collectible_ids)=quantity)
 or (source='exchange' and reward_kind='gold' and quantity between 1 and 1000000000 and cardinality(collectible_ids)=0)
 or (source='exchange' and reward_kind='bait' and quantity between 1 and 9999 and cardinality(collectible_ids)=0 and reward_id is not null)
 or (source='system' and reward_kind='gold' and reward_id in ('welcome','operator-gold-20261020','operator-gold-20261020-round2')
  and quantity=500 and cardinality(collectible_ids)=0 and sender_id is null and not exchange_hold)
 or (source='exchange' and reward_kind='fuel' and reward_id='fuel' and quantity between 1 and 9999 and cardinality(collectible_ids)=0)
 or (source='system' and reward_kind='bait' and reward_id='bait' and species->>'id' in ('welcome-bait','operator-worm-20261020')
  and quantity=5 and cardinality(collectible_ids)=0 and sender_id is null and not exchange_hold)
 or (source='system' and reward_kind='gold' and reward_id like 'arcade-weekly:%' and quantity in (2000,1500,1000,650,400,200)
  and species->>'game' in ('shadow','memory') and reward_id='arcade-weekly:'||(species->>'game')||':'||(species->>'week_start')
  and cardinality(collectible_ids)=0 and sender_id is null and not exchange_hold)
 or (source='system' and reward_kind='gold'
  and reward_id in ('giseong-catch-202610:giseong-fish','giseong-catch-202610:giseong-webfoot-octopus')
  and species->>'id'=reward_id and quantity=300 and cardinality(collectible_ids)=0 and sender_id is null and not exchange_hold)
);

-- Claimed gifts remain the deduplication record: one reward per species/account.
create unique index giseong_october_reward_once
 on public.collectible_gifts(recipient_id,reward_id)
 where source='system' and reward_id in (
  'giseong-catch-202610:giseong-fish',
  'giseong-catch-202610:giseong-webfoot-octopus'
 );

create function app_private.grant_giseong_catch_reward(
 p_user_id uuid,p_operation_id uuid,p_now timestamptz default clock_timestamp()
) returns uuid
language plpgsql security definer set search_path=''
as $$
declare
 v_event public.notices;
 v_species_id text;
 v_species_name text;
 v_recipient_name text;
 v_gift uuid;
begin
 -- Only an active published event can issue rewards; the hard deadline cannot
 -- be extended accidentally by editing the announcement.
 select * into v_event from public.notices
 where id='a87b4c3e-cdbc-494e-b1d2-ca3810ba749d'
  and category='event' and status='published';
 if not found or p_now is null or v_event.starts_at is null
  or v_event.ends_at is null or p_now<v_event.starts_at
  or p_now>=least(v_event.ends_at,timestamptz '2026-11-01 00:00:00+09')
 then return null;end if;

 -- Read the persisted successful manual catch, never a client-supplied species.
 select s.id,s.name,p.nickname into v_species_id,v_species_name,v_recipient_name
 from public.fishing_attempts a
 join public.player_collectibles c on c.id=a.collectible_id and c.user_id=a.user_id
 join public.collectible_species s on s.id=c.species_id
 join public.player_profiles p on p.id=a.user_id
 where a.user_id=p_user_id and a.operation_id=p_operation_id
  and a.rarity is not null
  and a.created_at>=v_event.starts_at
  and a.created_at<least(v_event.ends_at,timestamptz '2026-11-01 00:00:00+09')
  and s.id in ('giseong-fish','giseong-webfoot-octopus');
 if not found then return null;end if;

 insert into public.collectible_gifts(
  sender_name,recipient_id,recipient_name,operation_id,collectible_ids,
  species,quantity,message,source,reward_kind,reward_id
 ) values (
  '퐁당섬 운영자',p_user_id,v_recipient_name,gen_random_uuid(),'{}'::uuid[],
  jsonb_build_object('id','giseong-catch-202610:'||v_species_id,'name',v_species_name||' 포획 보상'),
  300,v_species_name||' 낚시 성공! 이벤트 보상 300골드예요. 종류별 보상은 계정당 한 번씩 받을 수 있어요.',
  'system','gold','giseong-catch-202610:'||v_species_id
 ) on conflict do nothing returning id into v_gift;

 if v_gift is not null then
  insert into public.notifications(recipient_id,category,kind,title,body,gift_id)
  values(p_user_id,'gift','gift_received','기성 포획 이벤트 보상 도착!',
   v_species_name||'를 잡았어요! 선물함에서 300골드를 받아주세요.',v_gift);
 end if;
 return v_gift;
end;
$$;
revoke all on function app_private.grant_giseong_catch_reward(uuid,uuid,timestamptz)
 from public,anon,authenticated;

create function app_private.giseong_catch_event()
returns trigger language plpgsql security definer set search_path=''
as $$
begin
 if new.collectible_id is not null and new.rarity is not null then
  perform app_private.grant_giseong_catch_reward(new.user_id,new.operation_id,clock_timestamp());
 end if;
 return new;
end;
$$;
revoke all on function app_private.giseong_catch_event() from public,anon,authenticated;

create trigger giseong_manual_catch_reward after insert on public.fishing_attempts
 for each row execute function app_private.giseong_catch_event();

commit;
