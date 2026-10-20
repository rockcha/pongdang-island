// @vitest-environment node
import { afterAll, afterEach, beforeAll, beforeEach, expect, it } from 'vitest'
import { createLocalDatabase, replayMigrations } from '../scripts/db/local.mjs'
let db, rare, common
const me='00000000-0000-0000-0000-000000008701',other='00000000-0000-0000-0000-000000008702'
async function call(offset=0,query='',kind='all',rarity='all',concept='all',owner=me){
 await db.exec('savepoint storage_call;set role authenticated')
 try{await db.query("select set_config('request.jwt.claim.sub',$1,false)",[owner]);return (await db.query('select public.collectible_storage_filtered($1,$2,$3,$4,$5) s',[offset,query,kind,rarity,concept])).rows[0].s}
 catch(e){await db.exec('rollback to storage_call');throw e}finally{await db.exec('reset role;release storage_call')}
}
beforeAll(async()=>{db=await createLocalDatabase();await replayMigrations(db)
 rare=(await db.query("select id,name from public.collectible_species where kind='fish' and rarity='rare' and native_region_id='mukhyang' limit 1")).rows[0]
 common=(await db.query("select id from public.collectible_species where kind='fish' and rarity='common' and native_region_id is null limit 1")).rows[0]
},60000)
beforeEach(async()=>{await db.exec('begin')
 for(const [id,name]of [[me,'해역필터'],[other,'다른보관함']]){await db.query('insert into auth.users(id) values($1)',[id]);await db.query('insert into public.player_profiles(id,nickname) values($1,$2)',[id,name])}
 await db.query('insert into public.player_collectibles(user_id,species_id) select $1,$2 from generate_series(1,55)',[me,rare.id])
 await db.query('insert into public.player_collectibles(user_id,species_id) values($1,$2)',[me,common.id])
 await db.query('insert into public.player_collectibles(user_id,species_id) values($1,$2)',[other,rare.id])
})
afterEach(async()=>{await db.exec('rollback')});afterAll(async()=>{await db?.close()})
it('filters before pagination and counts matching storage across all pages',async()=>{
 const first=await call(0,'','fish','rare','mukhyang'),second=await call(50,'','fish','rare','mukhyang')
 expect(first.total).toBe(55);expect(first.items).toHaveLength(50);expect(second.items).toHaveLength(5)
 expect(new Set([...first.items,...second.items].map(i=>i.id)).size).toBe(55)
 expect(first.items.every(i=>i.user_id===me&&i.species.native_region_id==='mukhyang'&&i.species.rarity==='rare')).toBe(true)
})
it('combines concept, rarity, kind and name without including unrelated common species',async()=>{
 expect((await call(0,rare.name,'fish','rare','mukhyang')).total).toBe(55)
 const shared=await call(0,'','all','all','common')
 expect(shared.total).toBe(1);expect(shared.items[0].species.native_region_id).toBeNull()
 expect((await call(0,'','fish','rare','common')).total).toBe(0)
 expect((await call(0,'','trash','all','mukhyang')).total).toBe(0)
 expect((await call(0,'없는 개체','all','all','mukhyang')).total).toBe(0)
})
it('excludes displayed and sold items and rejects unknown filter values',async()=>{
 const tank=crypto.randomUUID()
 await db.query("insert into public.aquarium_tanks(id,user_id,name) values($1,$2,'필터 어항')",[tank,me])
 await db.query('update public.player_collectibles set tank_id=$1 where id=(select id from public.player_collectibles where user_id=$2 and species_id=$3 limit 1)',[tank,me,rare.id])
 await db.query('update public.player_collectibles set sold_at=now() where id=(select id from public.player_collectibles where user_id=$1 and species_id=$2 and tank_id is null limit 1)',[me,rare.id])
 expect((await call(0,'','all','all','mukhyang')).total).toBe(53)
 await expect(call(0,'','all','all','missing-region')).rejects.toThrow('INVALID_STORAGE_QUERY')
 await expect(call(0,'','all','legend','all')).rejects.toThrow('INVALID_STORAGE_QUERY')
 await expect(call(-1)).rejects.toThrow('INVALID_STORAGE_QUERY')
})
it('keeps storage scoped to the caller and denies anonymous execution',async()=>{
 expect((await call(0,'','all','rare','mukhyang',other)).total).toBe(1)
 expect((await db.query("select has_function_privilege('anon','public.collectible_storage_filtered(integer,text,text,text,text)','execute') allowed")).rows[0].allowed).toBe(false)
 await expect(call(0,'','all','all','all','')).rejects.toThrow('AUTH_REQUIRED')
})
