begin;
-- reward_gold always stores the full wallet payout: sale snapshot plus merchant bonus.
CREATE OR REPLACE FUNCTION app_private.ensure_merchant_orders()
 RETURNS void
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''
AS $function$
declare d date:=(clock_timestamp() at time zone 'Asia/Seoul')::date;
 i integer;j integer;n integer;high_position integer;qroll integer;quantity integer;
 k public.collectible_kind;r public.game_rarity;highest public.game_rarity;region text;local_order boolean;
 recipe jsonb;s public.collectible_species;items jsonb;tier text;base integer;reward integer;used text[];
begin
 perform pg_advisory_xact_lock(hashtextextended('merchant-day:'||d::text,0));
 if exists(select 1 from app_private.merchant_days m where m.day=d and m.rules_version=4) then return;end if;
 -- Upgrade existing fixed bonuses once without rerolling orders or changing receipts.
 if exists(select 1 from app_private.merchant_days m where m.day=d and m.rules_version=3) then
  update app_private.merchant_orders set reward_gold=base_gold+reward_gold where day=d and completed_at is null;
  update app_private.merchant_days set rules_version=4 where day=d;
  return;
 end if;
 insert into app_private.merchant_days(day,rules_version) values(d,4) on conflict(day) do update set rules_version=4;
 -- Replace only unfinished old-rule orders. Fresh IDs invalidate old confirmation dialogs safely.
 delete from app_private.merchant_orders where day=d and completed_at is null;
 select coalesce(array_agg(a->>'speciesId'),'{}'::text[]) into used from app_private.merchant_orders o cross join lateral jsonb_array_elements(o.items)a where o.day=d;
 for i in 1..30 loop
  if exists(select 1 from app_private.merchant_orders o where o.day=d and o.slot=i) then continue;end if;
  recipe:=app_private.merchant_recipe(floor(random()*10000)::integer,floor(random()*10000)::integer);
  n:=(recipe->>'count')::integer;highest:=(recipe->>'rarity')::public.game_rarity;
  tier:=case highest when 'common' then 'small' when 'rare' then 'mixed' when 'epic' then 'special' else 'grand' end;
  high_position:=1+floor(random()*n)::integer;local_order:=random()<0.7;
  select x.id into region from public.regions x where exists(select 1 from public.collectible_species s0 where s0.native_region_id=x.id and s0.kind='fish' and s0.rarity='common') order by random() limit 1;
  if not local_order then region:=null;end if;
  items:='[]';base:=0;
  for j in 1..n loop
   r:=case when j=high_position then highest else 'common'::public.game_rarity end;
   qroll:=floor(random()*10000)::integer;
   quantity:=case r when 'common' then case when qroll<3500 then 1 when qroll<8500 then 2 when qroll<9700 then 3 else 4 end when 'rare' then case when qroll<8500 then 1 else 2 end else 1 end;
   qroll:=floor(random()*10000)::integer;
   k:=case when qroll<6000 then 'fish'::public.collectible_kind when qroll<8000 then 'trash'::public.collectible_kind else 'decoration'::public.collectible_kind end;
   select x.* into s from public.collectible_species x where x.rarity=r and x.kind=k and x.sell_price>0
    and (select count(*) from unnest(used) u(id) where u.id=x.id)<2
    and not exists(select 1 from jsonb_array_elements(items) t where t->>'speciesId'=x.id)
   order by case when local_order and (x.native_region_id=region or x.native_region_id is null) then 0 else 1 end,random() limit 1;
   if s.id is null then
    select x.* into s from public.collectible_species x where x.rarity=r and x.kind in ('fish','trash','decoration') and x.sell_price>0
     and (select count(*) from unnest(used) u(id) where u.id=x.id)<2
     and not exists(select 1 from jsonb_array_elements(items) t where t->>'speciesId'=x.id)
    order by case when local_order and (x.native_region_id=region or x.native_region_id is null) then 0 else 1 end,random() limit 1;
   end if;
   if s.id is null then raise exception 'MERCHANT_POOL_EMPTY';end if;
   used:=array_append(used,s.id);
   items:=items||jsonb_build_array(jsonb_build_object('speciesId',s.id,'name',s.name,'thumbnailPath',s.thumbnail_path,'kind',s.kind,'rarity',s.rarity,'quantity',quantity,'unitGold',s.sell_price));
   base:=base+s.sell_price*quantity;
  end loop;
  reward:=base+app_private.merchant_reward(n,highest::text);
  insert into app_private.merchant_orders(day,slot,tier,region_id,items,base_gold,reward_gold) values(d,i,tier,region,items,base,reward);
 end loop;
end $function$
;

select app_private.ensure_merchant_orders();
commit;
