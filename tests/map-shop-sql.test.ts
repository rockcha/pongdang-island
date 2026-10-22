// @vitest-environment node
import {beforeAll,afterAll,beforeEach,afterEach,it,expect} from 'vitest'
import {createLocalDatabase,replayMigrations,readCatalog,canonical} from '../scripts/db/local.mjs'
import {readFileSync} from 'node:fs'
let db:Awaited<ReturnType<typeof createLocalDatabase>>
const uid='00000000-0000-0000-0000-000000054146',op='00000000-0000-0000-0000-000000054147'
beforeAll(async()=>{db=await createLocalDatabase();await replayMigrations(db)},60000)
afterAll(async()=>{await db?.close()})
beforeEach(async()=>{
 await db.exec(`begin;insert into auth.users(id) values('${uid}');insert into public.player_wallets(user_id,gold) values('${uid}',10000);`)
 await db.query("select set_config('request.jwt.claim.sub',$1,true)",[uid])
})
afterEach(async()=>{await db.exec('rollback;reset role;')})
async function rejects(sql:string,args:unknown[],message:string){
 await db.exec('savepoint rejected_call')
 await expect(db.query(sql,args)).rejects.toThrow(message)
 await db.exec('rollback to savepoint rejected_call;release savepoint rejected_call;')
}
it('charges once, unlocks immediately, and rejects cross-item replay and repeat purchase',async()=>{
 await db.exec('set local role authenticated')
 const first=(await db.query('select public.buy_region_map($1,$2) as r',['coral',op])).rows[0].r
 expect(first).toMatchObject({gold:9500,delta:-500})
 expect((await db.query('select public.buy_region_map($1,$2) as r',['coral',op])).rows[0].r).toMatchObject({gold:9500,delta:0})
 const shop=(await db.query('select public.map_shop_state() as r')).rows[0].r
 expect(shop.items.find((m:{region_id:string})=>m.region_id==='coral').owned).toBe(true)
 expect(shop.items.every((m:object)=>!('rarity' in m))).toBe(true)
 expect(shop.items.map((m:{region_id:string})=>m.region_id)).toEqual((await db.query('select m.region_id from public.region_maps m join public.regions r on r.id=m.region_id order by r.sort_order,r.id')).rows.map(r=>r.region_id))
 expect((await db.query('select public.region_map() as r')).rows[0].r.regions.find((r:{id:string})=>r.id==='coral')).toMatchObject({unlocked:true})
 await db.exec('reset role')
 expect((await db.query('select * from public.player_collectibles where user_id=$1',[uid])).rows).toHaveLength(0)
 await rejects('select public.buy_region_map($1,$2)',['primal',op],'OPERATION_CONFLICT')
 await rejects('select public.buy_region_map($1,gen_random_uuid())',['coral'],'MAP_ALREADY_OWNED')
})
it('preserves old unlocks and blocks insufficient funds and direct writes',async()=>{
 await db.query('insert into public.player_map_fragments(user_id,region_id) values($1,$2)',[uid,'primal'])
 expect((await db.query('select public.map_shop_state() as r')).rows[0].r.items.find((m:{region_id:string})=>m.region_id==='primal').owned).toBe(true)
 await db.query('update public.player_wallets set gold=1 where user_id=$1',[uid])
 await rejects('select public.buy_region_map($1,$2)',['coral',op],'INSUFFICIENT_GOLD')
 expect((await db.query('select gold from public.player_wallets where user_id=$1',[uid])).rows[0].gold).toBe(1)
 await db.exec('set local role authenticated')
 await expect(db.exec("update public.region_maps set price=1")).rejects.toThrow('permission denied')
})
it('never fishes maps even on a former map-gate roll and omits maps from the book and map rarity from the harbor',async()=>{
 for(const rarity of ['common','rare','epic','mythic'])for(const roll of [0,499,500,9999]){
  const rows=(await db.query("select s.kind from app_private.pick_regional_collectible('primal',$1,false,$2) p join public.collectible_species s on s.id=p.species_id",[rarity,roll])).rows
  expect(rows).toHaveLength(1)
  expect(['fish','trash']).toContain(rows[0].kind)
 }
 const collection=(await db.query('select public.collection_state() as r')).rows[0].r
 expect(collection.catalog.every((s:{kind:string})=>s.kind!=='map')).toBe(true)
 const regions=(await db.query('select public.region_map() as r')).rows[0].r.regions
 expect(regions.every((s:object)=>!('rarity' in s))).toBe(true)
 expect('mapChanceBp' in (await db.query('select public.fishing_state() as r')).rows[0].r).toBe(false)
 expect(canonical(await readCatalog(db))).toBe(canonical(JSON.parse(readFileSync('supabase/catalog/catalog.json','utf8'))))
})
