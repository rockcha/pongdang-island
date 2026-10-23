// @vitest-environment node
import {readFileSync} from 'node:fs'
import {beforeAll,afterAll,it,expect} from 'vitest'
import {createLocalDatabase,replayMigrations} from '../scripts/db/local.mjs'
import {mythicSwimAsset,mythicSwimFrame} from '../src/features/aquarium/mythic-swim'

const root='assets/storage-upload/new/20261023-212823'
const manifest=JSON.parse(readFileSync(root+'/manifest.json','utf8'))
const expansionRoot='assets/storage-upload/new/20261023-231240'
const expansion=JSON.parse(readFileSync(expansionRoot+'/manifest.json','utf8'))
const newSpecies=expansion.items.filter((s:{revision?:boolean})=>!s.revision)
let db:Awaited<ReturnType<typeof createLocalDatabase>>
beforeAll(async()=>{db=await createLocalDatabase();await replayMigrations(db)},60000)
afterAll(async()=>{await db.close()})

it('registers all 61 shared event species with explicit anatomy-based motion and prices',async()=>{
 const {rows}=await db.query("select * from public.collectible_species where starts_with(id,'halloween-') order by id")
 expect(rows).toHaveLength(61)
 expect(rows.map(s=>s.id)).toEqual([...manifest.items,...newSpecies].map(s=>s.id).sort())
 const counts:Record<string,number>={}
 for(const s of rows){
  counts[`${s.kind}/${s.rarity}`]=(counts[`${s.kind}/${s.rarity}`]??0)+1
  expect(s.native_region_id).toBeNull()
  expect(s.sell_price).toBeGreaterThan(0)
  expect(s.travel_direction).toBe('both')
  const added=newSpecies.find((e:{id:string})=>e.id===s.id)
  expect(s.movement_type).toBe(added?.movement_type??(s.kind==='fish'?['halloween-coffin-hermit-crab','halloween-sleepy-zombie-cory','halloween-one-horn-goblin-pleco'].includes(s.id)?'crawl':'swim':'fixed'))
  if(s.kind==='fish')expect(s.flip_with_direction).toBe(true)
 }
 expect(counts).toEqual({'fish/common':15,'fish/rare':10,'fish/epic':11,'fish/mythic':5,'trash/common':4,'trash/rare':6,'decoration/common':3,'decoration/rare':4,'decoration/epic':3})
 expect(rows.find(s=>s.id==='halloween-little-ghost-puffer')?.sell_price).toBe(225)
})

it('gates every new species at both KST boundaries without affecting ordinary catches',async()=>{
 for(const [at,available] of [['2026-10-23T23:59:59.999+09:00',false],['2026-10-24T00:00:00+09:00',true],['2026-10-31T23:59:59.999+09:00',true],['2026-11-01T00:00:00+09:00',false]] as const){
  const {rows}=await db.query("select count(*)::int n,bool_and(app_private.collectible_available_at(id,$1::timestamptz)=$2) correct from public.collectible_species where starts_with(id,'halloween-')",[at,available])
  expect(rows[0]).toEqual({n:61,correct:true})
 }
})

it('keeps the requested Halloween prices and rarity swaps idempotent',async()=>{
 const {rows}=await db.query("select id,sell_price,rarity from public.collectible_species where starts_with(id,'halloween-') order by id")
 const increases:Record<string,number>={common:10,epic:100,mythic:500}
 const swaps:Record<string,{rarity:string;sell_price:number}>={
  'halloween-coffin-hermit-crab':{rarity:'common',sell_price:70},
  'halloween-little-ghost-puffer':{rarity:'rare',sell_price:225},
  'halloween-sock-ghost-goby':{rarity:'rare',sell_price:245},
  'halloween-necromancer-glass-catfish':{rarity:'common',sell_price:54},
  'halloween-ghost-skirt-guppy':{rarity:'rare',sell_price:245},
 }
 for(const original of manifest.items){
  const extra=original.kind==='fish'?(increases[original.rarity]??0):0
  expect(rows.find(s=>s.id===original.id),original.id).toMatchObject(swaps[original.id]??{rarity:original.rarity,sell_price:original.sell_price+extra+(original.rarity==='epic'?200:0)})
 }
 for(const added of newSpecies)expect(rows.find(s=>s.id===added.id)?.sell_price,added.id).toBe(added.sell_price+(added.rarity==='epic'?200:0))
 const sql=readFileSync('supabase/migrations/20261023144733_halloween_values_rarities_and_grubby_magnet.sql','utf8')
 await db.exec(sql);await db.exec(sql)
 expect((await db.query("select id,sell_price,rarity from public.collectible_species where starts_with(id,'halloween-') order by id")).rows).toEqual(rows)
})

it('draws grubby magnet at exactly 99% common and 1% rare without epic draws',async()=>{
 const {rows}=await db.query("select app_private.resolve_regional_fishing('bait_grubby_magnet','pongdang',i)::text rarity,count(*)::int n from generate_series(0,9999) i group by 1 order by 1")
 expect(rows).toEqual([{rarity:'common',n:9900},{rarity:'rare',n:100}])
 const bait=(await db.query("select common_bp,rare_bp,epic_bp,mythic_bp from public.fishing_baits where id='bait_grubby_magnet'")).rows[0]
 expect(bait).toEqual({common_bp:9900,rare_bp:100,epic_bp:0,mythic_bp:0})
 expect((await db.query("select common_bp,rare_bp,epic_bp,mythic_bp from app_private.fishing_bait_balance_profiles where id='bait_grubby_magnet'")).rows[0]).toEqual(bait)
})

it('registers Crimson with eight safe original poses and verified rigid anchors',()=>{
 const creature=newSpecies.find((s:{rarity:string})=>s.rarity==='mythic')
 const r=JSON.parse(readFileSync(expansionRoot+'/registration.json','utf8').replace(/^\uFEFF/,'')).find((r:{id:string})=>r.id===creature.id)
 const cell=r.rawAudit.width/4
 for(const b of r.rawAudit.bounds)expect(Math.min(b[0],b[1],cell-b[0]-b[2],cell-b[1]-b[3])).toBeGreaterThanOrEqual(cell*.08)
 expect(r.frames).toHaveLength(8)
 for(const f of r.frames)expect(f.rmse).toBeLessThanOrEqual(60)
 const asset=mythicSwimAsset(creature.catalog_sprite_sheet_path,'mythic')!
 expect(asset).not.toBeNull()
 expect(mythicSwimFrame(asset.path,4.7,0,true)).toBe(0)
})

it('connects all four mythics to eight-frame sheets and keeps reviewed source margins',()=>{
 const read=(file:string)=>JSON.parse(readFileSync(root+'/'+file,'utf8').replace(/^\uFEFF/,''))
 const registration=read('registration.json')
 for(const s of manifest.items.filter(s=>s.rarity==='mythic')){
  const asset=mythicSwimAsset(s.catalog_sprite_sheet_path,s.rarity)
  expect(asset,s.id).not.toBeNull()
  const bytes=readFileSync('public'+asset!.url)
  expect(bytes.readUInt32BE(16)/bytes.readUInt32BE(20)).toBe(2)
  const r=registration.find(r=>r.id===s.id),cell=r.rawAudit.width/4
  for(const b of r.rawAudit.bounds)expect(Math.min(b[0],b[1],cell-b[0]-b[2],cell-b[1]-b[3])).toBeGreaterThanOrEqual(cell*.08)
  for(const f of r.frames)expect(f.rmse).toBeLessThanOrEqual(60)
  expect(mythicSwimFrame(asset!.path,4.7,0,true)).toBe(0)
  expect(new Set(Array.from({length:120},(_,i)=>mythicSwimFrame(asset!.path,i/20,0))).size).toBe(8)
 }
})
