import {loadEnvFile} from 'node:process'
import {readFileSync,writeFileSync} from 'node:fs'
import {createClient} from '@supabase/supabase-js'
loadEnvFile('.env.storage.local')
const client=createClient(process.env.SUPABASE_URL,process.env.SUPABASE_SECRET_KEY,{auth:{persistSession:false,autoRefreshToken:false}})
const plan=JSON.parse(readFileSync('artifacts/primal-expansion-plan.json','utf8')),catalog=JSON.parse(readFileSync('supabase/catalog/catalog.json','utf8'))
const ids=plan.map(s=>s.id),rows=catalog.collectible_species.filter(s=>ids.includes(s.id))
function check(r,label){if(r.error)throw new Error(`${label}: ${r.error.code??r.error.status??'failed'}`);return r.data}
const region=check(await client.from('regions').select('id').eq('id','primal'),'region');if(region.length!==1)throw new Error('Primal region missing')
const existing=check(await client.from('collectible_species').select('id,name,native_region_id').in('id',ids),'preflight')
for(const row of existing){const s=rows.find(s=>s.id===row.id);if(s.name!==row.name||row.native_region_id&&row.native_region_id!=='primal')throw new Error('Identity conflict: '+row.id)}
const missing=rows.filter(s=>!existing.some(r=>r.id===s.id)).map(s=>({...s,native_region_id:null,facing_direction:'right'}))
if(missing.length)check(await client.from('collectible_species').insert(missing),'species')
const habitats=ids.map(species_id=>({species_id,region_id:'primal'}))
check(await client.from('collectible_habitats').upsert(habitats,{onConflict:'species_id,region_id',ignoreDuplicates:true}),'habitats')
check(await client.from('collectible_species').update({native_region_id:'primal'}).in('id',ids),'native designation')
const verified=check(await client.from('collectible_species').select('id,name,kind,rarity,native_region_id,thumbnail_path,sprite_sheet_path,size').in('id',ids),'verification')
const actualHabitats=check(await client.from('collectible_habitats').select('species_id,region_id').in('species_id',ids),'habitat verification')
if(verified.length!==34||actualHabitats.length!==34)throw new Error('Count mismatch')
for(const expected of rows){const actual=verified.find(s=>s.id===expected.id);for(const key of ['name','kind','rarity','native_region_id','thumbnail_path','sprite_sheet_path','size'])if(actual[key]!==expected[key])throw new Error('Field mismatch '+expected.id+' '+key);if(!actualHabitats.some(h=>h.species_id===expected.id&&h.region_id==='primal'))throw new Error('Habitat mismatch')}
writeFileSync('assets/storage-upload/new/20261017-135100/remote-registration.json',JSON.stringify({verifiedAt:new Date().toISOString(),species:verified,habitats:actualHabitats,limitations:'Only these catalog records verified; schema and migration history not asserted.'},null,2)+'\n')
console.log('Remote verified: 20 fish and 14 decorations, all primal-native. No player data touched.')
