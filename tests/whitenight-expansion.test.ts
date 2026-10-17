// @vitest-environment node
import {beforeAll,afterAll,it,expect} from 'vitest'
import {readFileSync} from 'node:fs'
import {createHash} from 'node:crypto'
import {createLocalDatabase,replayMigrations,readCatalog,canonical} from '../scripts/db/local.mjs'
import plan from '../artifacts/whitenight-expansion-plan.json'
import {mythicSwimAsset,mythicSwimFrame,mythicSwimLayout} from '../src/features/aquarium/mythic-swim'
import {whitenightFixedFrame} from '../src/features/aquarium/whitenight-animation'
let db:Awaited<ReturnType<typeof createLocalDatabase>>
const root='assets/storage-upload/new/20261017-153200'
beforeAll(async()=>{db=await createLocalDatabase();await replayMigrations(db)},60000)
afterAll(async()=>{await db?.close()})
it('registers the exact 23 creatures and 9 decorations with exclusive native habitats',async()=>{
 expect(plan.filter(s=>!('kind'in s))).toHaveLength(23)
 expect(plan.filter(s=>'kind'in s)).toHaveLength(9)
 for(const s of plan){
  expect((await db.query('select name,rarity,kind,native_region_id from public.collectible_species where id=$1',[s.id])).rows[0]).toMatchObject({name:s.name,rarity:s.rarity,kind:'kind'in s?'decoration':'fish',native_region_id:'whitenight'})
  expect((await db.query('select region_id from public.collectible_habitats where species_id=$1',[s.id])).rows).toEqual([{region_id:'whitenight'}])
 }
 expect(canonical(await readCatalog(db))).toBe(canonical(JSON.parse(readFileSync('supabase/catalog/catalog.json','utf8'))))
})
it('preserves player gold and existing holdings when registration is repeated',async()=>{
 const uid='00000000-0000-0000-0000-000000064137'
 await db.query('insert into auth.users(id) values($1)',[uid]);await db.query('insert into public.player_wallets(user_id,gold) values($1,777)',[uid])
 await db.query("insert into public.player_collectibles(user_id,species_id) values($1,'silverfrost-herring')",[uid])
 const before=(await db.query('select * from public.player_collectibles where user_id=$1',[uid])).rows
 await db.exec(readFileSync('artifacts/whitenight-species-install.sql','utf8'))
 expect((await db.query('select * from public.player_collectibles where user_id=$1',[uid])).rows).toEqual(before)
 expect((await db.query('select gold from public.player_wallets where user_id=$1',[uid])).rows[0].gold).toBe(777)
})
it('ships 55 selected alpha PNGs and records the required style references',()=>{
 const manifest=JSON.parse(readFileSync(root+'/manifest.json','utf8')),audit=JSON.parse(readFileSync(root+'/alpha-audit.json','utf8'))
 expect(manifest.files).toHaveLength(55);expect(audit).toHaveLength(55)
 for(const f of manifest.files){
  expect(f.style_reference).toContain(['common','rare'].includes(f.rarity)?'common-rare-pongi':'epic-mythic-starlight')
  expect(createHash('sha256').update(readFileSync(root+'/'+f.storage_path)).digest('hex')).toBe(f.sha256)
 }
 for(const a of audit){expect(a.frames.every((f:{edgePixels:number})=>f.edgePixels===0)).toBe(true);if(a.file.endsWith('_sprite.png'))expect(a.cellWidth).toBe(a.cellHeight)}
})
it('plays eight constant-scale mythic poses on six-second cycles and keeps fixed fish rooted',()=>{
 for(const s of plan.filter(s=>s.rarity==='mythic')){
  const asset=mythicSwimAsset(`fish/mythic/${s.id}_sprite.png`,'mythic')!
  expect(asset).not.toBeNull()
  expect(new Set(Array.from({length:8},(_,f)=>mythicSwimLayout(asset.path,f)?.scale)).size).toBe(1)
  for(const t of [.1,1.8,3.5,5.8])expect(mythicSwimFrame(asset.path,t,0)).toBe(mythicSwimFrame(asset.path,t+6,0))
 }
 for(const id of ['bluegrain-scallop','iceflower-anemone']){
  expect([0,1,2,3].map(f=>whitenightFixedFrame(id,f/1.2+.001))).toEqual([0,1,2,3])
  expect(whitenightFixedFrame(id,2,true)).toBe(0);expect(whitenightFixedFrame(id,2,false,true)).toBe(0)
 }
})
