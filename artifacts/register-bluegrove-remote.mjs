import {loadEnvFile} from 'node:process'
import {readFileSync,writeFileSync} from 'node:fs'
import {createClient} from '@supabase/supabase-js'
loadEnvFile('.env.storage.local')
const client=createClient(process.env.SUPABASE_URL,process.env.SUPABASE_SECRET_KEY,{auth:{persistSession:false,autoRefreshToken:false}})
const plan=JSON.parse(readFileSync('artifacts/bluegrove-expansion-plan.json','utf8'))
const catalog=JSON.parse(readFileSync('supabase/catalog/catalog.json','utf8'))
const ids=plan.map(s=>s.id),nativeIds=plan.filter(s=>s.scope==='bluegrove').map(s=>s.id)
const rows=catalog.collectible_species.filter(s=>ids.includes(s.id))
function check(result,label){if(result.error)throw new Error(`${label}: ${result.error.code??result.error.status??'failed'}`);return result.data}
// Add new species without declaring native status until their habitat exists.
// Existing rows are never rewritten by the insert phase; every phase is retryable.
const existing=check(await client.from('collectible_species').select('id,name,native_region_id').in('id',ids),'preflight')
for(const row of existing){const expected=rows.find(s=>s.id===row.id);if(row.name!==expected.name||row.native_region_id&&row.native_region_id!==expected.native_region_id)throw new Error('Existing catalog identity conflict: '+row.id)}
const missing=rows.filter(s=>!existing.some(r=>r.id===s.id)).map(s=>({...s,native_region_id:null,facing_direction:'right'}))
if(missing.length)check(await client.from('collectible_species').insert(missing),'insert species')
const habitats=catalog.collectible_habitats.filter(h=>ids.includes(h.species_id))
check(await client.from('collectible_habitats').upsert(habitats,{onConflict:'species_id,region_id',ignoreDuplicates:true}),'insert habitats')
// The native-habitat trigger now sees exactly one bluegrove habitat per species.
check(await client.from('collectible_species').update({native_region_id:'bluegrove'}).in('id',nativeIds),'native designation')
check(await client.from('collectible_species').update({sprite_sheet_path:'fish/mythic/atlantean-sentinel-standing_sprite.png',movement_type:'fixed',flip_with_direction:false,idle_animated:true}).eq('id','atlantean-sentinel'),'standing sentinel')
const verified=check(await client.from('collectible_species').select('id,name,rarity,native_region_id,thumbnail_path,sprite_sheet_path').in('id',ids),'verify species')
const verifiedHabitats=check(await client.from('collectible_habitats').select('species_id,region_id').in('species_id',ids),'verify habitats')
if(verified.length!==22)throw new Error('Missing species')
for(const s of rows){const actual=verified.find(r=>r.id===s.id);if(actual.native_region_id!==s.native_region_id||actual.rarity!==s.rarity)throw new Error('Species mismatch: '+s.id);const actualH=verifiedHabitats.filter(h=>h.species_id===s.id).map(h=>h.region_id).sort();const expectedH=habitats.filter(h=>h.species_id===s.id).map(h=>h.region_id).sort();if(JSON.stringify(actualH)!==JSON.stringify(expectedH))throw new Error('Habitat mismatch: '+s.id)}
writeFileSync('assets/storage-upload/new/20261017-095349/remote-registration.json',JSON.stringify({verifiedAt:new Date().toISOString(),species:verified,habitats:verifiedHabitats,limitations:'Catalog data verification only; migration history/schema parity not asserted.'},null,2)+'\n')
console.log('Verified remote: 22 species, 7 shared / 15 bluegrove-native; sentinel fixed with standing atlas. Migration history was not repaired.')
