import {readFileSync,writeFileSync} from 'node:fs'
import {createHash} from 'node:crypto'
import {loadEnvFile} from 'node:process'
import {createClient} from '@supabase/supabase-js'
loadEnvFile('.env.storage.local')
const root=process.argv[2]
const manifest=JSON.parse(readFileSync(root+'/manifest.json','utf8'))
const catalog=JSON.parse(readFileSync('supabase/catalog/catalog.json','utf8'))
const url=process.env.SUPABASE_URL
if(new URL(url).hostname!=='ewafafphiovbpjwogwzn.supabase.co')throw Error('Wrong project')
const client=createClient(url,process.env.SUPABASE_SECRET_KEY,{auth:{persistSession:false,autoRefreshToken:false}})
const hash=b=>createHash('sha256').update(b).digest('hex')
const files=[]
for(const e of manifest.entries)for(const path of [...new Set([e.storage_path,e.thumbnail_path])]){
 const local=readFileSync(root+'/'+path)
 const response=await fetch(client.storage.from('collectibles').getPublicUrl(path).data.publicUrl)
 if(!response.ok)throw Error('Missing Storage file '+path)
 const remote=Buffer.from(await response.arrayBuffer())
 if(hash(local)!==hash(remote))throw Error('Storage hash mismatch '+path)
 files.push({path,bytes:local.length,sha256:hash(local)})
}
console.log('Verified '+files.length+' public Storage hashes')
if(process.argv.includes('--catalog')){
 const check=r=>{if(r.error)throw Error(r.error.message);return r.data}
 const ids=manifest.entries.map(e=>e.id)
 const rows=check(await client.from('collectible_species').select('*').in('id',ids))
 const habitats=check(await client.from('collectible_habitats').select('species_id,region_id').in('species_id',ids))
 if(rows.length!==10)throw Error('Expected all 10 identities')
 for(const e of manifest.entries){
  const actual=rows.find(r=>r.id===e.id),expected=catalog.collectible_species.find(r=>r.id===e.id)
  for(const [key,value] of Object.entries(expected))if(String(actual[key])!==String(value))throw Error('Catalog mismatch '+e.id+'/'+key)
  if(actual.facing_direction!==(e.kind==='fish'?'right':null))throw Error('Remote artwork direction mismatch '+e.id)
  for(const region of catalog.regions)if(!habitats.some(h=>h.species_id===e.id&&h.region_id===region.id))throw Error('Missing habitat '+e.id+'/'+region.id)
 }
 console.log('Verified 10 catalog rows and '+habitats.length+' habitats')
}
writeFileSync(root+'/asset-verification.json',JSON.stringify({project:new URL(url).hostname,verifiedAt:new Date().toISOString(),scope:process.argv.includes('--catalog')?'10 new catalog identities, 120 habitats and 15 public Storage file hashes; not full schema parity':'15 public Storage file hashes',files},null,2)+'\n')
