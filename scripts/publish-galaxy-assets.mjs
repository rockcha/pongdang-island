import {loadEnvFile} from 'node:process'
import {readFileSync,writeFileSync,copyFileSync,mkdirSync,existsSync} from 'node:fs'
import {dirname,resolve} from 'node:path'
import {createHash} from 'node:crypto'
import {createClient} from '@supabase/supabase-js'
import {optimizePng} from './optimize-png-lossless.mjs'
import {batch,items} from './prepare-galaxy-assets.mjs'
import {scenes,themes} from './galaxy-scene-specs.mjs'
const file=batch+'/manifest.json',manifest=JSON.parse(readFileSync(file,'utf8'))
const dry=process.argv.includes('--dry-run'),stage=process.argv.includes('--stage-local')
if(!stage&&manifest.status!=='verified-for-release')throw Error('Complete image and animation review before publishing')
const entries=stage?scenes.map(s=>s.path):[...items.flatMap(i=>[i.thumbnail_path,i.sprite_sheet_path].filter(Boolean)),...scenes.map(s=>s.path)]
const hash=b=>createHash('sha256').update(b).digest('hex')
const project='https://ewafafphiovbpjwogwzn.supabase.co'
let client
if(!dry&&!stage){
 const envAt=process.argv.indexOf('--env')
 loadEnvFile(envAt>=0?resolve(process.argv[envAt+1]):'.env.storage.local')
 if(process.env.SUPABASE_URL!==project)throw Error('Unexpected Supabase project')
 client=createClient(project,process.env.SUPABASE_SECRET_KEY||process.env.SUPABASE_SERVICE_ROLE_KEY,{auth:{persistSession:false,autoRefreshToken:false}})
}
const verified=[]
const previous=existsSync(batch+'/storage-verification.json')?JSON.parse(readFileSync(batch+'/storage-verification.json','utf8')):null
for(const path of entries){
 const source=batch+'/'+path,original=readFileSync(source)
 if(original.toString('hex',0,8)!=='89504e470d0a1a0a')throw Error('Not PNG: '+path)
 const panorama=path.startsWith('aquarium-backgrounds/'),bucket=panorama?'aquarium-backgrounds':'collectibles',key=panorama?path.slice('aquarium-backgrounds/'.length):path
 if(dry){console.log(`${bucket}/${key}: ${original.length}`);continue}
 if(stage){
  if(scenes.some(s=>s.path===path)&&!panorama&&!path.startsWith('equipment/')){const target='public/'+path;mkdirSync(dirname(target),{recursive:true});copyFileSync(source,target)}
  continue
 }
 const optimized=optimizePng(original),bytes=optimized.length<original.length?optimized:original
 if(!bytes.equals(original))writeFileSync(source,bytes)
 const prior=previous?.project==='ewafafphiovbpjwogwzn'?previous.files.find(f=>f.bucket===bucket&&f.key===key&&f.sha256===hash(bytes)):null
 if(prior){verified.push(prior);continue}
 const {error}=await client.storage.from(bucket).upload(key,bytes,{contentType:'image/png',upsert:false,cacheControl:'31536000'})
 if(error&&String(error.statusCode)!=='409'&&error.message!=='The resource already exists')throw Error(`Upload failed ${bucket}/${key} (${error.statusCode??'unknown'})`)
 const url=`${project}/storage/v1/object/public/${bucket}/${key}`,response=await fetch(url)
 if(!response.ok||hash(Buffer.from(await response.arrayBuffer()))!==hash(bytes))throw Error('Public hash mismatch '+key)
 verified.push({bucket,key,sha256:hash(bytes),verified_at:new Date().toISOString()})
 writeFileSync(batch+'/storage-verification.json',JSON.stringify({project:'ewafafphiovbpjwogwzn',expected:entries.length,count:verified.length,files:verified},null,2)+'\n')
 console.log(`Verified ${verified.length}/${entries.length}: ${key}`)
}
if(!stage&&!dry)writeFileSync(batch+'/storage-verification.json',JSON.stringify({project:'ewafafphiovbpjwogwzn',expected:entries.length,count:verified.length,files:verified},null,2)+'\n')
if(stage){
 const p='src/features/aquarium/theme-panoramas.json',panoramas=JSON.parse(readFileSync(p,'utf8'))
 for(const t of themes){const name=`${t.id}-panorama-v1.png`;panoramas[name]={file:name,localPath:batch+'/aquarium-backgrounds/'+name}}
 writeFileSync(p,JSON.stringify(panoramas,null,2)+'\n')
 console.log('Staged local region artwork and aquarium panorama mapping')
}
