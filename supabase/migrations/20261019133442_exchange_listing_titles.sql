begin;
alter table public.exchange_listings add column title text;
alter table public.exchange_listings add constraint exchange_listing_title_check check(title is null or (char_length(btrim(title)) between 1 and 80 and title !~ '[[:cntrl:]]'));
drop function public.exchange_post(text,text,text,integer,text,text,integer,uuid);
drop function app_private.exchange_post(text,text,text,integer,text,text,integer,uuid);
CREATE OR REPLACE FUNCTION app_private.exchange_post(p_side text, p_offer_kind text, p_offer_id text, p_offer_quantity integer, p_wanted_kind text, p_wanted_id text, p_wanted_quantity integer, p_operation_id uuid, p_title text DEFAULT NULL::text)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''
AS $function$
declare v_uid uuid:=auth.uid();v_offer jsonb;v_wanted jsonb;l public.exchange_listings;v_gift uuid;v_title text;
begin
 if v_uid is null then raise exception 'AUTH_REQUIRED';end if;
 if p_side is null or p_side<>'sell' or p_operation_id is null then raise exception 'INVALID_EXCHANGE';end if;
 v_offer:=app_private.exchange_asset(p_offer_kind,p_offer_id,p_offer_quantity);
 v_title:=coalesce(nullif(btrim(p_title),''),(v_offer->>'name')||' 판매합니다');
 if char_length(v_title)>80 or v_title ~ '[[:cntrl:]]' then raise exception 'INVALID_EXCHANGE_TITLE';end if;
 v_wanted:=app_private.exchange_asset(p_wanted_kind,p_wanted_id,p_wanted_quantity);
 if p_offer_kind not in ('collectible','bait') or p_wanted_kind<>'gold' or p_wanted_id<>'gold' then raise exception 'INVALID_EXCHANGE';end if;
 perform app_private.get_gold_wallet();
 perform 1 from public.player_wallets where user_id=v_uid for update;
 select * into l from public.exchange_listings where owner_id=v_uid and operation_id=p_operation_id;
 if found then
  if l.side<>p_side or l.offer<>v_offer or l.wanted<>v_wanted or coalesce(l.title,(l.offer->>'name')||' 판매합니다')<>v_title then raise exception 'OPERATION_CONFLICT';end if;
  return to_jsonb(l);
 end if;
 if (select count(*) from public.exchange_listings where owner_id=v_uid and status='active')>=10 then raise exception 'EXCHANGE_LISTING_LIMIT';end if;
 v_gift:=app_private.exchange_reserve(v_uid,v_offer);
 insert into public.exchange_listings(owner_id,owner_name,side,operation_id,offer,wanted,escrow_gift_id,title)
 values(v_uid,(select nickname from public.player_profiles where id=v_uid),p_side,p_operation_id,v_offer,v_wanted,v_gift,v_title) returning * into l;
 return to_jsonb(l);
end $function$
;
revoke all on function app_private.exchange_post(text,text,text,integer,text,text,integer,uuid,text) from public,anon;
grant execute on function app_private.exchange_post(text,text,text,integer,text,text,integer,uuid,text) to authenticated;
create function public.exchange_post(p_side text,p_offer_kind text,p_offer_id text,p_offer_quantity integer,p_wanted_kind text,p_wanted_id text,p_wanted_quantity integer,p_operation_id uuid,p_title text default null) returns jsonb language sql set search_path='' as $$select app_private.exchange_post(p_side,p_offer_kind,p_offer_id,p_offer_quantity,p_wanted_kind,p_wanted_id,p_wanted_quantity,p_operation_id,p_title)$$;
revoke all on function public.exchange_post(text,text,text,integer,text,text,integer,uuid,text) from public,anon;
grant execute on function public.exchange_post(text,text,text,integer,text,text,integer,uuid,text) to authenticated,service_role;
CREATE OR REPLACE FUNCTION app_private.exchange_state(p_tab text DEFAULT 'all'::text, p_query text DEFAULT ''::text, p_offset integer DEFAULT 0)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''
AS $function$
declare v_uid uuid:=auth.uid();v_rows jsonb;v_total integer;
begin
 if v_uid is null then raise exception 'AUTH_REQUIRED';end if;
 if p_tab is null or p_tab not in ('all','mine') or p_query is null or char_length(p_query)>80 or p_offset is null or p_offset<0 then raise exception 'INVALID_EXCHANGE';end if;
 select count(*) into v_total from public.exchange_listings l
 where (case when p_tab='mine' then l.owner_id=v_uid else l.status='active' and l.side='sell' end)
 and l.side='sell' and l.offer->>'kind' in ('collectible','bait') and l.wanted->>'kind'='gold' and l.wanted->>'id'='gold'
 and (coalesce(l.title,'') ilike '%'||p_query||'%' or l.offer->>'name' ilike '%'||p_query||'%' or l.wanted->>'name' ilike '%'||p_query||'%');
 select coalesce(jsonb_agg(to_jsonb(q) order by q.created_at desc,q.id),'[]') into v_rows from(
  select l.* from public.exchange_listings l
  where (case when p_tab='mine' then l.owner_id=v_uid else l.status='active' and l.side='sell' end)
  and l.side='sell' and l.offer->>'kind' in ('collectible','bait') and l.wanted->>'kind'='gold' and l.wanted->>'id'='gold'
 and (coalesce(l.title,'') ilike '%'||p_query||'%' or l.offer->>'name' ilike '%'||p_query||'%' or l.wanted->>'name' ilike '%'||p_query||'%')
  order by created_at desc,id limit 20 offset p_offset
 ) q;
 return jsonb_build_object('items',v_rows,'total',v_total);
end $function$
;
notify pgrst, 'reload schema';
commit;
