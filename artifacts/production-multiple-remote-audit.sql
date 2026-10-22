-- All test accounts, wallets, purchases and runs are rolled back.
begin;
do $audit$
declare u uuid:=gen_random_uuid();stranger uuid:=gen_random_uuid();op uuid:=gen_random_uuid();r jsonb;steps jsonb;ids uuid[];
begin
 insert into auth.users(id,email) values(u,'production-multi-audit-'||u::text||'@example.invalid'),(stranger,'production-multi-audit-'||stranger::text||'@example.invalid');
 perform set_config('request.jwt.claim.sub',u::text,true);
 insert into public.player_wallets(user_id,gold,inventory) values(u,10000,'{"fuel":3}')
 on conflict(user_id) do update set gold=10000,inventory=jsonb_set(public.player_wallets.inventory,'{fuel}','3');
 r:=public.production_purchase('tin-grandpa-hearth',3,op);
 if (r->>'gold')::integer<>7600 or jsonb_array_length(r->'sites')<>3 then raise exception 'Purchase mismatch';end if;
 r:=public.production_purchase('tin-grandpa-hearth',3,op);
 if not (r->>'replayed')::boolean or jsonb_array_length(r->'sites')<>3 or (r->>'gold')::integer<>7600 then raise exception 'Duplicate purchase';end if;
 select array_agg(id order by id) into ids from app_private.production_sites where user_id=u;
 perform set_config('request.jwt.claim.sub',stranger::text,true);
 begin
  perform public.production_materials(ids[1]::text);raise exception 'Other owner accepted';
 exception when others then if sqlerrm<>'PRODUCTION_NOT_OWNED' then raise;end if;end;
 perform set_config('request.jwt.claim.sub',u::text,true);
 begin
  perform public.production_action('start',gen_random_uuid(),'tin-grandpa-hearth','{"shared-drift-scrap-wood":4}');raise exception 'Ambiguous kind accepted';
 exception when others then if sqlerrm<>'PRODUCTION_SITE_REQUIRED' then raise;end if;end;
 insert into public.player_collectibles(user_id,species_id) select u,'shared-drift-scrap-wood' from generate_series(1,11);
 select jsonb_agg(jsonb_build_object('facility',id,'materials',jsonb_build_object('shared-drift-scrap-wood',4)) order by id) into steps from unnest(ids) id;
 begin
  perform public.production_bulk_action('start',gen_random_uuid(),steps,false);raise exception 'Insufficient batch accepted';
 exception when others then if sqlerrm<>'INSUFFICIENT_MATERIALS' then raise;end if;end;
 if exists(select 1 from app_private.production_sites where user_id=u and started_at is not null)
 or exists(select 1 from public.player_collectibles where user_id=u and consumed_at is not null) then raise exception 'Partial batch mutation';end if;
 insert into public.player_collectibles(user_id,species_id) values(u,'shared-drift-scrap-wood');
 op:=gen_random_uuid();perform public.production_bulk_action('start',op,steps,false);
 r:=public.production_bulk_action('start',op,steps,false);
 if not (r->>'replayed')::boolean or (r->'receipt'->>'count')::integer<>3 then raise exception 'Batch replay mismatch';end if;
 update app_private.production_sites set started_at=clock_timestamp()-interval '2 hours',completes_at=clock_timestamp()-interval '1 hour',expires_at=clock_timestamp()+interval '1 hour' where id=ids[1];
 update app_private.production_sites set started_at=clock_timestamp()-interval '2 hours',completes_at=clock_timestamp()-interval '1 hour',expires_at=clock_timestamp()-interval '1 minute' where id=ids[2];
 op:=gen_random_uuid();r:=public.production_action('claim',op,ids[1]::text);
 if (r->>'fuel')::integer<>4 then raise exception 'Claim fuel mismatch';end if;
 r:=public.production_action('claim',op,ids[1]::text);
 if (r->>'fuel')::integer<>4 or not (r->>'replayed')::boolean then raise exception 'Duplicate claim';end if;
 r:=public.production_bulk_action('discard',gen_random_uuid(),jsonb_build_array(jsonb_build_object('facility',ids[2],'materials','{}'::jsonb)),false);
 if (r->>'fuel')::integer<>4 or (select count(*) from app_private.production_sites where user_id=u and started_at is not null)<>1 then raise exception 'Sibling site affected';end if;
 begin
  perform public.production_purchase('tin-grandpa-hearth',100,gen_random_uuid());raise exception 'Unaffordable batch accepted';
 exception when others then if sqlerrm<>'INSUFFICIENT_GOLD' then raise;end if;end;
 if (select count(*) from app_private.production_sites where user_id=u)<>3 then raise exception 'Partial purchase';end if;
 if has_function_privilege('anon','public.production_purchase(text,integer,uuid)','execute')
 or has_function_privilege('authenticated','app_private.production_apply(text,uuid,text,jsonb,boolean)','execute')
 or has_function_privilege('authenticated','app_private.production_site(text)','execute') then raise exception 'Unexpected privilege';end if;
end $audit$;
rollback;
select 'PASS: multi-purchase, retries, ownership, instance isolation, atomic bulk material consumption and receipt. All synthetic changes rolled back.' as result;
