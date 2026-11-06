// @vitest-environment node
import {afterAll,afterEach,beforeAll,beforeEach,expect,it} from 'vitest'
import {createLocalDatabase,replayMigrations} from '../scripts/db/local.mjs'
let db:any,uid:string,relics:any[]
const call=async(action:string,inputs:unknown,op=crypto.randomUUID())=>{
 await db.exec('set role authenticated')
 const result=(await db.query('select public.recycle_relics($1,$2,$3) s',[action,inputs,op])).rows[0].s
 await db.exec('reset role');return result
}
async function reject(action:string,inputs:unknown,message:string,op=crypto.randomUUID()){
 await db.exec('savepoint invalid_request')
 try{await expect(call(action,inputs,op)).rejects.toThrow(message)}finally{await db.exec('rollback to invalid_request;reset role;release savepoint invalid_request')}
}
async function quantity(id:string){return (await db.query('select quantity from app_private.player_fishing_relics where user_id=$1 and relic_id=$2',[uid,id])).rows[0]?.quantity??0}
beforeAll(async()=>{db=await createLocalDatabase();await replayMigrations(db);relics=(await db.query('select * from public.fishing_relics where enabled order by id')).rows},60000)
afterAll(async()=>{await db?.close()})
beforeEach(async()=>{
 await db.exec('begin');uid=crypto.randomUUID();await db.query('insert into auth.users(id) values($1)',[uid])
 await db.query("insert into public.player_profiles(id,nickname) values($1,'재조합테스트')",[uid])
 await db.query("select set_config('request.jwt.claim.sub',$1,true)",[uid])
 await db.query('insert into public.player_wallets(user_id,gold) values($1,0) on conflict(user_id) do update set gold=0',[uid])
 await db.query('insert into app_private.player_fishing_relics(user_id,relic_id,quantity) select $1,id,6 from public.fishing_relics where enabled',[uid])
 await db.query("update app_private.player_fishing_relics p set quantity=8 from public.fishing_relics r where p.user_id=$1 and p.relic_id=r.id and r.rarity='rare'",[uid])
})
afterEach(async()=>{await db.exec('rollback;reset role')})
it('exchanges eight mixed rare copies for one enabled epic, keeps discoveries, and replays without another roll',async()=>{
 const rare=relics.filter(r=>r.rarity==='rare').slice(0,2),op=crypto.randomUUID(),inputs=rare.map(r=>({id:r.id,quantity:4}))
 const first=await call('recombine',inputs,op),reward=first.relics.find(r=>r.id===first.recycling.receivedIds[0])
 expect(first.recycling).toMatchObject({action:'recombine',cost:0,unequipped:false});expect(reward.rarity).toBe('epic');expect(reward.quantity).toBe(7)
 for(const r of rare)expect(await quantity(r.id)).toBe(4)
 const repeat=await call('recombine',inputs.toReversed(),op)
 expect(repeat.replayed).toBe(true);expect(repeat.recycling).toEqual(first.recycling);expect(await quantity(reward.id)).toBe(7)
 expect((await db.query('select count(*)::int n from app_private.player_fishing_relic_discoveries where user_id=$1',[uid])).rows[0].n).toBe(3)
 await reject('recombine',[{id:rare[0].id,quantity:6}],'OPERATION_CONFLICT',op)
 expect((await db.query('select gold from public.player_wallets where user_id=$1',[uid])).rows[0].gold).toBe(0)
 expect((await db.query('select delta from public.gold_transactions where user_id=$1',[uid])).rows).toEqual([{delta:0}])
})
it('accepts duplicate copies and produces a mythic from exactly six epic originals',async()=>{
 const material=relics.find(r=>r.rarity==='epic')
 const result=await call('recombine',[{id:material.id,quantity:2},{id:material.id,quantity:4}])
 expect(result.relics.find(r=>r.id===result.recycling.receivedIds[0]).rarity).toBe('mythic')
 expect(await quantity(material.id)).toBe(0)
 await reject('recombine',[{id:material.id,quantity:6}],'RELIC_MATERIAL_UNAVAILABLE')
})
it('rejects new six-copy rare upgrades and eight-copy epic upgrades without consuming materials',async()=>{
 const rare=relics.find(r=>r.rarity==='rare'),epic=relics.find(r=>r.rarity==='epic')
 await reject('recombine',[{id:rare.id,quantity:6}],'RELIC_RECOMBINATION_COUNT')
 await reject('recombine',[{id:epic.id,quantity:8}],'RELIC_RECOMBINATION_COUNT')
 expect(await quantity(rare.id)).toBe(8);expect(await quantity(epic.id)).toBe(6)
 expect(rare.sell_price*8).toBeGreaterThan(epic.sell_price)
})
it('accepts eight distinct rare originals and awards only one epic',async()=>{
 const rare=relics.filter(r=>r.rarity==='rare').slice(0,8)
 expect(rare).toHaveLength(8)
 const result=await call('recombine',rare.map(r=>({id:r.id,quantity:1})))
 expect(result.recycling.receivedIds).toHaveLength(1)
 expect(result.relics.find(r=>r.id===result.recycling.receivedIds[0]).rarity).toBe('epic')
 for(const r of rare)expect(await quantity(r.id)).toBe(7)
})
it('replays a historical six-rare receipt after the nerf without rerolling or consuming more copies',async()=>{
 const rare=relics.find(r=>r.rarity==='rare'),epic=relics.find(r=>r.rarity==='epic'),op=crypto.randomUUID(),inputs=[{id:rare.id,quantity:6}]
 const result={action:'recombine',cost:0,consumed:inputs,receivedIds:[epic.id],unequipped:false}
 await db.query("insert into app_private.relic_recycling_operations(user_id,operation_id,action,inputs,result) values($1,$2,'recombine',$3,$4)",[uid,op,JSON.stringify(inputs),JSON.stringify(result)])
 const replay=await call('recombine',inputs,op)
 expect(replay.replayed).toBe(true);expect(replay.recycling).toEqual(result)
 expect(await quantity(rare.id)).toBe(8);expect(await quantity(epic.id)).toBe(6)
})
it('protects the equipped copy while allowing eight spare rare copies',async()=>{
 const material=relics.find(r=>r.rarity==='rare')
 await db.query('insert into app_private.player_relic_loadouts(user_id,relic_id) values($1,$2)',[uid,material.id])
 await reject('recombine',[{id:material.id,quantity:8}],'RELIC_MATERIAL_UNAVAILABLE')
 await db.query('update app_private.player_fishing_relics set quantity=9 where user_id=$1 and relic_id=$2',[uid,material.id])
 const result=await call('recombine',[{id:material.id,quantity:8}])
 expect(await quantity(material.id)).toBe(1);expect(result.equippedId).toBe(material.id)
})
it('rejects wrong grades, disabled relics, fabricated counts and unowned crafted relics without losing materials',async()=>{
 const rare=relics.find(r=>r.rarity==='rare'),epic=relics.find(r=>r.rarity==='epic'),mythic=relics.find(r=>r.rarity==='mythic')
 await reject('recombine',[{id:rare.id,quantity:3},{id:epic.id,quantity:3}],'RELIC_RECOMBINATION_GRADE')
 await reject('recombine',[{id:mythic.id,quantity:6}],'RELIC_RECOMBINATION_COUNT')
 for(const inputs of [null,{},[],[{id:rare.id,quantity:1.5}],[{id:rare.id,quantity:'6'}],[{id:rare.id,quantity:-6}],[{id:rare.id,quantity:99}]])await reject('recombine',inputs,'INVALID_RECYCLING_REQUEST')
 await reject('recombine',[{id:rare.id,quantity:5}],'RELIC_RECOMBINATION_COUNT')
 const disabled=(await db.query('select id from public.fishing_relics where not enabled limit 1')).rows[0].id
 await reject('recombine',[{id:disabled,quantity:6}],'RELIC_RECOMBINATION_GRADE')
 await reject('recombine',[{id:'crafted-fake',quantity:6}],'RELIC_RECOMBINATION_GRADE')
 await reject('dismantle',[{id:'crafted-fake',quantity:1}],'RELIC_CRAFTED_NOT_OWNED')
 expect(await quantity(rare.id)).toBe(8)
})
it('dismantles an equipped crafted relic for free, returns both originals exactly once and preserves existing discoveries',async()=>{
 const a=relics.find(r=>r.id==='shell-hourglass'),b=relics.find(r=>r.id==='fish-calling-bell'),op=crypto.randomUUID()
 const id=(await db.query('insert into app_private.crafted_relics(user_id,base_id,attached_id) values($1,$2,$3) returning id',[uid,a.id,b.id])).rows[0].id
 await db.query('insert into app_private.player_relic_loadouts(user_id,crafted_id) values($1,$2)',[uid,id])
 const input=[{id,quantity:1}],result=await call('dismantle',input,op)
 expect(result.recycling).toMatchObject({cost:0,receivedIds:[a.id,b.id],unequipped:true});expect(result.equippedId).toBeNull()
 expect(result.relics.some(r=>r.id===id)).toBe(false);expect(await quantity(a.id)).toBe(9);expect(await quantity(b.id)).toBe(9)
 expect((await call('dismantle',input,op)).replayed).toBe(true)
 expect(await quantity(a.id)).toBe(9)
 await reject('dismantle',input,'RELIC_CRAFTED_NOT_OWNED')
 await db.exec('savepoint original_craft')
 await db.exec('set role authenticated');await expect(db.query('select public.craft_relic($1,$2,$3)',[a.id,b.id,op])).rejects.toThrow('OPERATION_CONFLICT');await db.exec('rollback to original_craft;reset role;release savepoint original_craft')
 expect((await db.query('select gold from public.player_wallets where user_id=$1',[uid])).rows[0].gold).toBe(0)
})
it('blocks anonymous callers, another player dismantling, and direct receipt or inventory writes',async()=>{
 const original=relics.find(r=>r.rarity==='rare'),other=crypto.randomUUID();await db.query('insert into auth.users(id) values($1)',[other])
 const id=(await db.query('insert into app_private.crafted_relics(user_id,base_id,attached_id) values($1,$2,$3) returning id',[other,relics[0].id,relics[1].id])).rows[0].id
 await reject('dismantle',[{id,quantity:1}],'RELIC_CRAFTED_NOT_OWNED')
 await db.exec('savepoint anon;set role anon');await expect(db.query('select public.recycle_relics($1,$2,$3)',['recombine',[{id:original.id,quantity:6}],crypto.randomUUID()])).rejects.toThrow('permission denied');await db.exec('rollback to anon;reset role;release savepoint anon')
 const permissions=(await db.query("select has_table_privilege('authenticated','app_private.relic_recycling_operations','SELECT') as read,has_table_privilege('authenticated','app_private.player_fishing_relics','UPDATE') as write,(select prosecdef from pg_proc where oid='public.recycle_relics(text,jsonb,uuid)'::regprocedure) as definer")).rows[0]
 expect(permissions).toEqual({read:false,write:false,definer:false})
})
it('keeps production capacity protected during free dismantling and permits it after production finishes',async()=>{
 const id=(await db.query("insert into app_private.crafted_relics(user_id,base_id,attached_id) values($1,'primordial-ember','fish-calling-bell') returning id",[uid])).rows[0].id
 await db.query('insert into app_private.player_relic_loadouts(user_id,crafted_id) values($1,$2)',[uid,id])
 await db.query("insert into app_private.production_sites(user_id,facility_id,started_at,completes_at,expires_at,run_output) select $1,'clockwork-compressor',now()-interval '1 minute',now()+interval '1 hour',now()+interval '2 hours',1 from generate_series(1,5)",[uid])
 await reject('dismantle',[{id,quantity:1}],'RELIC_FUEL_PRODUCTION_ACTIVE:4')
 expect((await db.query('select crafted_id from app_private.player_relic_loadouts where user_id=$1',[uid])).rows[0].crafted_id).toBe(id)
 await db.query("update app_private.production_sites set completes_at=clock_timestamp()-interval '1 second' where user_id=$1",[uid])
 const result=await call('dismantle',[{id,quantity:1}]);expect(result.equippedId).toBeNull()
 expect((await db.query('select gold from public.player_wallets where user_id=$1',[uid])).rows[0].gold).toBe(0)
})
it('shares only a server-proven recombined mythic and deduplicates posts',async()=>{
 const material=relics.find(r=>r.rarity==='epic'),op=crypto.randomUUID(),result=await call('recombine',[{id:material.id,quantity:6}],op),id=result.recycling.receivedIds[0]
 await db.exec('set role authenticated')
 const caught=(await db.query('select public.relic_showcase_catch($1) r',[id])).rows[0].r
 expect(caught).toMatchObject({operationId:op,regionName:'유물 재조합',species:{id:'relic-'+id,rarity:'mythic',kind:'relic'}})
 const post=(await db.query("select public.publish_fishing_showcase($1,'재조합 성공') id",[op])).rows[0].id
 expect((await db.query("select public.publish_fishing_showcase($1,'재시도') id",[op])).rows[0].id).toBe(post)
 await db.exec('reset role')
 expect((await db.query('select rarity,region_name from public.fishing_showcase_posts where id=$1',[post])).rows[0]).toEqual({rarity:'mythic',region_name:'유물 재조합'})
})

it('exchanges three mythics, allows the material itself as a reward, and replays exactly once',async()=>{
 const material=relics.find(r=>r.rarity==='mythic'),op=crypto.randomUUID()
 // Force the random pool to one valid candidate, including duplicate reward handling.
 await db.query("update public.fishing_relics set enabled=false where rarity='mythic' and id<>$1",[material.id])
 await db.query('insert into app_private.player_relic_loadouts(user_id,relic_id) values($1,$2)',[uid,material.id])
 await db.query('update app_private.player_fishing_relics set quantity=4 where user_id=$1 and relic_id=$2',[uid,material.id])
 const inputs=[{id:material.id,quantity:1},{id:material.id,quantity:2}]
 const first=await call('recombine',inputs,op)
 expect(first.recycling).toMatchObject({cost:0,receivedIds:[material.id],unequipped:false})
 expect(first.equippedId).toBe(material.id);expect(await quantity(material.id)).toBe(2)
 const again=await call('recombine',[{id:material.id,quantity:3}],op)
 expect(again.replayed).toBe(true);expect(again.recycling).toEqual(first.recycling)
 expect(await quantity(material.id)).toBe(2)
 await reject('recombine',[{id:material.id,quantity:3}],'RELIC_MATERIAL_UNAVAILABLE')
 expect(await quantity(material.id)).toBe(2)
})
it('requires the grade-specific total and rejects mixed mythics without consuming inventory',async()=>{
 const mythic=relics.find(r=>r.rarity==='mythic'),epic=relics.find(r=>r.rarity==='epic')
 for(const quantity of [2,4,6])await reject('recombine',[{id:mythic.id,quantity}],'RELIC_RECOMBINATION_COUNT')
 await reject('recombine',[{id:epic.id,quantity:3}],'RELIC_RECOMBINATION_COUNT')
 await reject('recombine',[{id:mythic.id,quantity:2},{id:epic.id,quantity:1}],'RELIC_RECOMBINATION_GRADE')
 expect(await quantity(mythic.id)).toBe(6);expect(await quantity(epic.id)).toBe(6)
})
