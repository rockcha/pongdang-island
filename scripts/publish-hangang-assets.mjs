import fs from 'node:fs'
import path from 'node:path'
import {loadEnvFile} from 'node:process'
import {spawnSync} from 'node:child_process'
import {createHash} from 'node:crypto'
import {createClient} from '@supabase/supabase-js'
import {optimizePng} from './optimize-png-lossless.mjs'
import {batch,items} from './prepare-hangang-assets.mjs'
try{loadEnvFile('.env.storage.local')}catch(error){if(error.code!=='ENOENT')throw error}
const url=process.env.SUPABASE_URL,key=process.env.SUPABASE_SECRET_KEY||process.env.SUPABASE_SERVICE_ROLE_KEY
if(!url||new URL(url).hostname!=='ewafafphiovbpjwogwzn.supabase.co'||!key)throw Error('Target project or server upload credentials missing')
const staging='tmp/hangang-upload',files=items.flatMap(i=>[i.thumbnail_path,...(i.sprite_sheet_path?[i.sprite_sheet_path]:[])])
for(const i of items.filter(i=>i.frames===8))files.push(`fish/mythic/${i.id}_compat_v1_sprite.png`)
for(const file of ['thumbnail','reel-frame','reel-rotor','float'])files.push(`equipment/rods/hangang/${file}.png`)
for(const file of files){fs.mkdirSync(path.dirname(staging+'/'+file),{recursive:true});fs.copyFileSync(batch+'/'+file,staging+'/'+file)}
const upload=spawnSync(process.execPath,['scripts/upload-collectibles.mjs',staging],{stdio:'inherit'})
if(upload.status!==0)throw Error('Collectible upload failed')
for(const file of files)fs.copyFileSync(staging+'/'+file,batch+'/'+file)
for(const i of items.filter(i=>i.frames===8))fs.copyFileSync(batch+'/'+i.sprite_sheet_path,`public/aquarium/swim/${i.id}_swim8_v1_sprite.png`)
const client=createClient(url,key,{auth:{persistSession:false,autoRefreshToken:false}})
for(const file of ['regions/hangang/overview-v1.png','regions/hangang/map-v1.png','fishing/scenery/hangang-v1.png','fishing/close-water/hangang-v1.png','fishing/platforms/hangang-v1.png']){
 const local='public/'+file,bytes=optimizePng(fs.readFileSync(local));fs.writeFileSync(local,bytes)
 const {error}=await client.storage.from('collectibles').upload(file,bytes,{contentType:'image/png',upsert:false,cacheControl:'31536000'})
 if(error&&!/already exists|duplicate/i.test(error.message))throw error
 files.push(file)
}
const results=[];let position=0
await Promise.all(Array.from({length:6},async()=>{while(position<files.length){const file=files[position++],local=file.startsWith('regions/')||file.startsWith('fishing/')?'public/'+file:batch+'/'+file,response=await fetch(`${url}/storage/v1/object/public/collectibles/${file}`);if(!response.ok)throw Error('Public asset unavailable: '+file+' '+response.status);const actual=Buffer.from(await response.arrayBuffer()),expected=fs.readFileSync(local),hash=b=>createHash('sha256').update(b).digest('hex');if(hash(actual)!==hash(expected))throw Error('Public byte mismatch '+file);results.push({path:file,sha256:hash(actual),bytes:actual.length})}}))
fs.writeFileSync(batch+'/upload-verification.json',JSON.stringify({project:'ewafafphiovbpjwogwzn',checkedAt:new Date().toISOString(),scope:'Only the new Hangang public assets; not frontend deployment or full database compatibility',files:results.sort((a,b)=>a.path.localeCompare(b.path))},null,2)+'\n')
console.log(JSON.stringify({verified:results.length,project:'ewafafphiovbpjwogwzn'}))
