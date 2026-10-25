begin;
CREATE OR REPLACE FUNCTION app_private.send_collectible_gift(p_recipient_id uuid, p_collectible_ids uuid[], p_message text, p_operation_id uuid)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''
AS $function$
declare v_uid uuid:=auth.uid(); v_ids uuid[]; g public.collectible_gifts; v_count integer; v_species text; v_bundle jsonb; v_payload jsonb; v_name text; v_recipient text; v_message text:=btrim(coalesce(p_message,''));
begin
 if v_uid is null then raise exception 'AUTH_REQUIRED'; end if;
 if p_recipient_id is null or p_recipient_id=v_uid then raise exception 'INVALID_RECIPIENT'; end if;
 if p_operation_id is null or coalesce(cardinality(p_collectible_ids),0) not between 1 and 20 or char_length(v_message)>300 then raise exception 'INVALID_GIFT'; end if;
 select array_agg(id order by id) into v_ids from(select distinct unnest(p_collectible_ids) as id) q;
 if cardinality(v_ids)<>cardinality(p_collectible_ids) or array_position(v_ids,null) is not null then raise exception 'INVALID_GIFT'; end if;
 perform pg_advisory_xact_lock(hashtextextended('gift-send:'||v_uid::text,0));
 select * into g from public.collectible_gifts where sender_id=v_uid and operation_id=p_operation_id;
 if found then
  if g.recipient_id is distinct from p_recipient_id or g.collectible_ids<>v_ids or g.message<>v_message then raise exception 'OPERATION_CONFLICT'; end if;
  return to_jsonb(g);
 end if;
 perform 1 from public.friend_requests where status='accepted' and ((sender_id=v_uid and recipient_id=p_recipient_id) or(sender_id=p_recipient_id and recipient_id=v_uid)) for share;
 if not found then raise exception 'GIFT_FRIEND_REQUIRED'; end if;
 if (select count(*) from public.collectible_gifts where sender_id=v_uid and created_at>now()-interval '1 minute')>=5 then raise exception 'GIFT_RATE_LIMIT'; end if;
 select nickname into v_name from public.player_profiles where id=v_uid;
 select nickname into v_recipient from public.player_profiles where id=p_recipient_id;
 if v_name is null or v_recipient is null then raise exception 'INVALID_RECIPIENT'; end if;
 perform 1 from public.player_collectibles where user_id=v_uid and id=any(v_ids) order by id for update;
 select count(*),min(c.species_id) into v_count,v_species from public.player_collectibles c join public.collectible_species s on s.id=c.species_id
 where c.user_id=v_uid and c.id=any(v_ids) and c.sold_at is null and c.escrow_gift_id is null and s.kind in ('fish','trash','decoration');
 if v_count<>cardinality(v_ids) then raise exception 'COLLECTIBLE_NOT_FOUND'; end if;
 select jsonb_agg(app_private.species_payload(q.species_id)||jsonb_build_object('quantity',q.quantity) order by q.species_id)
 into v_bundle from (select species_id,count(*) quantity from public.player_collectibles where user_id=v_uid and id=any(v_ids) group by species_id) q;
 v_payload:=app_private.species_payload(v_species);
 if jsonb_array_length(v_bundle)>1 then v_payload:=v_payload||jsonb_build_object('name',jsonb_array_length(v_bundle)||'종 선물','bundle_items',v_bundle);end if;
 insert into public.collectible_gifts(sender_id,recipient_id,sender_name,recipient_name,operation_id,collectible_ids,species,quantity,message)
 values(v_uid,p_recipient_id,v_name,v_recipient,p_operation_id,v_ids,v_payload,v_count,v_message) returning * into g;
 -- Recipient owns reserved items, so deletion of the sender cannot destroy the gift.
 update public.player_collectibles set tank_id=null,user_id=p_recipient_id,escrow_gift_id=g.id,position_x=null,position_y=null where id=any(v_ids);
 insert into public.notifications(recipient_id,actor_id,category,kind,title,body,gift_id)
 values(p_recipient_id,v_uid,'gift','gift_received','선물을 받았습니다',v_name||'님이 '||(g.species->>'name')||' ×'||v_count||'를 보냈어요.',g.id);
 return to_jsonb(g);
end $function$;
create table app_private.aquarium_likes (
 owner_id uuid not null references public.player_profiles(id) on delete cascade,
 visitor_id uuid not null references public.player_profiles(id) on delete cascade,
 created_at timestamptz not null default now(),
 primary key(owner_id,visitor_id), check(owner_id<>visitor_id)
);
create index aquarium_likes_visitor on app_private.aquarium_likes(visitor_id);
alter table app_private.aquarium_likes enable row level security;
revoke all on app_private.aquarium_likes from public,anon,authenticated;
create function app_private.aquarium_like_state(p_owner uuid) returns jsonb
language plpgsql stable security definer set search_path='' as $function$
begin
 perform app_private.require_aquarium_friend(p_owner);
 return jsonb_build_object('count',(select count(*) from app_private.aquarium_likes where owner_id=p_owner),
 'liked',exists(select 1 from app_private.aquarium_likes where owner_id=p_owner and visitor_id=auth.uid()));
end $function$;
create function app_private.set_aquarium_like(p_owner uuid,p_liked boolean) returns jsonb
language plpgsql security definer set search_path='' as $function$
begin
 perform app_private.require_aquarium_friend(p_owner);
 if p_liked is null or p_owner=auth.uid() then raise exception 'INVALID_LIKE';end if;
 perform pg_advisory_xact_lock(hashtextextended('aquarium-like:'||p_owner::text,0));
 if p_liked then insert into app_private.aquarium_likes(owner_id,visitor_id) values(p_owner,auth.uid()) on conflict do nothing;
 else delete from app_private.aquarium_likes where owner_id=p_owner and visitor_id=auth.uid();end if;
 return app_private.aquarium_like_state(p_owner);
end $function$;
revoke all on function app_private.aquarium_like_state(uuid),app_private.set_aquarium_like(uuid,boolean) from public,anon;
grant execute on function app_private.aquarium_like_state(uuid),app_private.set_aquarium_like(uuid,boolean) to authenticated;
create function public.aquarium_like_state(p_owner uuid) returns jsonb language sql security invoker set search_path='' as $function$select app_private.aquarium_like_state(p_owner)$function$;
create function public.set_aquarium_like(p_owner uuid,p_liked boolean) returns jsonb language sql security invoker set search_path='' as $function$select app_private.set_aquarium_like(p_owner,p_liked)$function$;
revoke all on function public.aquarium_like_state(uuid),public.set_aquarium_like(uuid,boolean) from public,anon;
grant execute on function public.aquarium_like_state(uuid),public.set_aquarium_like(uuid,boolean) to authenticated;
notify pgrst,'reload schema';
commit;
