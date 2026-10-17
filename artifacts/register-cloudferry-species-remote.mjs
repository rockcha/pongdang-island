import {loadEnvFile} from 'node:process'
import {readFileSync,writeFileSync} from 'node:fs'
import {createClient} from '@supabase/supabase-js'
loadEnvFile('.env.storage.local')
const c=createClient(process.env.SUPABASE_URL,process.env.SUPABASE_SECRET_KEY,{auth:{persistSession:false}})
const plan=JSON.parse(readFileSync('artifacts/cloudferry-expansion-plan.json','utf8')).species,catalog=JSON.parse(readFileSync('supabase/catalog/catalog.json','utf8')),ids=plan.map(s=>s.id),rows=catalog.collectible_species.filter(s=>ids.includes(s.id))
function check(r,label){if(r.error)throw Error(label+': '+r.error.code);return r.data}
if(check(await c.from('regions').select('id').eq('id','cloudferry'),'region').length!==1)throw Error('Cloud Ferry region must be installed first')
const verifiedUploads=JSON.parse(readFileSync('assets/storage-upload/new/20261017-175022/upload-verification.json','utf8'));if(verifiedUploads.files.length!==47)throw Error('Verify all 47 images before registration');
const existing=check(await c.from('collectible_species').select('id,name,native_region_id').in('id',ids),'preflight')
for(const row of existing){const s=rows.find(s=>s.id===row.id);if(row.name!==s.name||row.native_region_id&&row.native_region_id!=='cloudferry')throw Error('Identity conflict: '+row.id)}
const existingHabitats=check(await c.from('collectible_habitats').select('species_id,region_id').in('species_id',ids),'habitat preflight')
if(existingHabitats.some(h=>h.region_id!=='cloudferry'))throw Error('Unexpected existing habitat; no mutation performed')
const missing=rows.filter(s=>!existing.some(r=>r.id===s.id)).map(s=>({...s,native_region_id:null,facing_direction:'right',idle_animated:plan.find(p=>p.id===s.id).movement==='fixed'}))
if(missing.length)check(await c.from('collectible_species').insert(missing),'species insertion')
check(await c.from('collectible_habitats').upsert(ids.map(species_id=>({species_id,region_id:'cloudferry'})),{onConflict:'species_id,region_id',ignoreDuplicates:true}),'habitats')
check(await c.from('collectible_species').update({native_region_id:'cloudferry'}).in('id',ids),'native designation')
const species=check(await c.from('collectible_species').select('id,name,kind,rarity,native_region_id,thumbnail_path,sprite_sheet_path,size,movement_type').in('id',ids),'verification'),habitats=check(await c.from('collectible_habitats').select('species_id,region_id').in('species_id',ids),'habitat verification')
if(species.length!==25||habitats.length!==25)throw Error('Count mismatch')
for(const expected of rows){const actual=species.find(s=>s.id===expected.id);for(const k of Object.keys(actual))if(actual[k]!==expected[k])throw Error('Field mismatch: '+expected.id+' '+k)}
writeFileSync('assets/storage-upload/new/20261017-175022/remote-registration.json',JSON.stringify({verifiedAt:new Date().toISOString(),species,habitats,limitations:'These catalog rows only; no schema or migration-history parity claim.'},null,2)+'\n')
console.log('Verified 25 new Cloud Ferry native species and 25 exclusive habitats. Existing species and player data untouched.')
