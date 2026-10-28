begin;

-- Snapshot rewards on existing orders and completed receipts stay unchanged.
CREATE OR REPLACE FUNCTION app_private.merchant_order_bonus(p_items jsonb)
 RETURNS integer
 LANGUAGE plpgsql
 IMMUTABLE
 SET search_path TO ''
AS $function$
declare n integer;total integer;rare_units integer;rare_kinds integer;epics integer;mythics integer;bonus integer;
begin
 if jsonb_typeof(p_items) is distinct from 'array' then raise exception 'INVALID_MERCHANT_ITEMS';end if;
 n:=jsonb_array_length(p_items);
 if n not between 1 and 3 or exists(select 1 from jsonb_array_elements(p_items) a where (a->>'quantity') is null or (a->>'quantity')::integer not between 1 and 2 or coalesce(a->>'rarity','') not in ('common','rare','epic','mythic')) then raise exception 'INVALID_MERCHANT_ITEMS';end if;
 select sum((a->>'quantity')::integer),coalesce(sum((a->>'quantity')::integer) filter(where a->>'rarity'='rare'),0),count(*) filter(where a->>'rarity'='rare'),count(*) filter(where a->>'rarity'='epic'),count(*) filter(where a->>'rarity'='mythic')
 into total,rare_units,rare_kinds,epics,mythics from jsonb_array_elements(p_items) a;
 if n=1 and total=1 then
  return case p_items->0->>'rarity' when 'common' then 72 when 'rare' then 90 when 'epic' then 225 else 540 end;
 elsif n=2 and total=2 then
  bonus:=case rare_kinds when 0 then 120 when 1 then 200 else 250 end;
 elsif n=2 and total=3 then
  bonus:=case rare_units when 0 then 200 when 1 then 300 when 2 then 380 else 500 end;
 elsif n=3 and total=4 and (select max((a->>'quantity')::integer) from jsonb_array_elements(p_items) a)=2 then
  bonus:=case rare_kinds when 0 then 600 when 1 then 800 else 1000 end;
 else raise exception 'INVALID_MERCHANT_ITEMS';end if;
 return bonus+epics*250+mythics*600;
end $function$
;

-- Expose only the latest visible post timestamp; keep flea tables private.
create index flea_posts_latest_active on app_private.flea_posts(created_at desc,id) where status='active';

create or replace function app_private.flea_latest_post()
returns timestamptz
language plpgsql
stable security definer
set search_path=''
as $function$
declare caller uuid:=auth.uid();
begin
 if caller is null then raise exception 'AUTH_REQUIRED' using errcode='42501';end if;
 return (select p.created_at from app_private.flea_posts p where p.status='active' and p.owner_id<>caller order by p.created_at desc,p.id limit 1);
end $function$;
revoke all on function app_private.flea_latest_post() from public,anon;
grant execute on function app_private.flea_latest_post() to authenticated,service_role;

CREATE OR REPLACE FUNCTION public.new_content_state()
 RETURNS jsonb
 LANGUAGE plpgsql
 STABLE
 SET search_path TO ''
AS $function$
declare u uuid:=auth.uid();
begin
 if u is null then raise exception 'AUTH_REQUIRED';end if;
 return jsonb_build_object(
  'board',(select created_at from public.board_posts where author_id<>u order by created_at desc,id desc limit 1),
  'flea',app_private.flea_latest_post(),
  'exchange',(select created_at from public.exchange_listings where owner_id<>u and status='active' and side='sell'
   and offer->>'kind' in ('collectible','bait','fuel') and wanted->>'kind'='gold' and wanted->>'id'='gold' order by created_at desc,id limit 1),
  'suggestions',(select created_at from public.suggestion_posts where author_id<>u order by created_at desc,id desc limit 1),
  'bugs',(select created_at from public.bug_reports where author_id<>u order by created_at desc,id desc limit 1),
  'showcase',(select created_at from public.fishing_showcase_posts where author_id<>u order by created_at desc,id desc limit 1),
  'merchant',(app_private.merchant_summary(false)->>'availableAt')::timestamptz
 );
end $function$
;

commit;
