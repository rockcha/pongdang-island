import fs from 'node:fs'
import {createHash} from 'node:crypto'
const root='assets/storage-upload/new/20261027-090400',stage='artifacts/pirate-refactor-upload',project='ewafafphiovbpjwogwzn'
const m=JSON.parse(fs.readFileSync(root+'/manifest.json','utf8')),queue=[...m.files],verified=[]
const hash=b=>createHash('sha256').update(b).digest('hex')
await Promise.all(Array.from({length:3},async()=>{for(let i;i=queue.shift();){
 const bytes=fs.readFileSync(stage+'/'+i.file),url=`https://${project}.supabase.co/storage/v1/object/public/collectibles/`+i.storage_path
 const r=await fetch(url);if(!r.ok)throw Error('Public download failed '+r.status)
 if(hash(bytes)!==hash(Buffer.from(await r.arrayBuffer())))throw Error('Hash mismatch '+i.file)
 fs.copyFileSync(stage+'/'+i.file,root+'/'+i.file)
 if(i.file.includes('_swim8_'))fs.copyFileSync(stage+'/'+i.file,'public/aquarium/swim/'+i.file.split('/').at(-1))
 i.sha256=hash(bytes);i.bytes=bytes.length;verified.push({file:i.file,sha256:i.sha256})
}}))
fs.writeFileSync(root+'/manifest.json',JSON.stringify(m,null,2)+'\n')
fs.writeFileSync(root+'/storage-verification.json',JSON.stringify({project,verifiedAt:new Date().toISOString(),count:verified.length,files:verified},null,2)+'\n')
console.log('PASS: 18 public images match uploaded SHA-256')
