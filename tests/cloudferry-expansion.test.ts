// @vitest-environment node
import {beforeAll,afterAll,it,expect} from 'vitest'
import {readFileSync,existsSync} from 'node:fs'
import {createHash} from 'node:crypto'
import {createLocalDatabase,replayMigrations,readCatalog,canonical} from '../scripts/db/local.mjs'
import {cloudferryFixedFrame} from '../src/features/aquarium/cloudferry-animation'
import {mythicSwimAsset,mythicSwimFrame} from '../src/features/aquarium/mythic-swim'
let db:Awaited<ReturnType<typeof createLocalDatabase>>
beforeAll(async()=>{db=await createLocalDatabase();await replayMigrations(db)},60000)
afterAll(async()=>{await db?.close()})
it('registers exactly the requested 25 native collectibles with the correct kinds and rarities',async()=>{
 const rows=(await db.query("select id,kind,rarity,movement_type from public.collectible_species where native_region_id='cloudferry'")).rows
 expect(rows).toHaveLength(25)
 expect(rows.filter(r=>r.kind==='fish')).toHaveLength(22);expect(rows.filter(r=>r.kind==='decoration')).toHaveLength(2);expect(rows.filter(r=>r.kind==='trash')).toHaveLength(1)
 expect(rows.reduce((counts:Record<string,number>,r)=>{counts[r.rarity]=(counts[r.rarity]??0)+1;return counts},{})).toEqual({common:9,rare:8,epic:7,mythic:1})
 expect(rows.find(r=>r.id==='cloud-howl-moving-castle')).toMatchObject({rarity:'mythic',movement_type:'crawl'})
 expect(rows.find(r=>r.id==='cloud-totoro-lost-umbrella')).toMatchObject({kind:'trash',rarity:'common'})
 expect((await db.query("select h.species_id from public.collectible_habitats h join public.collectible_species s on s.id=h.species_id where s.native_region_id='cloudferry' and h.region_id<>'cloudferry'")).rows).toEqual([])
 expect(canonical(await readCatalog(db))).toBe(canonical(JSON.parse(readFileSync('supabase/catalog/catalog.json','utf8'))))
})
it('enables mythic fishing after the castle habitat is registered and keeps fixed characters animated',async()=>{
 const picked=(await db.query("select species_id from app_private.pick_regional_collectible('cloudferry','mythic',false,0)")).rows
 expect(picked).toEqual([{species_id:'cloud-howl-moving-castle'}])
 for(const id of ['cloud-shell-home-soot','cloud-masked-forest-san','cloud-cloud-umbrella-totoro']){expect(cloudferryFixedFrame(id,0)).toBe(0);expect(cloudferryFixedFrame(id,.5)).toBe(1);expect(cloudferryFixedFrame(id,1,true)).toBe(0);expect(cloudferryFixedFrame(id,1,false,true)).toBe(0)}
 expect(cloudferryFixedFrame('cloud-howl-moving-castle',1)).toBeNull()
})
it('ships all reviewed PNGs with matching hashes, clear cell boundaries and a full castle action cycle',()=>{
 const root='assets/storage-upload/new/20261017-175022',manifest=JSON.parse(readFileSync(root+'/manifest.json','utf8')),audit=JSON.parse(readFileSync(root+'/alpha-audit.json','utf8'))
 expect(manifest.files).toHaveLength(47);expect(audit).toHaveLength(47)
 for(const file of manifest.files){const bytes=readFileSync(root+'/'+file.storage_path);expect(createHash('sha256').update(bytes).digest('hex')).toBe(file.sha256)}
 expect(audit.every((r:{frames:{edgePixels:number}[]})=>r.frames.every(f=>f.edgePixels===0))).toBe(true)
 const asset=mythicSwimAsset('fish/mythic/cloud-howl-moving-castle_sprite.png','mythic')!
 expect(asset.path).toBe('fish/mythic/cloud-howl-moving-castle_swim8_sprite.png');expect(existsSync('public'+asset.url)).toBe(true)
 expect(new Set(Array.from({length:60},(_,i)=>mythicSwimFrame(asset.path,i/10,0))).size).toBe(8)
})
