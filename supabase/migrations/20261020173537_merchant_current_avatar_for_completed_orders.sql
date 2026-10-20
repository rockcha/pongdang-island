-- Previous avatar files are deleted on profile updates; use the current public avatar.
begin;
CREATE OR REPLACE FUNCTION app_private.merchant_state()
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''
AS $function$
declare uid uuid:=auth.uid();d date;result jsonb;
begin
 if uid is null then raise exception 'AUTH_REQUIRED';end if;
 loop
  perform app_private.ensure_merchant_orders();
  d:=(clock_timestamp() at time zone 'Asia/Seoul')::date;
  exit when exists(select 1 from app_private.merchant_days m where m.day=d);
 end loop;
 with stock as materialized (select c.species_id,count(*) n from public.player_collectibles c where c.user_id=uid and c.sold_at is null and c.escrow_gift_id is null and c.tank_id is null group by c.species_id)
 select jsonb_build_object('day',d,'serverNow',clock_timestamp(),'resetsAt',(d+1)::timestamp at time zone 'Asia/Seoul','dailyLimit',3,
 'deliveredToday',(select count(*) from app_private.merchant_deliveries x where x.user_id=uid and x.day=d),
 'orders',coalesce(jsonb_agg(jsonb_build_object('id',o.id,'number',o.slot,'tier',o.tier,'regionName',r.name,
 'baseGold',o.base_gold,'rewardGold',o.reward_gold,'completed',o.completed_at is not null,'mine',coalesce(o.completed_by=uid,false),
 'delivery',case when o.completed_at is not null then jsonb_build_object('nickname',coalesce(o.completed_name,'섬 모험가'),'avatarPath',case when profile.id is not null then profile.avatar_path else o.completed_avatar_path end,'message',o.completed_message) end,
 'items',(select jsonb_agg(item||jsonb_build_object('owned',coalesce(stock.n,0)) order by ord) from jsonb_array_elements(o.items) with ordinality a(item,ord)
 left join stock on stock.species_id=item->>'speciesId')) order by o.slot),'[]'::jsonb)) into result
 from app_private.merchant_orders o left join public.regions r on r.id=o.region_id left join public.player_profiles profile on profile.id=o.completed_by where o.day=d;
 return result;
end $function$
;
notify pgrst,'reload schema';
commit;
