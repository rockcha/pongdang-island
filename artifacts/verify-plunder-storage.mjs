import fs from 'node:fs'
import {createHash} from 'node:crypto'
const root='assets/storage-upload/new/20261027-034411',stage='artifacts/plunder-upload'
const manifest=JSON.parse(fs.readFileSync(root+'/manifest.json','utf8'))
const hash=b=>createHash('sha256').update(b).digest('hex')
const queue=[...manifest.files],verified=[]
await Promise.all(Array.from({length:4},async()=>{
 for(let item;item=queue.shift();){
  const bytes=fs.readFileSync(stage+'/'+item.storage_path)
  const url='https://ewafafphiovbpjwogwzn.supabase.co/storage/v1/object/public/collectibles/'+item.storage_path
  const response=await fetch(url)
  if(!response.ok)throw Error('Public download HTTP '+response.status)
  const remote=Buffer.from(await response.arrayBuffer())
  if(hash(bytes)!==hash(remote))throw Error('Hash mismatch '+item.storage_path)
  fs.copyFileSync(stage+'/'+item.storage_path,root+'/'+item.file)
  if(item.storage_path.includes('_swim8_'))fs.copyFileSync(stage+'/'+item.storage_path,'public/aquarium/swim/'+item.storage_path.split('/').at(-1))
  item.sha256=hash(bytes);item.bytes=bytes.length
  verified.push({path:item.storage_path,sha256:item.sha256})
 }
}))
fs.writeFileSync(root+'/manifest.json',JSON.stringify(manifest,null,2)+'\n')
fs.writeFileSync(root+'/storage-verification.json',JSON.stringify({project:'ewafafphiovbpjwogwzn',verifiedAt:new Date().toISOString(),count:verified.length,files:verified},null,2)+'\n')
console.log('PASS: '+verified.length+' public assets match uploaded SHA-256; compressed bytes saved in project')
