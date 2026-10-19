import {loadEnvFile} from 'node:process'
import {readFile} from 'node:fs/promises'
import {resolve,dirname} from 'node:path'
import {createHash} from 'node:crypto'
import {createClient} from '@supabase/supabase-js'

// Upload only manifest-listed new theme images; credentials never enter the app.
try{loadEnvFile('.env.storage.local')}catch(error){if(error.code!=='ENOENT')throw error}
const [folder,mode]=process.argv.slice(2)
if(!folder||!['--dry-run','--upload'].includes(mode)||process.argv.length!==4)throw Error('Usage: node scripts/upload-aquarium-backgrounds.mjs <batch-folder> --dry-run|--upload')
const root=resolve(folder)
const manifest=JSON.parse(await readFile(resolve(root,'manifest.json'),'utf8'))
const url=process.env.SUPABASE_URL
const key=process.env.SUPABASE_SECRET_KEY||process.env.SUPABASE_SERVICE_ROLE_KEY
if(!url||!key)throw Error('Storage credentials missing')
const endpoint=new URL(url)
if(endpoint.hostname!=='ewafafphiovbpjwogwzn.supabase.co'||endpoint.pathname!=='/'||endpoint.search||endpoint.hash)throw Error('Unexpected target project')
const client=createClient(url,key,{auth:{persistSession:false,autoRefreshToken:false}})
const seen=new Set()
for(const item of manifest.items){
 if(!/^[a-z0-9-]+$/.test(item.id)||item.file!==`aquarium-backgrounds/${item.id}.png`||seen.has(item.id))throw Error('Invalid theme manifest')
 seen.add(item.id)
 const file=resolve(root,item.file)
 if(dirname(file)!==resolve(root,'aquarium-backgrounds'))throw Error('Invalid image path')
 const bytes=await readFile(file)
 if(bytes.toString('hex',0,8)!=='89504e470d0a1a0a'||bytes.length>10485760)throw Error('Invalid PNG')
 console.log(`${endpoint.hostname}/aquarium-backgrounds/${item.id}.png (${bytes.length} bytes)`)
 if(mode==='--dry-run')continue
 const {error}=await client.storage.from('aquarium-backgrounds').upload(`${item.id}.png`,bytes,{contentType:'image/png',upsert:false,cacheControl:'31536000'})
 // Retrying after a partial upload must not replace an existing object.
 if(error&&error.statusCode!=='409'&&error.statusCode!==409)throw error
 const publicUrl=client.storage.from('aquarium-backgrounds').getPublicUrl(`${item.id}.png`).data.publicUrl
 const response=await fetch(publicUrl)
 if(!response.ok)throw Error(`Public image verification failed: ${response.status}`)
 const downloaded=Buffer.from(await response.arrayBuffer())
 const hash=b=>createHash('sha256').update(b).digest('hex')
 if(hash(bytes)!==hash(downloaded))throw Error('Remote image differs from local image')
 console.log(`Verified ${item.id}`)
}
