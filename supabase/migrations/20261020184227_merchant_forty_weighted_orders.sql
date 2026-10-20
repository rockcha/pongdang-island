begin;
alter table app_private.merchant_orders drop constraint merchant_orders_slot_check;
alter table app_private.merchant_orders add constraint merchant_orders_slot_check check(slot between 1 and 40);

-- A fixed daily mix; grade is drawn once per order, not once per collectible.
create function app_private.merchant_order_shape(p_slot integer) returns integer[]
language plpgsql immutable set search_path='' as $$
begin
 if p_slot is null or p_slot not between 1 and 40 then raise exception 'INVALID_MERCHANT_SLOT';end if;
 return case when p_slot<=10 then array[1] when p_slot<=30 then array[1,1] when p_slot<=37 then array[1,2] else array[1,1,2] end;
end $$;
revoke all on function app_private.merchant_order_shape(integer) from public,anon,authenticated;

create function app_private.merchant_order_grade(p_roll integer) returns public.game_rarity
language plpgsql immutable set search_path='' as $$
begin
 if p_roll is null or p_roll not between 0 and 9999 then raise exception 'INVALID_MERCHANT_ROLL';end if;
 return case when p_roll<7600 then 'common'::public.game_rarity when p_roll<9600 then 'rare'::public.game_rarity when p_roll<9970 then 'epic'::public.game_rarity else 'mythic'::public.game_rarity end;
end $$;
revoke all on function app_private.merchant_order_grade(integer) from public,anon,authenticated;

create function app_private.merchant_order_bonus(p_items jsonb) returns integer
language plpgsql immutable set search_path='' as $$
declare n integer;total integer;rare_units integer;rare_kinds integer;epics integer;mythics integer;bonus integer;
begin
 if jsonb_typeof(p_items) is distinct from 'array' then raise exception 'INVALID_MERCHANT_ITEMS';end if;
 n:=jsonb_array_length(p_items);
 if n not between 1 and 3 or exists(select 1 from jsonb_array_elements(p_items) a where (a->>'quantity') is null or (a->>'quantity')::integer not between 1 and 2 or coalesce(a->>'rarity','') not in ('common','rare','epic','mythic')) then raise exception 'INVALID_MERCHANT_ITEMS';end if;
 select sum((a->>'quantity')::integer),coalesce(sum((a->>'quantity')::integer) filter(where a->>'rarity'='rare'),0),count(*) filter(where a->>'rarity'='rare'),count(*) filter(where a->>'rarity'='epic'),count(*) filter(where a->>'rarity'='mythic')
 into total,rare_units,rare_kinds,epics,mythics from jsonb_array_elements(p_items) a;
 if n=1 and total=1 then
  return case p_items->0->>'rarity' when 'common' then 80 when 'rare' then 100 when 'epic' then 250 else 600 end;
 elsif n=2 and total=2 then
  bonus:=case rare_kinds when 0 then 120 when 1 then 200 else 250 end;
 elsif n=2 and total=3 then
  bonus:=case rare_units when 0 then 200 when 1 then 300 when 2 then 380 else 500 end;
 elsif n=3 and total=4 and (select max((a->>'quantity')::integer) from jsonb_array_elements(p_items) a)=2 then
  bonus:=case rare_kinds when 0 then 300 when 1 then 400 else 500 end;
 else raise exception 'INVALID_MERCHANT_ITEMS';end if;
 return bonus+epics*250+mythics*600;
end $$;
revoke all on function app_private.merchant_order_bonus(jsonb) from public,anon,authenticated;

create or replace function app_private.ensure_merchant_orders() returns void
language plpgsql security definer set search_path='' as $$
declare d date:=(clock_timestamp() at time zone 'Asia/Seoul')::date;
 i integer;j integer;n integer;shape integer[];eligible integer;high_position integer;rare_count integer;qroll integer;
 k public.collectible_kind;r public.game_rarity;highest public.game_rarity;
 s public.collectible_species;items jsonb;tier text;base integer;reward integer;used text[];
begin
 perform pg_advisory_xact_lock(hashtextextended('merchant-day:'||d::text,0));
 if exists(select 1 from app_private.merchant_days m where m.day=d and m.rules_version=6) then return;end if;
 insert into app_private.merchant_days(day,rules_version) values(d,6) on conflict(day) do update set rules_version=6;
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
end $$;
revoke all on function app_private.ensure_merchant_orders() from public,anon,authenticated;
select app_private.ensure_merchant_orders();
commit;
