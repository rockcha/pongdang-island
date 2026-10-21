// @vitest-environment node
import {afterAll,beforeAll,expect,it} from 'vitest'
import {readFileSync} from 'node:fs'
import {createHash} from 'node:crypto'
import {createLocalDatabase,migrationFiles,readSql} from '../scripts/db/local.mjs'
import {swimFrameLayout} from '@/features/aquarium/swim-frame-layout'
import {mythicSwimLayout} from '@/features/aquarium/mythic-swim'
const migration='20261021025451_shared_collectibles_and_tall_decorations.sql'
const batch='assets/storage-upload/new/20261021-115454'
const plan=JSON.parse(readFileSync('artifacts/shared-collectibles-expansion-plan.json','utf8')).species
const ids=plan.map(s=>s.id)
let db:Awaited<ReturnType<typeof createLocalDatabase>>,before:unknown[]
beforeAll(async()=>{
 db=await createLocalDatabase()
 for(const file of migrationFiles().filter(file=>file<migration))await db.exec(readSql('supabase/migrations/'+file))
 before=(await db.query('select * from public.collectible_species order by id')).rows
 await db.exec(readSql('supabase/migrations/'+migration))
},60000)
afterAll(async()=>{await db?.close()})
it('adds all 30 requested common-habitat collectibles without changing existing species, even on retry',async()=>{
 const rows=(await db.query('select id,kind,rarity,native_region_id from public.collectible_species where id=any($1::text[]) order by id',[ids])).rows
 expect(rows).toHaveLength(30)
 expect(rows.filter(s=>s.kind==='fish')).toHaveLength(10)
 expect(rows.filter(s=>s.kind==='decoration')).toHaveLength(11)
 expect(rows.filter(s=>s.kind==='trash')).toHaveLength(9)
 expect(rows.every(s=>s.native_region_id===null)).toBe(true)
 const regions=(await db.query('select id from public.regions order by id')).rows.map(r=>r.id)
 for(const id of ids)expect((await db.query('select region_id from public.collectible_habitats where species_id=$1 order by region_id',[id])).rows.map(r=>r.region_id)).toEqual(regions)
 expect(rows.find(s=>s.id==='unopened-time-capsule')).toMatchObject({kind:'trash',rarity:'epic'})
 await db.exec(readSql('supabase/migrations/'+migration))
 expect((await db.query('select * from public.collectible_species where not(id=any($1::text[])) order by id',[ids])).rows).toEqual(before)
 expect((await db.query('select count(*)::int n from public.collectible_habitats where species_id=any($1::text[])',[ids])).rows[0].n).toBe(30*regions.length)
})
it('ships transparent square thumbnails and actual creature sheets with recorded hashes',()=>{
 const manifest=JSON.parse(readFileSync(batch+'/manifest.json','utf8'))
 expect(manifest.entries.filter(e=>e.type==='thumbnail')).toHaveLength(30)
 expect(manifest.entries.filter(e=>e.type==='sprite')).toHaveLength(10)
 for(const e of manifest.entries){
  const png=readFileSync(batch+'/'+e.storage_path)
  expect(createHash('sha256').update(png).digest('hex'),e.storage_path).toBe(e.sha256)
  const ratio=e.type==='sprite'&&e.rarity==='mythic'?2:1
  expect(png.readUInt32BE(16)/png.readUInt32BE(20),e.storage_path).toBe(ratio)
  expect(e.review.transparent,e.storage_path).toBe(true)
  if(e.storage_path.startsWith('fish/'))expect(e.review.facing).toBe('right')
 }
})
it('keeps all poses inside their cells and registers rigid body anchors without frame scaling',()=>{
 const read=(name:string)=>JSON.parse(readFileSync(batch+'/'+name,'utf8').replace(/^\uFEFF/,''))
 for(const grade of ['normal','rare','epic','mythic'])for(const sheet of read(grade+'-audit.json').sprites){
  for(const f of sheet.frames)expect(Math.min(f.x,f.y,sheet.cellWidth-f.x-f.width,sheet.cellHeight-f.y-f.height)).toBeGreaterThan(8)
 }
 for(const file of ['anchor-registration.json','mythic-anchor-registration.json'])for(const reg of read(file)){
  // The school intentionally rearranges its members; it has no rigid body patch.
  if(reg.storage_path.includes('borrowed-body-shoal'))continue
  const positions=reg.frames.map(f=>{
   const layout=mythicSwimLayout(reg.storage_path,f.frame)??swimFrameLayout(reg.storage_path,f.frame)
   return [(reg.patch[0]+f.dx-layout.originX*512)*layout.scale,(reg.patch[1]+f.dy-layout.originY*512)*layout.scale,layout.scale]
  })
  for(const p of positions){expect(p[0]).toBeCloseTo(positions[0][0]);expect(p[1]).toBeCloseTo(positions[0][1]);expect(p[2]).toBe(positions[0][2])}
 }
})
