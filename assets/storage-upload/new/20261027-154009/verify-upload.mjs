import fs from 'node:fs'
import crypto from 'node:crypto'
const root='assets/storage-upload/new/20261027-154009'
const hash=b=>crypto.createHash('sha256').update(b).digest('hex')
const manifest=JSON.parse(fs.readFileSync(root+'/manifest.json','utf8'))
const uploaded=manifest.assets.filter(a=>a.storage_path),results=[]
for(let i=0;i<uploaded.length;i+=4){
 const rows=await Promise.all(uploaded.slice(i,i+4).map(async a=>{
  const bytes=fs.readFileSync('tmp/mechsanctum-upload/'+a.storage_path)
  const response=await fetch('https://ewafafphiovbpjwogwzn.supabase.co/storage/v1/object/public/collectibles/'+a.storage_path)
  if(!response.ok)throw Error(`Public artwork failed ${a.storage_path}: ${response.status}`)
  const remote=Buffer.from(await response.arrayBuffer())
  if(hash(remote)!==hash(bytes))throw Error('Public byte hash mismatch: '+a.storage_path)
  fs.writeFileSync(root+'/'+a.storage_path,bytes)
  if(a.frames===8)fs.writeFileSync('public/aquarium/swim/'+a.id+'_swim8_v1_sprite.png',bytes)
  a.sha256=hash(bytes);a.bytes=bytes.length
  return {storage_path:a.storage_path,sha256:a.sha256}
 }));results.push(...rows);console.log(`Verified ${results.length}/${uploaded.length}`)
}
const audit=JSON.parse(fs.readFileSync(root+'/registration.json','utf8'))
for(const row of audit)row.sha256=hash(fs.readFileSync(root+'/'+row.storage_path))
fs.writeFileSync(root+'/registration.json',JSON.stringify(audit,null,2)+'\n')
const reviewed=JSON.parse(fs.readFileSync('src/features/aquarium/artwork-facing.json','utf8')).filter(a=>!(a.id??'').startsWith('mechsanctum-'))
for(const row of audit)reviewed.push({id:row.id,path:row.storage_path,facing:'right',sha256:row.sha256})
fs.writeFileSync('src/features/aquarium/artwork-facing.json',JSON.stringify(reviewed,null,2)+'\n')
fs.writeFileSync(root+'/facing.json',JSON.stringify(reviewed.filter(a=>(a.id??'').startsWith('mechsanctum-')),null,2)+'\n')
fs.writeFileSync(root+'/manifest.json',JSON.stringify(manifest,null,2)+'\n')
console.log(`PASS: ${results.length} public objects match the uploaded local bytes. No database rows were changed.`)
