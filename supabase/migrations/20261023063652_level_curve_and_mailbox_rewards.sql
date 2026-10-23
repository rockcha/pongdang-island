begin;
-- Complete any old settlements before converting the displayed curve. Raw earned XP and its ledger remain unchanged.
lock table app_private.experience_events,app_private.player_experience in access exclusive mode;
alter table app_private.player_experience add column curve_offset bigint not null default 0 check(curve_offset>=0),add column rewarded_through integer not null default 1 check(rewarded_through>=1);
create temporary table level_curve_before on commit drop as
 select user_id,total_xp,floor((-1+sqrt(9+4*total_xp::numeric/25))/2)::integer lv
 from app_private.player_experience;
update app_private.player_experience e set
 curve_offset=(20::numeric*(b.lv-1)*(2*b.lv+1)+floor((b.total_xp-25::numeric*(b.lv-1)*(b.lv+2))*(100+80::numeric*(b.lv-1))/(100+50::numeric*(b.lv-1))))::bigint-b.total_xp,
 rewarded_through=b.lv
from level_curve_before b where e.user_id=b.user_id;

create function app_private.experience_level(p_xp numeric) returns integer language sql immutable set search_path='' as $$
 select floor((1+sqrt(9+2*greatest(p_xp,0)/5))/4)::integer
$$;
revoke all on function app_private.experience_level(numeric) from public,anon,authenticated;

create or replace function app_private.player_level(p_user uuid) returns integer language sql stable security definer set search_path='' as $$
 select app_private.experience_level(coalesce((select total_xp::numeric+curve_offset from app_private.player_experience where user_id=p_user),0))
$$;
create or replace function app_private.player_level_progress(p_user uuid) returns numeric language sql stable security definer set search_path='' as $$
 with xp as(select coalesce((select total_xp::numeric+curve_offset from app_private.player_experience where user_id=p_user),0) value),
 current_level as(select value,app_private.experience_level(value) lv from xp)
 select round(greatest(0::numeric,least(1::numeric,(value-20::numeric*(lv-1)*(2*lv+1))/(100+80::numeric*(lv-1)))),4) from current_level
$$;
create or replace function app_private.experience_state() returns jsonb language plpgsql stable security definer set search_path='' as $$
declare uid uuid:=auth.uid();xp bigint:=0;legacy bigint:=0;adjustment bigint:=0;lv integer;base numeric;needed bigint;
begin
 if uid is null then raise exception 'AUTH_REQUIRED';end if;
 select e.total_xp,e.legacy_xp,e.curve_offset into xp,legacy,adjustment from app_private.player_experience e where e.user_id=uid;
 xp:=coalesce(xp,0);legacy:=coalesce(legacy,0);adjustment:=coalesce(adjustment,0);
 lv:=app_private.experience_level(xp::numeric+adjustment);
 base:=20::numeric*(lv-1)*(2*lv+1);needed:=100+80::bigint*(lv-1);
 -- totalXp is actual earned XP, so the conversion never appears as a fresh XP gain in clients.
 return jsonb_build_object('level',lv,'totalXp',xp,'currentXp',xp::numeric+adjustment-base,'nextLevelXp',needed,'legacyXp',legacy);
end $$;
CREATE OR REPLACE FUNCTION app_private.friend_levels()
 RETURNS jsonb
 LANGUAGE plpgsql
 STABLE SECURITY DEFINER
 SET search_path TO ''
AS $function$
declare uid uuid:=auth.uid();result jsonb;
begin
 if uid is null then raise exception 'AUTH_REQUIRED';end if;
 with friends as (
  select distinct case when sender_id=uid then recipient_id else sender_id end friend_id
  from public.friend_requests where status='accepted' and (sender_id=uid or recipient_id=uid)
 )
 select coalesce(jsonb_agg(jsonb_build_object('friendId',f.friend_id,'level',app_private.player_level(f.friend_id)) order by f.friend_id),'[]'::jsonb)
 into result from friends f left join app_private.player_experience e on e.user_id=f.friend_id;
 return result;
end $function$;

alter table public.collectible_gifts drop constraint gift_asset_shape;
alter table public.collectible_gifts add constraint gift_asset_shape check(
 (((reward_kind = 'collectible'::text) AND ((quantity >= 1) AND (quantity <= 20)) AND (cardinality(collectible_ids) = quantity)) OR ((source = 'exchange'::text) AND (reward_kind = 'gold'::text) AND ((quantity >= 1) AND (quantity <= 1000000000)) AND (cardinality(collectible_ids) = 0)) OR ((source = 'exchange'::text) AND (reward_kind = 'bait'::text) AND ((quantity >= 1) AND (quantity <= 9999)) AND (cardinality(collectible_ids) = 0) AND (reward_id IS NOT NULL)) OR ((source = 'system'::text) AND (reward_kind = 'gold'::text) AND (reward_id = ANY (ARRAY['welcome'::text, 'operator-gold-20261020'::text, 'operator-gold-20261020-round2'::text, 'operator-gold-20261021-supply'::text])) AND (quantity = 500) AND (cardinality(collectible_ids) = 0) AND (sender_id IS NULL) AND (NOT exchange_hold)) OR ((source = 'exchange'::text) AND (reward_kind = 'fuel'::text) AND (reward_id = 'fuel'::text) AND ((quantity >= 1) AND (quantity <= 9999)) AND (cardinality(collectible_ids) = 0)) OR ((source = 'system'::text) AND (reward_kind = 'bait'::text) AND (reward_id = 'bait'::text) AND ((species ->> 'id'::text) = ANY (ARRAY['welcome-bait'::text, 'operator-worm-20261020'::text])) AND (quantity = 5) AND (cardinality(collectible_ids) = 0) AND (sender_id IS NULL) AND (NOT exchange_hold)) OR ((source = 'system'::text) AND (reward_kind = 'gold'::text) AND (reward_id ~~ 'arcade-weekly:%'::text) AND (quantity = ANY (ARRAY[2000, 1500, 1000, 650, 400, 200])) AND ((species ->> 'game'::text) = ANY (ARRAY['shadow'::text, 'memory'::text])) AND (reward_id = ((('arcade-weekly:'::text || (species ->> 'game'::text)) || ':'::text) || (species ->> 'week_start'::text))) AND (cardinality(collectible_ids) = 0) AND (sender_id IS NULL) AND (NOT exchange_hold)) OR ((source = 'system'::text) AND (reward_kind = 'gold'::text) AND (reward_id = ANY (ARRAY['giseong-catch-202610:giseong-fish'::text, 'giseong-catch-202610:giseong-webfoot-octopus'::text])) AND ((species ->> 'id'::text) = reward_id) AND (quantity = 300) AND (cardinality(collectible_ids) = 0) AND (sender_id IS NULL) AND (NOT exchange_hold)) OR ((source = 'system'::text) AND (reward_kind = 'gold'::text) AND (reward_id = 'operator-update-20261023-nyamnyam'::text) AND ((species ->> 'id'::text) = reward_id) AND (quantity = 1000) AND (cardinality(collectible_ids) = 0) AND (sender_id IS NULL) AND (NOT exchange_hold)))
 or (source='system' and reward_kind='gold' and sender_id is null and not exchange_hold and cardinality(collectible_ids)=0
 and case when reward_id ~ '^level-up:[1-9][0-9]{0,8}$' then
 split_part(reward_id,':',2)::bigint>=2 and quantity=least(1000000000::bigint,100*((split_part(reward_id,':',2)::bigint+9)/10))
 and species->>'id'=reward_id else false end)
);
create unique index level_up_gift_once on public.collectible_gifts(recipient_id,reward_id)
 where source='system' and reward_kind='gold' and reward_id like 'level-up:%';

create or replace function app_private.award_experience(p_user uuid,p_source text,p_source_id uuid,p_xp integer) returns void language plpgsql security definer set search_path='' as $$
declare e app_private.player_experience;new_level integer;milestone integer;gift uuid;amount integer;player_name text;
begin
 insert into app_private.experience_events(source,source_id,user_id,xp) values(p_source,p_source_id,p_user,p_xp) on conflict(user_id,source,source_id) do nothing;
 if not found then return;end if;
 insert into app_private.player_experience(user_id) values(p_user) on conflict(user_id) do nothing;
 select * into strict e from app_private.player_experience where user_id=p_user for update;
 new_level:=app_private.experience_level(e.total_xp::numeric+e.curve_offset+p_xp);
 update app_private.player_experience set total_xp=total_xp+p_xp,updated_at=clock_timestamp(),rewarded_through=greatest(rewarded_through,new_level) where user_id=p_user;
 if new_level<=e.rewarded_through then return;end if;
 select nickname into strict player_name from public.player_profiles where id=p_user;
 for milestone in e.rewarded_through+1..new_level loop
  amount:=least(1000000000::bigint,100*((milestone::bigint+9)/10))::integer;
  insert into public.collectible_gifts(sender_name,recipient_id,recipient_name,operation_id,collectible_ids,species,quantity,message,source,reward_kind,reward_id)
  values('퐁당섬 운영팀',p_user,player_name,gen_random_uuid(),'{}'::uuid[],
   jsonb_build_object('id','level-up:'||milestone,'name','Lv.'||milestone||' 레벨업 보상'),amount,
   'Lv.'||milestone||' 달성을 축하해요! 레벨업 보상 '||amount||'골드를 받아주세요.','system','gold','level-up:'||milestone)
  on conflict do nothing returning id into gift;
  if gift is not null then
   insert into public.notifications(recipient_id,category,kind,title,body,gift_id)
   values(p_user,'gift','gift_received','레벨업 보상이 도착했어요!','Lv.'||milestone||' 달성 보상 '||amount||'골드를 보관함에서 받아주세요.',gift);
  end if;
 end loop;
end $$;

do $$ begin
 if exists(select 1 from level_curve_before b join app_private.player_experience e using(user_id) where app_private.player_level(e.user_id)<>b.lv or e.total_xp<>b.total_xp or e.rewarded_through<>b.lv) then raise exception 'LEVEL_CONVERSION_FAILED';end if;
end $$;
notify pgrst,'reload schema';
commit;
