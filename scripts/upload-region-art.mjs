import {loadEnvFile} from 'node:process'
import {readFile,writeFile} from 'node:fs/promises'
import {resolve,relative} from 'node:path'
import {createHash} from 'node:crypto'
import {createClient} from '@supabase/supabase-js'
import {optimizePng} from './optimize-png-lossless.mjs'

try{loadEnvFile('.env.storage.local')}catch(e){if(e.code!=='ENOENT')throw e}
const [manifestPath,mode]=process.argv.slice(2)
if(!manifestPath||mode&&!['--dry-run'].includes(mode))throw Error('Usage: node scripts/upload-region-art.mjs <manifest.json> [--dry-run]')
const manifest=JSON.parse(await readFile(manifestPath,'utf8'))
const endpoint=new URL(process.env.SUPABASE_URL)
if(endpoint.origin!=='https://ewafafphiovbpjwogwzn.supabase.co'||endpoint.pathname!=='/'||endpoint.search||endpoint.hash)throw Error('Unexpected project')
const client=createClient(endpoint.origin,process.env.SUPABASE_SECRET_KEY||process.env.SUPABASE_SERVICE_ROLE_KEY,{auth:{persistSession:false,autoRefreshToken:false}})
const root=resolve(manifestPath,'..')
for(const item of manifest.items){
 const path=resolve(root,item.file),rel=relative(root,path)
 if(rel.startsWith('..')||item.bucket!=='regions'||!/^nyamnyam\/(banner|scenery|map)-v\d+\.png$/.test(item.storage_path))throw Error('Invalid artwork path')
 const original=await readFile(path),bytes=optimizePng(original)
 if(bytes.toString('hex',0,8)!=='89504e470d0a1a0a')throw Error('Invalid PNG')
 if(mode==='--dry-run'){console.log(`${item.bucket}/${item.storage_path}: ${bytes.length} bytes`);continue}
 if(bytes.length<original.length)await writeFile(path,bytes)
 const {error}=await client.storage.from(item.bucket).upload(item.storage_path,bytes,{contentType:'image/png',upsert:false,cacheControl:'31536000'})
 if(error&&String(error.statusCode)!=='409')throw Error(`Upload failed (${error.statusCode??'unknown'})`)
 const url=client.storage.from(item.bucket).getPublicUrl(item.storage_path).data.publicUrl
 const response=await fetch(url)
 if(!response.ok)throw Error(`Public download failed (${response.status})`)
 const hash=b=>createHash('sha256').update(b).digest('hex')
 const remote=Buffer.from(await response.arrayBuffer())
 if(hash(remote)!==hash(bytes))throw Error('Remote/local hash mismatch')
 item.sha256=hash(bytes);item.width=bytes.readUInt32BE(16);item.height=bytes.readUInt32BE(20)
 console.log(`Verified ${url}`)
}
if(mode!=='--dry-run')await writeFile(manifestPath,JSON.stringify(manifest,null,2)+'\n')
