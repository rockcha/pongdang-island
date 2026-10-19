import {readFileSync} from 'node:fs'
import {createHash} from 'node:crypto'
const base='https://ewafafphiovbpjwogwzn.supabase.co/storage/v1/object/public/collectibles/'
const batch='assets/storage-upload/new/20261019-132700/'
const manifest=JSON.parse(readFileSync(batch+'manifest.json','utf8'))
const ids=[...readFileSync('src/features/fishing/fishing-rods.ts','utf8').matchAll(/\{id:'([^']+)'/g)].map(m=>m[1])
const failures=[]
await Promise.all(ids.map(async id=>{
 for(const part of ['thumbnail','reel-frame','reel-rotor','float']){
  const key=`equipment/rods/${id==='basic'?'starter':id}/${part}.png`
  const response=await fetch(base+key,{method:'HEAD'})
  if(!response.ok)failures.push(`${key}: ${response.status}`)
 }
}))
for(const entry of manifest.entries){
 const response=await fetch(base+entry.storage_path)
 if(!response.ok)throw Error(`Download failed: ${entry.storage_path}`)
 const hash=data=>createHash('sha256').update(data).digest('hex')
 if(hash(Buffer.from(await response.arrayBuffer()))!==hash(readFileSync(entry.path)))throw Error(`Hash mismatch: ${entry.storage_path}`)
}
if(failures.length)throw Error(failures.join('\n'))
console.log(`Verified ${ids.length*4} public rod assets; all ${manifest.entries.length} new PNGs match local SHA-256.`)
