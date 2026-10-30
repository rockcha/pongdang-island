import fs from 'node:fs'
import {createHash} from 'node:crypto'
import {batch,items} from './prepare-pharaoh-assets.mjs'
import {uploadRoot,uploadPaths} from './prepare-pharaoh-upload.mjs'
const project='ewafafphiovbpjwogwzn',hash=b=>createHash('sha256').update(b).digest('hex'),verified=[]
for(let offset=0;offset<uploadPaths.length;offset+=4){
 const rows=await Promise.all(uploadPaths.slice(offset,offset+4).map(async p=>{
  const bytes=fs.readFileSync(uploadRoot+'/'+p),url=`https://${project}.supabase.co/storage/v1/object/public/collectibles/${p}`,r=await fetch(url)
  if(!r.ok||hash(Buffer.from(await r.arrayBuffer()))!==hash(bytes))throw Error('Public bytes mismatch '+p)
  // Store exactly the uploaded losslessly compressed bytes as the final asset.
  fs.writeFileSync(batch+'/'+p,bytes)
  const item=items.find(i=>i.sprite_sheet_path===p&&i.rarity==='mythic')
  if(item)fs.copyFileSync(batch+'/'+p,`public/aquarium/swim/${item.id}_swim8_v1_sprite.png`)
  return {path:p,sha256:hash(bytes),bytes:bytes.length}
 }))
 verified.push(...rows)
}
fs.writeFileSync(batch+'/storage-verification.json',JSON.stringify({project,verified_at:new Date().toISOString(),scope:'Public bytes of 93 collectibles/rod images, not frontend deployment',count:verified.length,files:verified},null,2)+'\n')
const m=JSON.parse(fs.readFileSync(batch+'/manifest.json'));for(const a of m.assets){a.sha256=hash(fs.readFileSync(a.target));const p=a.target.startsWith(batch+'/')?a.target.slice(batch.length+1):null;if(p&&uploadPaths.includes(p)){a.uploaded=true;a.uploaded_project=project;a.storage_path=p}}m.uploaded=true;m.status='images-uploaded';fs.writeFileSync(batch+'/manifest.json',JSON.stringify(m,null,2)+'\n')
console.log(JSON.stringify({project,verified:verified.length}))
