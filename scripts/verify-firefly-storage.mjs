import {readFileSync,writeFileSync} from 'node:fs'
import {createHash} from 'node:crypto'
import {batch,items} from './prepare-firefly-assets.mjs'
const project='ewafafphiovbpjwogwzn'
const paths=[...items.flatMap(i=>[i.thumbnail_path,...(i.sprite_sheet_path?[i.sprite_sheet_path]:[])]),...['thumbnail','reel-frame','reel-rotor','float'].map(p=>`equipment/rods/firefly/${p}.png`)]
if(paths.length!==104||new Set(paths).size!==104)throw Error('Incorrect fairy image roster')
const hash=b=>createHash('sha256').update(b).digest('hex'),verified=[]
for(let offset=0;offset<paths.length;offset+=4){
 const rows=await Promise.all(paths.slice(offset,offset+4).map(async path=>{
  const bytes=readFileSync(batch+'/'+path),url=`https://${project}.supabase.co/storage/v1/object/public/collectibles/${path}`
  const response=await fetch(url)
  if(!response.ok)throw Error('Cannot read public image: '+path+' HTTP '+response.status)
  const remote=Buffer.from(await response.arrayBuffer()),sha256=hash(bytes)
  if(hash(remote)!==sha256)throw Error('Public image differs: '+path)
  return {path,sha256,bytes:bytes.length}
 }))
 verified.push(...rows)
}
writeFileSync(batch+'/storage-verification.json',JSON.stringify({project,verifiedAt:new Date().toISOString(),scope:'Public bytes of the 104 fairy collectible and rod images only; not frontend deployment.',count:verified.length,files:verified},null,2)+'\n')
console.log(JSON.stringify({project,verified:verified.length}))
