// @vitest-environment node
import {beforeAll,afterAll,it,expect} from 'vitest'
import {createLocalDatabase,replayMigrations} from '../scripts/db/local.mjs'
let db:Awaited<ReturnType<typeof createLocalDatabase>>
beforeAll(async()=>{db=await createLocalDatabase();await replayMigrations(db)},60000)
afterAll(async()=>{await db.close()})
async function draw(ids:string[],region='coral',boost=1){
 await db.exec('select setseed(.42)')
 return (await db.query(`select case when not s.is_native then 'shared' when s.native_region_id=$2 then 'home' else 'away' end bucket,count(*)::int n
 from generate_series(1,4000) i cross join lateral (select app_private.pick_habitat_group($1::text[],$2,null,$3+0*i) id) q
 join public.collectible_species s on s.id=q.id group by bucket`,[ids,region,boost])).rows
}
it('keeps 35/60/5 group odds when the number of species per group changes',async()=>{
 const pool=(await db.query("select id,case when not is_native then 'shared' when native_region_id='coral' then 'home' else 'away' end bucket from public.collectible_species where kind in ('fish','trash') and rarity='rare' order by id")).rows
 const one=['home','shared','away'].map(bucket=>pool.find(p=>p.bucket===bucket)!.id)
 for(const ids of [one,pool.map(p=>p.id)]){
  const rows=await draw(ids)
  for(const [bucket,probability] of [['home',.35],['shared',.6],['away',.05]] as const){
   expect(Math.abs(rows.find(row=>row.bucket===bucket)!.n/4000-probability)).toBeLessThan(.035)
  }
 }
},60000)
it('redistributes absent groups, handles an empty pool, and preserves native bonuses',async()=>{
 const pool=(await db.query("select id,is_native,native_region_id from public.collectible_species where kind='fish' and rarity='rare'")).rows
 const home=pool.find(p=>p.native_region_id==='coral')!.id,shared=pool.find(p=>!p.is_native)!.id
 const rows=await draw([home,shared])
 expect(rows.some(row=>row.bucket==='away')).toBe(false)
 expect(Math.abs(rows.find(row=>row.bucket==='home')!.n/4000-35/95)).toBeLessThan(.035)
 expect((await db.query("select app_private.pick_habitat_group('{}','coral') id")).rows[0].id).toBeNull()
 const boosted=await draw([home,shared],'coral',3)
 expect(boosted.find(row=>row.bucket==='home')!.n).toBeGreaterThan(rows.find(row=>row.bucket==='home')!.n)
 expect((await db.query("select has_function_privilege('authenticated','app_private.pick_habitat_group(text[],text,text,numeric,boolean)','execute') allowed")).rows[0].allowed).toBe(false)
},60000)
