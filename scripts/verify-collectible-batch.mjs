import {loadEnvFile} from 'node:process'
import {readFileSync} from 'node:fs'
import {createHash} from 'node:crypto'
import {createClient} from '@supabase/supabase-js'

// Public asset hashes plus narrowly scoped catalog reads; never prints credentials.
try{loadEnvFile('.env.storage.local')}catch(error){if(error.code!=='ENOENT')throw error}
const folder=process.argv[2]
if(!folder)throw Error('Usage: node scripts/verify-collectible-batch.mjs <batch-folder>')
const manifest=JSON.parse(readFileSync(`${folder}/manifest.json`,'utf8'))
const endpoint=new URL(process.env.SUPABASE_URL)
if(endpoint.hostname!==`${manifest.project}.supabase.co`)throw Error('Batch project and configured Storage project differ')
let verified=0
for(const asset of manifest.assets){
 const response=await fetch(`${endpoint.origin}/storage/v1/object/public/collectibles/${asset.storage_path}?verify=${asset.sha256}`)
 if(!response.ok)throw Error(`Download failed (${response.status}): ${asset.storage_path}`)
 const hash=createHash('sha256').update(Buffer.from(await response.arrayBuffer())).digest('hex')
 if(hash!==asset.sha256)throw Error(`Public asset differs: ${asset.storage_path}`)
 verified++
}
console.log(`Verified ${verified} public PNGs against final local SHA-256 hashes.`)
const client=createClient(endpoint.origin,process.env.SUPABASE_SECRET_KEY,{auth:{persistSession:false,autoRefreshToken:false}})
const {data,error}=await client.from('collectible_species').select('id,name,kind,rarity,sell_price,native_region_id').in('id',manifest.species.map(s=>s.id))
if(error)throw Error(`Catalog read failed: ${error.message}`)
const mismatches=manifest.species.filter(s=>{
 const r=data.find(r=>r.id===s.id)
 return !r||r.name!==s.name||r.kind!==s.kind||r.rarity!==s.rarity||r.sell_price!==s.price||r.native_region_id!==s.region
})
console.log(`Remote catalog: ${data.length}/${manifest.species.length} requested species present; ${mismatches.length} missing or different.`)
if(mismatches.length)process.exitCode=1
