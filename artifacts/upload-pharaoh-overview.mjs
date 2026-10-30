import fs from 'node:fs'
import {createHash} from 'node:crypto'
import {createClient} from '@supabase/supabase-js'
import {project} from './pharaoh-remote.mjs'
import {optimizePng} from '../scripts/optimize-png-lossless.mjs'
const batch='assets/storage-upload/new/20261030-100353',manifest=batch+'/manifest.json',m=JSON.parse(fs.readFileSync(manifest,'utf8'))
const client=createClient(`https://${project}.supabase.co`,process.env.SUPABASE_SECRET_KEY||process.env.SUPABASE_SERVICE_ROLE_KEY,{auth:{persistSession:false,autoRefreshToken:false}}),hash=b=>createHash('sha256').update(b).digest('hex')
const verified=[]
for(const a of m.assets){
 if(!['regions/pharaoh/overview-v2.png','fishing/scenery/pharaoh-v1.png'].includes(a.path))throw Error('Unexpected artwork path')
 const bytes=optimizePng(fs.readFileSync(a.target))
 if(bytes.length>10*1024*1024)throw Error('Image too large')
 const {error}=await client.storage.from('collectibles').upload(a.path,bytes,{contentType:'image/png',upsert:false,cacheControl:'31536000'})
 if(error&&String(error.statusCode)!=='409')throw Error('Upload failed '+error.statusCode)
 const url=client.storage.from('collectibles').getPublicUrl(a.path).data.publicUrl,r=await fetch(url)
 if(!r.ok||hash(Buffer.from(await r.arrayBuffer()))!==hash(bytes))throw Error('Public asset hash mismatch '+a.path)
 fs.writeFileSync(a.target,bytes);Object.assign(a,{sha256:hash(bytes),public_storage_url:url,uploaded:true,width:bytes.readUInt32BE(16),height:bytes.readUInt32BE(20)})
 verified.push({path:a.path,sha256:a.sha256,bytes:bytes.length})
}
Object.assign(m,{project,uploaded_at:new Date().toISOString(),frontend_deployed:false})
fs.writeFileSync(manifest,JSON.stringify(m,null,2)+'\n');fs.writeFileSync(batch+'/storage-verification.json',JSON.stringify({project,verified_at:new Date().toISOString(),files:verified},null,2)+'\n')
console.log(JSON.stringify({project,verified:verified.length}))
