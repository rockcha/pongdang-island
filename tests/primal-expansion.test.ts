// @vitest-environment node
import {beforeAll,afterAll,it,expect} from 'vitest'
import {readFileSync,existsSync,readdirSync} from 'node:fs'
import plan from '../artifacts/primal-expansion-plan.json'
import {createLocalDatabase,replayMigrations} from '../scripts/db/local.mjs'
import {primalPlantAsset,primalPlantFrame} from '../src/features/aquarium/primal-plants'
import {mythicSwimAsset,mythicSwimFrame,mythicSwimLayout} from '../src/features/aquarium/mythic-swim'
import {swimFrameLayout} from '../src/features/aquarium/swim-frame-layout'
const sql=readFileSync('supabase/migrations/20261017045143_primal_prehistoric_species.sql','utf8')
let db:Awaited<ReturnType<typeof createLocalDatabase>>
beforeAll(async()=>{db=await createLocalDatabase();await replayMigrations(db)},60000)
afterAll(async()=>{await db?.close()})
it('registers all 34 selections at their requested rarity exclusively in primal',async()=>{
 expect(plan.filter(s=>!('kind' in s))).toHaveLength(20)
 expect(plan.filter(s=>'kind' in s)).toHaveLength(14)
 for(const s of plan){
  expect((await db.query('select name,rarity,kind,native_region_id from public.collectible_species where id=$1',[s.id])).rows[0]).toEqual({name:s.name,rarity:s.rarity,kind:'kind' in s?'decoration':'fish',native_region_id:'primal'})
  expect((await db.query('select region_id from public.collectible_habitats where species_id=$1',[s.id])).rows).toEqual([{region_id:'primal'}])
 }
})
it('reapplying the scoped SQL preserves other catalog rows and player property',async()=>{
 const uid='00000000-0000-0000-0000-000000045143'
 await db.query('insert into auth.users(id) values($1)',[uid])
 await db.query('insert into public.player_wallets(user_id,gold) values($1,987)',[uid])
 await db.query("insert into public.player_collectibles(user_id,species_id) values($1,'shelljaw-placodus')",[uid])
 const before=(await db.query('select * from public.player_collectibles where user_id=$1',[uid])).rows
 const species=(await db.query("select * from public.collectible_species where native_region_id is distinct from 'primal' order by id")).rows
 await db.exec(sql)
 expect((await db.query('select * from public.player_collectibles where user_id=$1',[uid])).rows).toEqual(before)
 expect((await db.query('select gold from public.player_wallets where user_id=$1',[uid])).rows[0].gold).toBe(987)
 expect((await db.query("select * from public.collectible_species where native_region_id is distinct from 'primal' order by id")).rows).toEqual(species)
})
it('bundles fixed plant animations without changing static decoration DB constraints',()=>{
 for(const s of plan.filter(s=>'plant' in s)){
  expect(primalPlantAsset(s.id,'decoration')?.path).toContain(s.id+'_sprite.png')
  expect(primalPlantAsset(s.id,'fish')).toBeNull()
  expect(primalPlantFrame(s.id,2,true)).toBe(0)
  expect(primalPlantFrame(s.id,2,false,true)).toBe(0)
  expect(new Set(Array.from({length:40},(_,i)=>primalPlantFrame(s.id,i/10))).size).toBe(4)
 }
 expect(primalPlantAsset('pink-scallop','decoration')).toBeNull()
})
it('ships every thumbnail and all 23 animated sheets with square cells',()=>{
 const batch='assets/storage-upload/new/20261017-135100'
 let sheets=0
 for(const s of plan){
  const folder=s.rarity==='common'?'normal':s.rarity,prefix=`${batch}/${'kind' in s?'decorations':'fish'}/${folder}/${s.id}`
  expect(existsSync(prefix+'_thumbnail.png'),s.id).toBe(true)
  if(!('kind' in s)||'plant' in s){
   const png=readFileSync(prefix+'_sprite.png');expect(png.readUInt32BE(16)/(s.rarity==='mythic'?4:2)).toBe(png.readUInt32BE(20)/2);sheets++
  }
 }
 expect(sheets).toBe(23)
 expect(readdirSync('public/aquarium/plants').length).toBeGreaterThanOrEqual(3)
})
it('uses measured rigid anchors in every frame and the six-second Plios action',()=>{
 const reports=JSON.parse(readFileSync('assets/storage-upload/new/20261017-135100/body-registration.json','utf8'))
 for(const r of reports){
  const mythic=r.id==='plios-blackwave-king',cell=r.width/r.columns
  const path=mythic?mythicSwimAsset(r.storage_path,'mythic')!.path:r.storage_path
  const points=r.frames.map((f:{frame:number;dx:number;dy:number})=>{
   const l=mythic?mythicSwimLayout(path,f.frame)!:swimFrameLayout(path,f.frame)
   return [(r.patch[0]+f.dx-l.originX*cell)*l.scale,(r.patch[1]+f.dy-l.originY*cell)*l.scale]
  })
  for(const p of points){expect(p[0],r.id).toBeCloseTo(points[0][0]);expect(p[1],r.id).toBeCloseTo(points[0][1])}
 }
 const path=mythicSwimAsset('fish/mythic/plios-blackwave-king_sprite.png','mythic')!.path
 for(const time of [0,1,3.5,5.9])expect(mythicSwimFrame(path,time,0)).toBe(mythicSwimFrame(path,time+6,0))
})
