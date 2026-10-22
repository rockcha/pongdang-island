import {readFileSync,writeFileSync} from 'node:fs'
import {loadEnvFile} from 'node:process'
import {createHash} from 'node:crypto'
import {createClient} from '@supabase/supabase-js'
loadEnvFile('.env.storage.local')
const project='ewafafphiovbpjwogwzn.supabase.co'
if(new URL(process.env.SUPABASE_URL).hostname!==project)throw Error('Wrong target project')
const db=createClient(process.env.SUPABASE_URL,process.env.SUPABASE_SECRET_KEY,{auth:{persistSession:false,autoRefreshToken:false}})
const [phase,root]=process.argv.slice(2)
if(!['preflight','apply'].includes(phase)||!root)throw Error('Usage: node artifacts/treasure-trash-remote.mjs preflight|apply <batch-folder>')
const manifest=JSON.parse(readFileSync(root+'/manifest.json','utf8')),ids=manifest.assets.map(r=>r.id)
const catalog=JSON.parse(readFileSync('supabase/catalog/catalog.json','utf8'))
const check=(r,label)=>{if(r.error)throw Error(label+': '+r.error.message);return r.data}
const regions=check(await db.from('regions').select('id'),'regions').map(r=>r.id).sort()
if(JSON.stringify(regions)!==JSON.stringify(catalog.regions.map(r=>r.id).sort()))throw Error('Remote/local region difference; decide habitat scope first')
const existing=check(await db.from('collectible_species').select('*').in('id',ids),'identities')
const names=check(await db.from('collectible_species').select('id,name').in('name',manifest.assets.map(r=>r.name)),'names')
if(names.some(r=>!ids.includes(r.id)))throw Error('Name already used by a different identity')
const habitats=check(await db.from('collectible_habitats').select('species_id,region_id').in('species_id',ids),'habitats')
for(const row of existing){
 const wanted=catalog.collectible_species.find(r=>r.id===row.id)
 if(!wanted)throw Error('Existing remote ID without local definition: '+row.id)
 for(const key of Object.keys(wanted))if(String(row[key])!==String(wanted[key]))throw Error('Existing remote definition differs: '+row.id+'/'+key)
}
console.log(JSON.stringify({project,checkedAt:new Date().toISOString(),scope:'Seven requested identities, duplicate names and shared habitat regions only',existingSpecies:existing.length,existingHabitats:habitats.length,regions:regions.length}))
if(phase==='preflight')process.exit(0)
const expected=catalog.collectible_species.filter(r=>ids.includes(r.id))
if(expected.length!==7)throw Error('Expected seven local species')
const hash=b=>createHash('sha256').update(b).digest('hex')
for(const asset of manifest.assets){
 const local=readFileSync(root+'/'+asset.storage_path)
 const url=db.storage.from('collectibles').getPublicUrl(asset.storage_path).data.publicUrl
 const response=await fetch(url)
 if(!response.ok||hash(Buffer.from(await response.arrayBuffer()))!==hash(local))throw Error('Public image verification failed: '+asset.id)
}
const missing=expected.filter(r=>!existing.some(e=>e.id===r.id))
if(missing.length)check(await db.from('collectible_species').insert(missing),'species insertion')
const expectedHabitats=ids.flatMap(species_id=>regions.map(region_id=>({species_id,region_id})))
check(await db.from('collectible_habitats').upsert(expectedHabitats,{onConflict:'species_id,region_id',ignoreDuplicates:true}),'shared habitats')
const after=check(await db.from('collectible_species').select('*').in('id',ids),'species verification')
const afterHabitats=check(await db.from('collectible_habitats').select('species_id,region_id').in('species_id',ids),'habitat verification')
if(after.length!==7||afterHabitats.length!==expectedHabitats.length)throw Error('Final row count mismatch')
for(const wanted of expected){
 const row=after.find(r=>r.id===wanted.id)
 for(const key of Object.keys(wanted))if(String(row[key])!==String(wanted[key]))throw Error('Final mismatch: '+wanted.id+'/'+key)
 if(row.is_native||row.idle_animated)throw Error('Unexpected native or animation flag')
 for(const region of regions)if(!afterHabitats.some(h=>h.species_id===row.id&&h.region_id===region))throw Error('Missing shared habitat')
}
const verifiedAt=new Date().toISOString()
writeFileSync(root+'/remote-verification.json',JSON.stringify({project,verifiedAt,scope:'Seven species definitions, 84 shared habitats and seven public image hashes only; full schema and migration history not compared or changed',species:after.map(({id,name,rarity,sell_price,movement_type,swim_y_min,swim_y_max})=>({id,name,rarity,sell_price,movement_type,swim_y_min,swim_y_max})),habitatCount:afterHabitats.length},null,2)+'\n')
const releasesPath='src/features/regions/species-releases.json'
const releases=JSON.parse(readFileSync(releasesPath,'utf8'))
const unpublished=ids.filter(id=>!releases.some(r=>r.speciesIds.includes(id)))
if(unpublished.length){
 const releasedAt=new Date(Date.now()+9*60*60*1000).toISOString().replace('Z','+09:00')
 releases.unshift({releasedAt,speciesIds:unpublished})
 writeFileSync(releasesPath,JSON.stringify(releases,null,2)+'\n')
}
console.log('Verified seven new trash species, requested prices, fixed floor placement, 84 shared habitats and seven image hashes.')
