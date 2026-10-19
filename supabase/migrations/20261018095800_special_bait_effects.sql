-- New bait targeting is private, server-side, and uses the caller's real loadout.
create function app_private.pick_special_bait_collectible(p_region_id text,p_rarity public.game_rarity,p_bait_id text)
returns text language plpgsql set search_path = '' as $$
declare v_rod_region text; v_species text;
begin
 if auth.uid() is null then raise exception 'AUTH_REQUIRED'; end if;
 if p_bait_id not in ('bait_grubby_magnet','bait_sea_memory','bait_first_greeting') then raise exception 'INVALID_BAIT'; end if;
 if not exists(select 1 from public.regions where id=p_region_id) then raise exception 'REGION_NOT_FOUND'; end if;
 select r.region_id into v_rod_region from public.player_rod_loadouts l
 join public.player_fishing_rods o on o.user_id=l.user_id and o.rod_id=l.equipped_rod_id
 join public.fishing_rods r on r.id=o.rod_id
 where l.user_id=auth.uid() and r.native_bonus_bp>0;
 with candidates as materialized (
  select s.id,s.rarity,s.is_native,s.native_region_id from public.collectible_species s
  where case p_bait_id
   when 'bait_grubby_magnet' then s.kind='trash'
   when 'bait_first_greeting' then s.kind in ('fish','trash','decoration') and not exists (
    select 1 from public.player_discoveries d where d.user_id=auth.uid() and d.species_id=s.id)
   else s.kind in ('fish','trash') and s.rarity=p_rarity
  end
 ), pool as (
  select c.* from candidates c where c.rarity=p_rarity or not exists(select 1 from candidates c2 where c2.rarity=p_rarity)
 )
 select p.id into v_species from pool p
 order by -ln(greatest(random(),1e-15))/(
  app_private.rod_habitat_weight(case when p.is_native then p.native_region_id else null end,p_region_id,v_rod_region)
  * case when p_bait_id='bait_sea_memory' and p.is_native and p.native_region_id=p_region_id then 3 else 1 end
  * case when exists(select 1 from candidates c where c.rarity=p_rarity) then 1
     else case p.rarity when 'common' then 7700 when 'rare' then 2000 when 'epic' then 270 else 30 end end
 ),p.id limit 1;
 return v_species;
end;
$$;

-- Shared delivery for operator rewards. The caller locks the originating report
-- before invoking this helper, so retried confirmations never reach it twice.
create function app_private.grant_special_bait_reward(p_recipient uuid,p_quantity integer)
returns jsonb language plpgsql security invoker set search_path = '' as $$
declare v_inventory jsonb;v_reward jsonb:='{}';v_bait text;v_i integer;
 v_baits text[]:=array['bait_safe','bait_special','bait_epic','bait_magnet','bait_forbidden_star','bait_grubby_magnet','bait_sea_memory','bait_first_greeting'];
begin
 if auth.uid() is null or not app_private.notice_is_operator() then raise exception 'NOT_ALLOWED';end if;
 if p_quantity is null or p_quantity not between 1 and 2 then raise exception 'INVALID_REWARD';end if;
 if (select count(*) from public.fishing_baits where id=any(v_baits))<>cardinality(v_baits) then raise exception 'REWARD_UNAVAILABLE';end if;
 insert into public.player_wallets(user_id) values(p_recipient) on conflict do nothing;
 select inventory into v_inventory from public.player_wallets where user_id=p_recipient for update;
 for v_i in 1..p_quantity loop
  v_bait:=v_baits[1+floor(random()*cardinality(v_baits))::integer];
  v_reward:=jsonb_set(v_reward,array[v_bait],to_jsonb(coalesce((v_reward->>v_bait)::integer,0)+1));
  v_inventory:=jsonb_set(v_inventory,array[v_bait],to_jsonb(coalesce((v_inventory->>v_bait)::integer,0)+1));
 end loop;
 update public.player_wallets set inventory=v_inventory,updated_at=now() where user_id=p_recipient;
 return v_reward;
end;
$$;
revoke all on function app_private.grant_special_bait_reward(uuid,integer) from public,anon,authenticated;

create or replace function app_private.adopt_suggestion(p_id uuid) returns jsonb
language plpgsql security definer set search_path = '' as $$
declare v_post public.suggestion_posts;v_rewards jsonb;
begin
 if auth.uid() is null or not app_private.notice_is_operator() then raise exception 'SUGGESTION_OPERATOR_REQUIRED';end if;
 select * into v_post from public.suggestion_posts where id=p_id for update;
 if not found then raise exception 'SUGGESTION_NOT_FOUND';end if;
 if v_post.adopted_at is not null then return to_jsonb(v_post);end if;
 v_rewards:=app_private.grant_special_bait_reward(v_post.author_id,2);
 update public.suggestion_posts set adopted_at=now(),adopted_by=auth.uid(),reward=v_rewards where id=p_id returning * into v_post;
 insert into public.notifications(recipient_id,actor_id,category,kind,title,body)
 values(v_post.author_id,auth.uid(),'general','reward','[운영팀] 아이디어가 채택됐어요!',
  '「'||v_post.title||'」 건의가 채택되어 랜덤 특수미끼 2개를 지급했어요. 미끼통에서 확인해주세요.');
 return to_jsonb(v_post);
end;
$$;

create or replace function app_private.confirm_bug_report(p_id uuid) returns jsonb
language plpgsql security definer set search_path = '' as $$
declare v_post public.bug_reports;v_rewards jsonb;
begin
 if auth.uid() is null or not app_private.notice_is_operator() then raise exception 'BUG_REPORT_OPERATOR_REQUIRED';end if;
 select * into v_post from public.bug_reports where id=p_id for update;
 if not found then raise exception 'BUG_REPORT_NOT_FOUND';end if;
 if v_post.confirmed_at is not null then return to_jsonb(v_post);end if;
 v_rewards:=app_private.grant_special_bait_reward(v_post.author_id,1);
 update public.bug_reports set confirmed_at=now(),confirmed_by=auth.uid(),reward=v_rewards where id=p_id returning * into v_post;
 insert into public.notifications(recipient_id,actor_id,category,kind,title,body)
 values(v_post.author_id,auth.uid(),'general','reward','[운영팀] 버그 제보가 확인됐어요!',
  '「'||v_post.title||'」 제보가 버그로 확인되어 랜덤 특수미끼 1개를 지급했어요. 미끼통에서 확인해주세요.');
 return to_jsonb(v_post);
end;
$$;
revoke all on function app_private.pick_special_bait_collectible(text,public.game_rarity,text) from public,anon,authenticated;

create or replace function app_private.prepare_fishing(p_region_id text,p_bait_id text,p_operation_id uuid)
returns jsonb language plpgsql security definer set search_path = '' as $$
declare v_uid uuid:=auth.uid();p app_private.prepared_fishing_casts;w public.player_wallets;
 v_current text;v_required boolean;v_count integer;v_decoration boolean;v_eligible boolean;
 v_rarity public.game_rarity;v_species text;v_map text;v_snapshot jsonb;
begin
 if v_uid is null then raise exception 'AUTH_REQUIRED';end if;
 if p_operation_id is null then raise exception 'INVALID_TRADE';end if;
 perform pg_advisory_xact_lock(hashtextextended('region:'||v_uid::text,0));
 select * into p from app_private.prepared_fishing_casts where user_id=v_uid and operation_id=p_operation_id;
 if found then
  if p.region_id<>p_region_id or p.bait_id<>p_bait_id then raise exception 'OPERATION_CONFLICT';end if;
  return app_private.prepared_fishing_payload(p);
 end if;
 if exists(select 1 from public.fishing_attempts where user_id=v_uid and operation_id=p_operation_id) then raise exception 'OPERATION_CONFLICT';end if;
 select * into p from app_private.prepared_fishing_casts where user_id=v_uid and finished_at is null;
 if found then
  if p.expires_at<=clock_timestamp() then perform app_private.finish_fishing(p.operation_id,false);
  else return app_private.prepared_fishing_payload(p);end if;
 end if;
 perform app_private.get_gold_wallet();
 select * into w from public.player_wallets where user_id=v_uid for update;
 select effect_kind='decoration' into v_decoration from public.fishing_baits where id=p_bait_id;
 if not found then raise exception 'INVALID_BAIT';end if;
 select requires_map_fragment into v_required from public.regions where id=p_region_id;
 if not found then raise exception 'REGION_NOT_FOUND';end if;
 select region_id into v_current from public.player_navigation where user_id=v_uid;
 if v_current is distinct from p_region_id then raise exception 'NOT_IN_REGION';end if;
 if v_required and not exists(select 1 from public.player_map_fragments where user_id=v_uid and region_id=p_region_id) then raise exception 'REGION_LOCKED';end if;
 v_count:=coalesce((w.inventory->>p_bait_id)::integer,0);
 if v_count<1 then raise exception 'NO_BAIT';end if;
 -- Reject an exhausted discovery pool before the failure roll or bait consumption.
 if p_bait_id='bait_first_greeting' and not exists (
  select 1 from public.collectible_species s where s.kind in ('fish','trash','decoration')
  and not exists(select 1 from public.player_discoveries d where d.user_id=v_uid and d.species_id=s.id)
 ) then raise exception 'ALL_COLLECTIBLES_DISCOVERED';end if;
 v_eligible:=random()<app_private.fishing_success_chance_bp(p_bait_id)::numeric/10000;
 v_rarity:='common';
 if v_eligible then
  if not v_decoration then v_rarity:=app_private.resolve_regional_fishing(p_bait_id,p_region_id,floor(random()*10000)::integer);end if;
  if p_bait_id in ('bait_grubby_magnet','bait_sea_memory','bait_first_greeting') then
   v_species:=app_private.pick_special_bait_collectible(p_region_id,v_rarity,p_bait_id);
  else
   select q.species_id,q.map_region_id into v_species,v_map from app_private.pick_regional_collectible(p_region_id,v_rarity,v_decoration,floor(random()*10000)::integer) q;
  end if;
  if v_species is null then raise exception 'NO_COLLECTIBLE_FOR_REGION';end if;
  select rarity into v_rarity from public.collectible_species where id=v_species;
  v_snapshot:=app_private.species_payload(v_species,v_map);
 end if;
 insert into app_private.prepared_fishing_casts(user_id,operation_id,region_id,bait_id,eligible,species_id,map_region_id,rarity,snapshot,wait_seconds,failure_at,failure_reason,expires_at)
 values(v_uid,p_operation_id,p_region_id,p_bait_id,v_eligible,v_species,v_map,v_rarity,v_snapshot,3+random()*2,
  4.5+random()*3,(array['bait','escape','wave'])[1+floor(random()*3)::integer],clock_timestamp()+interval '3 minutes') returning * into p;
 update public.player_wallets set inventory=jsonb_set(inventory,array[p_bait_id],to_jsonb(v_count-1)),updated_at=now() where user_id=v_uid;
 return app_private.prepared_fishing_payload(p);
end;
$$;
