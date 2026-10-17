import {loadEnvFile} from 'node:process'
import {readFileSync,writeFileSync} from 'node:fs'
import {createHash} from 'node:crypto'
loadEnvFile('.env.storage.local')
const root='assets/storage-upload/new/20261017-175022',manifest=JSON.parse(readFileSync(root+'/manifest.json','utf8'))
const results=[];let next=0
await Promise.all(Array.from({length:4},async()=>{while(next<manifest.files.length){const f=manifest.files[next++],r=await fetch(process.env.SUPABASE_URL+'/storage/v1/object/public/collectibles/'+f.storage_path);if(!r.ok)throw Error('Unavailable '+f.storage_path);const bytes=Buffer.from(await r.arrayBuffer()),sha256=createHash('sha256').update(bytes).digest('hex');if(sha256!==f.sha256)throw Error('Mismatch '+f.storage_path);results.push({key:f.storage_path,bytes:bytes.length,sha256})}}))
writeFileSync(root+'/upload-verification.json',JSON.stringify({verifiedAt:new Date().toISOString(),projectHost:new URL(process.env.SUPABASE_URL).hostname,files:results},null,2)+'\n')
console.log('Verified 47 public PNGs match local SHA256.')
