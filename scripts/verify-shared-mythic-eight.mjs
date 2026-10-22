import {loadEnvFile} from 'node:process'
import {readFileSync,writeFileSync} from 'node:fs'
import {createHash} from 'node:crypto'
loadEnvFile('.env.storage.local')
const root=process.argv[2]??'assets/storage-upload/new/20261022-083559'
const manifest=JSON.parse(readFileSync(root+'/manifest.json','utf8'))
const url=process.env.SUPABASE_URL
if(new URL(url).hostname!=='ewafafphiovbpjwogwzn.supabase.co')throw Error('Wrong project')
const hash=b=>createHash('sha256').update(b).digest('hex')
const files=[]
for(const entry of manifest.entries){
 const response=await fetch(`${url}/storage/v1/object/public/collectibles/${entry.storage_path}`)
 if(!response.ok)throw Error('Missing '+entry.id)
 const remote=Buffer.from(await response.arrayBuffer()),local=readFileSync(root+'/'+entry.storage_path)
 if(hash(local)!==hash(remote))throw Error('Hash differs '+entry.id)
 files.push({path:entry.storage_path,bytes:local.length,sha256:hash(local)})
}
writeFileSync(root+'/asset-verification.json',JSON.stringify({project:new URL(url).hostname,verifiedAt:new Date().toISOString(),scope:'Seven new 8-frame Storage files only; database unchanged',files},null,2))
console.log('Verified seven remote 8-frame PNGs against local SHA-256')
