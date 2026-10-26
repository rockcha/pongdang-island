// @vitest-environment node
import {readFileSync} from 'node:fs'
import {expect,it} from 'vitest'
import {createLocalDatabase,replayMigrations} from '../scripts/db/local.mjs'
it('disables only the two affected discounts, excludes draws, refuses owned equipment and preserves ownership',async()=>{
 const db=await createLocalDatabase()
 try{
  await replayMigrations(db)
  const rows=await db.query("select id,enabled from public.fishing_relics where effect_kind='boat_discount_gold' order by id")
  expect(rows.rows).toEqual([{id:'golden-anchor-seal',enabled:false},{id:'old-captain-seal',enabled:true},{id:'sea-king-shipwright-edict',enabled:false}])
  await db.exec(`begin;do $test$
   declare u uuid:=gen_random_uuid();fresh uuid:=gen_random_uuid();r text;before_gold bigint;
   begin
    insert into auth.users(id) values(u),(fresh);
    insert into public.player_profiles(id,nickname) values(u,'할인유물검증'),(fresh,'추첨제외검증');
    insert into public.player_wallets(user_id,gold,inventory) values(u,10000,'{}') on conflict(user_id) do update set gold=10000;
    insert into app_private.player_fishing_relics(user_id,relic_id) values(u,'golden-anchor-seal'),(u,'sea-king-shipwright-edict'),(u,'old-captain-seal');
    perform set_config('request.jwt.claim.sub',u::text,true);
    for r in select unnest(array['golden-anchor-seal','sea-king-shipwright-edict']) loop
     begin perform public.equip_relic(r,gen_random_uuid(),0);raise exception 'DISABLED_EQUIP_ALLOWED';exception when raise_exception then if sqlerrm<>'RELIC_NOT_OWNED' then raise;end if;end;
    end loop;
    if (select gold from public.player_wallets where user_id=u)<>10000 then raise exception 'FAILED_EQUIP_CHARGED';end if;
    perform public.equip_relic('old-captain-seal',gen_random_uuid(),0);
    if app_private.relic_bonus('boat_discount_gold')<>50 then raise exception 'SMALL_DISCOUNT_BROKEN';end if;
    perform set_config('request.jwt.claim.sub',fresh::text,true);
    if exists(select 1 from app_private.fishing_discovery_candidates('epic') where reward_id='golden-anchor-seal') or exists(select 1 from app_private.fishing_discovery_candidates('mythic') where reward_id='sea-king-shipwright-edict') then raise exception 'DISABLED_DRAW_ALLOWED';end if;
    if not exists(select 1 from app_private.fishing_discovery_candidates('rare') where reward_id='old-captain-seal') then raise exception 'SMALL_DISCOUNT_REMOVED';end if;
    if (select count(*) from app_private.player_fishing_relics where user_id=u)<>3 then raise exception 'OWNERSHIP_REMOVED';end if;
   end $test$;rollback;`)
  // Reapplying the catalog patch must remove stale equipment without taking away the relic.
  await db.exec(`begin;do $test$ declare u uuid:=gen_random_uuid();begin
   insert into auth.users(id) values(u);insert into public.player_profiles(id,nickname) values(u,'중단장착해제검증');
   insert into app_private.player_fishing_relics(user_id,relic_id) values(u,'golden-anchor-seal');
   insert into app_private.player_relic_loadouts(user_id,relic_id) values(u,'golden-anchor-seal');end $test$;commit;`)
  await db.exec(readFileSync('supabase/migrations/20261026164702_disable_two_boat_discount_relics.sql','utf8'))
  expect((await db.query("select count(*)::int n from app_private.player_relic_loadouts where relic_id in ('golden-anchor-seal','sea-king-shipwright-edict')")).rows[0].n).toBe(0)
  expect((await db.query("select count(*)::int n from app_private.player_fishing_relics where relic_id='golden-anchor-seal'")).rows[0].n).toBe(1)
 }finally{await db.close()}
},120000)
