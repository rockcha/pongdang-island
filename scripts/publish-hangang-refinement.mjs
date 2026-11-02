import fs from 'node:fs'
import path from 'node:path'
import {loadEnvFile} from 'node:process'
import {spawnSync} from 'node:child_process'
import {createHash} from 'node:crypto'
import {batch,items} from './prepare-hangang-refinement.mjs'
loadEnvFile('.env.storage.local')
const url=process.env.SUPABASE_URL
if(new URL(url).hostname!=='ewafafphiovbpjwogwzn.supabase.co')throw Error('Unexpected target')
const files=[...items.flatMap(i=>[i.sprite_sheet_path,...(i.compatibility_path?[i.compatibility_path]:[])]),items.find(i=>i.id==='hangang-mago-creator').thumbnail_path],stage='tmp/hangang-refinement-upload'
for(const p of files){fs.mkdirSync(path.dirname(stage+'/'+p),{recursive:true});fs.copyFileSync(batch+'/'+p,stage+'/'+p)}
const r=spawnSync(process.execPath,['scripts/upload-collectibles.mjs',stage],{stdio:'inherit'})
if(r.status!==0)throw Error('Upload failed')
const results=[]
for(const p of files){
 fs.copyFileSync(stage+'/'+p,batch+'/'+p)
 const response=await fetch(url+'/storage/v1/object/public/collectibles/'+p)
 if(!response.ok)throw Error('Public asset missing '+p)
 const expected=fs.readFileSync(batch+'/'+p),actual=Buffer.from(await response.arrayBuffer()),hash=b=>createHash('sha256').update(b).digest('hex')
 if(hash(expected)!==hash(actual))throw Error('Public byte mismatch '+p)
 results.push({path:p,bytes:actual.length,sha256:hash(actual)})
}
for(const i of items.filter(i=>i.frames===8))fs.copyFileSync(batch+'/'+i.sprite_sheet_path,`public/aquarium/swim/${i.id}_swim8_v2_sprite.png`)
fs.writeFileSync(batch+'/upload-verification.json',JSON.stringify({project:'ewafafphiovbpjwogwzn',checkedAt:new Date().toISOString(),scope:'Only the eight new immutable Hangang refinement files',files:results},null,2)+'\n')
console.log(JSON.stringify({verified:results.length}))
