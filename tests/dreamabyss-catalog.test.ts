// @vitest-environment node
import {beforeAll,afterAll,expect,it} from 'vitest'
import {readFileSync} from 'node:fs'
import {createLocalDatabase,replayMigrations} from '../scripts/db/local.mjs'
import {dreamabyssFixedFrame} from '../src/features/aquarium/dreamabyss-animation'
const added=JSON.parse(readFileSync('assets/storage-upload/new/20261018-183000/catalog-entries.json','utf8'))
let db
beforeAll(async()=>{db=await createLocalDatabase();await replayMigrations(db)},60000)
afterAll(async()=>{await db?.close()})
it('registers all selected species exclusively in dreamabyss with the requested fish grades',async()=>{
 expect(added.filter(s=>s.kind==='fish'&&s.rarity==='rare')).toHaveLength(5)
 expect(added.filter(s=>s.kind==='fish'&&s.rarity==='epic')).toHaveLength(4)
 expect(added.filter(s=>s.kind==='fish'&&s.rarity==='mythic')).toHaveLength(1)
 for(const s of added){
  const result=(await db.query('select s.kind,s.rarity,s.native_region_id,s.movement_type,s.sprite_sheet_path,array_agg(h.region_id) as habitats from public.collectible_species s join public.collectible_habitats h on h.species_id=s.id where s.id=$1 group by s.id',[s.id])).rows[0]
  expect(result).toEqual({kind:s.kind,rarity:s.rarity,native_region_id:'dreamabyss',movement_type:s.kind==='fish'?'swim':'fixed',sprite_sheet_path:s.sprite_sheet_path,habitats:['dreamabyss']})
 }
})
it('allows fixed animated decorations while retaining sprite requirements for fish and static trash',async()=>{
 await expect(db.query("update public.collectible_species set sprite_sheet_path=null where id='violet-telescopefish'")).rejects.toThrow()
 await expect(db.query("update public.collectible_species set sprite_sheet_path='trash/invalid_sprite.png' where id='purple-stained-bottle'")).rejects.toThrow()
 const rows=(await db.query("select id from public.collectible_species where native_region_id='dreamabyss' and kind='decoration' and sprite_sheet_path is not null")).rows
 expect(rows.map(s=>s.id).sort()).toEqual(['moonlit-pearl-clam','primordial-amethyst-heart','violet-hydrothermal-vent'])
})
it('keeps animated decoration playback still during editing and reduced motion',()=>{
 for(const id of ['violet-hydrothermal-vent','moonlit-pearl-clam','primordial-amethyst-heart']){
  expect(dreamabyssFixedFrame(id,1)).toBe(1)
  expect(dreamabyssFixedFrame(id,1,true)).toBe(0)
  expect(dreamabyssFixedFrame(id,1,false,true)).toBe(0)
 }
 expect(dreamabyssFixedFrame('unrelated-species',1)).toBeNull()
})
