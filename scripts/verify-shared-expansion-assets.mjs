import {loadEnvFile} from 'node:process'
import {readFileSync,writeFileSync} from 'node:fs'
import {createHash} from 'node:crypto'
import {createClient} from '@supabase/supabase-js'
loadEnvFile('.env.storage.local')
const root='assets/storage-upload/new/20261022-041530'
const manifest=JSON.parse(readFileSync(root+'/manifest.json','utf8'))
const url=process.env.SUPABASE_URL
if(new URL(url).hostname!=='ewafafphiovbpjwogwzn.supabase.co')throw Error('Wrong project')
const client=createClient(url,process.env.SUPABASE_SECRET_KEY,{auth:{persistSession:false}})
const paths=[...new Set(manifest.entries.flatMap(e=>[e.thumbnail_path,...(e.frames>1?[e.storage_path]:[]),...(e.frames===6?[e.storage_path.replace('_sprite.png','_compat_sprite.png')]:[])]))]
const hash=b=>createHash('sha256').update(b).digest('hex')
const files=[];let index=0
await Promise.all(Array.from({length:4},async()=>{
 while(index<paths.length){const path=paths[index++],local=readFileSync(root+'/'+path)
  const response=await fetch(client.storage.from('collectibles').getPublicUrl(path).data.publicUrl)
  if(!response.ok)throw Error('Download failed '+path)
  const remote=Buffer.from(await response.arrayBuffer())
  if(hash(local)!==hash(remote))throw Error('Storage bytes differ '+path)
  files.push({path,bytes:local.length,sha256:hash(local)})
 }
}))
files.sort((a,b)=>a.path.localeCompare(b.path))
writeFileSync(root+'/asset-verification.json',JSON.stringify({project:new URL(url).hostname,verifiedAt:new Date().toISOString(),scope:'Public Storage file existence and byte-for-byte SHA-256 equality only',files},null,2))
console.log('Verified Storage hashes: '+files.length)
