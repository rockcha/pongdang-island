begin;

CREATE OR REPLACE FUNCTION app_private.merchant_order_shape(p_slot integer)
 RETURNS integer[]
 LANGUAGE plpgsql
 IMMUTABLE
 SET search_path TO ''
AS $function$
begin
 if p_slot is null or p_slot not between 1 and 40 then raise exception 'INVALID_MERCHANT_SLOT';end if;
 return case when p_slot<=20 then array[1] when p_slot<=30 then array[1,1] when p_slot<=37 then array[1,2] else array[1,1,2] end;
end $function$
;

CREATE OR REPLACE FUNCTION app_private.ensure_merchant_orders()
 RETURNS void
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''
AS $function$
declare d date:=(clock_timestamp() at time zone 'Asia/Seoul')::date;
 i integer;j integer;n integer;shape integer[];eligible integer;high_position integer;rare_count integer;qroll integer;
 k public.collectible_kind;r public.game_rarity;highest public.game_rarity;
 s public.collectible_species;items jsonb;tier text;base integer;reward integer;used text[];
begin
 perform pg_advisory_xact_lock(hashtextextended('merchant-day:'||d::text,0));
 if exists(select 1 from app_private.merchant_days m where m.day=d and m.rules_version=7) then return;end if;
 insert into app_private.merchant_days(day,rules_version) values(d,7) on conflict(day) do update set rules_version=7;
 -- Rotate only open IDs on a composition change. Completed receipts remain replayable.
 delete from app_private.merchant_orders where day=d and completed_at is null;
 select coalesce(array_agg(a->>'speciesId'),'{}'::text[]) into used from app_private.merchant_orders o cross join lateral jsonb_array_elements(o.items) a where o.day=d;
 for i in 1..40 loop
  if exists(select 1 from app_private.merchant_orders o where o.day=d and o.slot=i) then continue;end if;
  shape:=app_private.merchant_order_shape(i);n:=cardinality(shape);
  select count(*)::integer into eligible from unnest(shape) quantity where quantity=1;
  qroll:=floor(random()*10000)::integer;
  highest:=app_private.merchant_order_grade(qroll);
  tier:=case highest when 'common' then 'small' when 'rare' then 'mixed' when 'epic' then 'special' else 'grand' end;
  -- Two-unit slots are always common. Rare-only orders can use every single-unit slot.
  high_position:=1+floor(random()*eligible)::integer;
  rare_count:=case when highest='rare' then 1+floor(random()*eligible)::integer else 0 end;
  items:='[]';base:=0;
  for j in 1..n loop
   r:=case when shape[j]=2 then 'common'::public.game_rarity when highest='rare' and ((j-high_position+eligible)%eligible)<rare_count then 'rare'::public.game_rarity when j=high_position then highest else 'common'::public.game_rarity end;
   qroll:=floor(random()*10000)::integer;
   k:=case when qroll<6000 then 'fish'::public.collectible_kind when qroll<8000 then 'trash'::public.collectible_kind else 'decoration'::public.collectible_kind end;
   select x.* into s from public.collectible_species x where x.rarity=r and x.kind=k and x.sell_price>0
    and (select count(*) from unnest(used) u(id) where u.id=x.id)<2
    and not exists(select 1 from jsonb_array_elements(items) t where t->>'speciesId'=x.id)
   order by random() limit 1;
   if s.id is null then
    select x.* into s from public.collectible_species x where x.rarity=r and x.kind in ('fish','trash','decoration') and x.sell_price>0
     and (select count(*) from unnest(used) u(id) where u.id=x.id)<2
     and not exists(select 1 from jsonb_array_elements(items) t where t->>'speciesId'=x.id)
    order by random() limit 1;
   end if;
   if s.id is null then raise exception 'MERCHANT_POOL_EMPTY';end if;
   used:=array_append(used,s.id);
   items:=items||jsonb_build_array(jsonb_build_object('speciesId',s.id,'name',s.name,'thumbnailPath',s.thumbnail_path,'kind',s.kind,'rarity',s.rarity,'quantity',shape[j],'unitGold',s.sell_price));
   base:=base+s.sell_price*shape[j];
  end loop;
  reward:=base+app_private.merchant_order_bonus(items);
  insert into app_private.merchant_orders(day,slot,tier,region_id,items,base_gold,reward_gold) values(d,i,tier,null,items,base,reward);
 end loop;
end $function$
;

select app_private.ensure_merchant_orders();

commit;
