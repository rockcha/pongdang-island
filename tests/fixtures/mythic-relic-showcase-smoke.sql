do $test$
declare u uuid:=gen_random_uuid();other uuid:=gen_random_uuid();s jsonb;c jsonb;op uuid;post uuid;r record;
begin
 insert into auth.users(id) values(u),(other);
 insert into public.player_profiles(id,nickname) values(u,'유물자랑'||left(u::text,6)),(other,'유물타인'||left(other::text,6));
 perform set_config('request.jwt.claim.sub',u::text,true);
 insert into public.player_wallets(user_id,gold,inventory) values(u,10000,'{"bait":100}') on conflict(user_id) do update set gold=10000,inventory=excluded.inventory;
 for r in select * from public.fishing_relics where id in ('horizon-ark','sealed-fairwind-reliquary') order by id loop
  op:=gen_random_uuid();
  insert into app_private.prepared_fishing_casts(user_id,operation_id,region_id,bait_id,eligible,relic_id,rarity,snapshot,wait_seconds,failure_at,failure_reason,created_at,expires_at)
   values(u,op,'pongdang','bait',true,r.id,r.rarity,app_private.fishing_relic_payload(r.id),12,4.5,'bait',clock_timestamp()-interval '1 minute',clock_timestamp()+interval '1 hour');
  set local role authenticated;
  begin perform public.publish_fishing_showcase(op,'pending');raise exception 'PENDING_SHARED';exception when others then if sqlerrm<>'CATCH_NOT_SHAREABLE' then raise;end if;end;
  s:=public.finish_fishing(op,true);
  if r.rarity='mythic' then
   c:=public.relic_showcase_catch(r.id);
   if (c->>'operationId')::uuid<>op or c->'species' is distinct from s#>'{attempt,species}' then raise exception 'CATCH_SOURCE_WRONG';end if;
   post:=public.publish_fishing_showcase(op,'드디어 찾았다!');
   if public.publish_fishing_showcase(op,'retry')<>post then raise exception 'POST_RETRY_DUPLICATED';end if;
   perform public.sell_relic(r.id,gen_random_uuid(),r.sell_price);
   if public.publish_fishing_showcase(op,'sold retry')<>post then raise exception 'SALE_CHANGED_POST';end if;
  else
   begin perform public.relic_showcase_catch(r.id);raise exception 'EPIC_SOURCE_ALLOWED';exception when others then if sqlerrm<>'CATCH_NOT_SHAREABLE' then raise;end if;end;
   begin perform public.publish_fishing_showcase(op,'epic');raise exception 'EPIC_SHARED';exception when others then if sqlerrm<>'CATCH_NOT_SHAREABLE' then raise;end if;end;
  end if;
  reset role;
 end loop;
 if not exists(select 1 from public.fishing_showcase_posts where id=post and author_id=u and species->>'kind'='relic' and rarity='mythic' and first_discovery) then raise exception 'RELIC_POST_MISSING';end if;
 perform set_config('request.jwt.claim.sub',other::text,true);
 set local role authenticated;
 begin perform public.relic_showcase_catch('horizon-ark');raise exception 'FOREIGN_SOURCE_ALLOWED';exception when others then if sqlerrm<>'CATCH_NOT_SHAREABLE' then raise;end if;end;
 begin perform public.publish_fishing_showcase((select (c->>'operationId')::uuid),'foreign');raise exception 'FOREIGN_POST_ALLOWED';exception when others then if sqlerrm<>'CATCH_NOT_SHAREABLE' then raise;end if;end;
 reset role;
 set local role anon;
 begin perform public.relic_showcase_catch('horizon-ark');raise exception 'ANON_SOURCE_ALLOWED';exception when insufficient_privilege then null;end;
 reset role;
end $test$;
