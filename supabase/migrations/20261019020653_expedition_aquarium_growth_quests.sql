-- Growth rewards have one fixed claim period and never reset with the calendar.
alter table app_private.quest_claims drop constraint quest_claims_period_kind_check;
alter table app_private.quest_claims add constraint quest_claims_period_kind_check check(period_kind in ('daily','weekly','growth'));

create function app_private.growth_quest_period()
returns jsonb language plpgsql security definer set search_path='' as $$
declare u uuid:=auth.uid();boosts integer;tanks integer;themes integer;maps integer;entries jsonb;
begin
 if u is null then raise exception 'AUTH_REQUIRED';end if;
 select count(*) into boosts from app_private.expedition_boosts where helper_id=u;
 select count(*) into tanks from public.aquarium_tanks where user_id=u;
 -- Default/free backgrounds and the starter sea are not purchases/unlocks.
 select count(*) into themes from public.owned_aquarium_backgrounds o join public.aquarium_backgrounds b on b.id=o.background_id where o.user_id=u and b.price>0 and b.id<>'default';
 select count(*) into maps from public.player_map_fragments f join public.regions r on r.id=f.region_id where f.user_id=u and r.requires_map_fragment;
 with definitions(id,title,target,progress,reward,href,icon,ord) as (values
  ('boost_1','친구 파견에 순풍 1회 보내기',1,boosts,50,'/friends','expeditionBoost',1),
  ('boost_5','친구 파견에 순풍 5회 보내기',5,boosts,150,'/friends','expeditionBoost',2),
  ('boost_20','친구 파견에 순풍 20회 보내기',20,boosts,400,'/friends','expeditionBoost',3),
  ('tanks_2','어항 2개 보유하기',2,tanks,100,'/aquarium','aquarium',11),
  ('tanks_3','어항 3개 보유하기',3,tanks,200,'/aquarium','aquarium',12),
  ('tanks_5','어항 5개 보유하기',5,tanks,400,'/aquarium','aquarium',13),
  ('themes_1','구매 테마 1종 모으기',1,themes,100,'/aquarium','theme',21),
  ('themes_3','구매 테마 3종 모으기',3,themes,150,'/aquarium','theme',22),
  ('themes_5','구매 테마 5종 모으기',5,themes,250,'/aquarium','theme',23),
  ('themes_10','구매 테마 10종 모으기',10,themes,500,'/aquarium','theme',24),
  ('maps_1','새로운 해역 1곳 해금하기',1,maps,100,'/shop?tab=maps','map',31),
  ('maps_3','새로운 해역 3곳 해금하기',3,maps,250,'/shop?tab=maps','map',32),
  ('maps_5','새로운 해역 5곳 해금하기',5,maps,400,'/shop?tab=maps','map',33),
  ('maps_10','새로운 해역 10곳 해금하기',10,maps,800,'/shop?tab=maps','map',34)
 ) select jsonb_agg(jsonb_build_object('id',d.id,'title',d.title,'target',d.target,'progress',least(d.progress,d.target),
  'claimed',c.quest_id is not null,'complete',d.progress>=d.target or c.quest_id is not null,'reward',d.reward,'href',d.href,'icon',d.icon) order by d.ord)
 into entries from definitions d left join app_private.quest_claims c on c.user_id=u and c.period_kind='growth' and c.period_start=date '2000-01-01' and c.quest_id=d.id;
 return jsonb_build_object('kind','growth','start',date '2000-01-01','resetsAt',null,'quests',entries,'bonus',0,'bonusReady',false,'bonusClaimed',false);
end $$;
revoke all on function app_private.growth_quest_period() from public,anon,authenticated;

create or replace function app_private.quest_state()
returns jsonb language plpgsql security definer set search_path='' as $$
declare t timestamptz:=clock_timestamp();
begin
 if auth.uid() is null then raise exception 'AUTH_REQUIRED';end if;
 return jsonb_build_object('serverNow',t,'daily',app_private.quest_period('daily',t),'weekly',app_private.quest_period('weekly',t),'growth',app_private.growth_quest_period());
end $$;

create or replace function app_private.claim_quest(p_kind text,p_start date,p_quest_id text)
returns jsonb language plpgsql security definer set search_path='' as $$
declare u uuid:=auth.uid();p jsonb;q jsonb;amount integer;balance integer;
begin
 if u is null then raise exception 'AUTH_REQUIRED';end if;
 if p_kind is null or p_kind not in ('daily','weekly','growth') or p_start is null or p_quest_id is null then raise exception 'INVALID_QUEST';end if;
 perform app_private.get_gold_wallet();
 select gold into balance from public.player_wallets where user_id=u for update;
 if p_kind='growth' then p:=app_private.growth_quest_period();else p:=app_private.quest_period(p_kind,clock_timestamp());end if;
 if p_start<>(p->>'start')::date then raise exception 'QUEST_PERIOD_CHANGED';end if;
 if p_quest_id='all' then
  if p_kind='growth' then raise exception 'INVALID_QUEST';end if;
  if not (p->>'bonusReady')::boolean then raise exception 'QUEST_INCOMPLETE';end if;
  amount:=(p->>'bonus')::integer;
 else
  select value into q from jsonb_array_elements(p->'quests') where value->>'id'=p_quest_id;
  if q is null then raise exception 'INVALID_QUEST';end if;
  if not (q->>'complete')::boolean then raise exception 'QUEST_INCOMPLETE';end if;
  amount:=(q->>'reward')::integer;
 end if;
 if exists(select 1 from app_private.quest_claims where user_id=u and period_kind=p_kind and period_start=p_start and quest_id=p_quest_id) then
  return app_private.quest_state()||jsonb_build_object('credited',0);
 end if;
 if balance::bigint+amount>1000000000 then raise exception 'GOLD_LIMIT';end if;
 insert into app_private.quest_claims(user_id,period_kind,period_start,quest_id,gold) values(u,p_kind,p_start,p_quest_id,amount);
 update public.player_wallets set gold=gold+amount,updated_at=clock_timestamp() where user_id=u;
 insert into public.gold_transactions(user_id,operation_id,action,item_id,delta) values(u,gen_random_uuid(),'charge','quest:'||p_kind||':'||p_start||':'||p_quest_id,amount);
 return app_private.quest_state()||jsonb_build_object('credited',amount);
end $$;
