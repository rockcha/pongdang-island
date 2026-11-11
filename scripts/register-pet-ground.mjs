import {readFile,writeFile} from 'node:fs/promises'
import sharp from 'sharp'

const read=async path=>JSON.parse(await readFile(path,'utf8'))
const registration=await read('src/features/pets/pet-motion-registration.json')
const stages=await read('src/features/pets/pet-render-layouts.json')
const atlasIds=(await read('assets/storage-upload/new/20261111-160000/manifest.json')).items.map(p=>p.id)
const offsets={}
for(const id of [...Object.keys(registration),...atlasIds]){
 const atlas=atlasIds.includes(id),grounds={}
 for(const kind of atlas?['atlas']:['idle','happy','eat','needs']){
  const suffix=atlas?'atlas16_v1':kind==='idle'?'idle8_v2':`${kind}8_v1`
  const {data,info}=await sharp(`public/pets/${id}_${suffix}_sprite.png`).ensureAlpha().raw().toBuffer({resolveWithObject:true})
  const cell=info.width/4,scale=atlas?1.75:registration[id][kind].scale*stages[id].scale
  const y=atlas?0:stages[id].anchor[1]-registration[id][kind].anchor[1]*scale
  grounds[kind]=[]
  for(let frame=0;frame<(atlas?16:8);frame++){
   let ground=-1
   // A solid support row ignores isolated fur pixels, particles and shadows.
   for(let cy=0;cy<cell;cy++){
    let count=0
    for(let cx=0;cx<cell;cx++)if(data[((Math.floor(frame/4)*cell+cy)*info.width+frame%4*cell+cx)*4+3]>=128)count++
    if(count>=cell*.035)ground=cy
   }
   if(ground<0)throw Error(`No opaque support row: ${id}/${kind}/${frame}`)
   grounds[kind].push(y+ground*scale)
  }
 }
 const baseline=(grounds.idle??grounds.atlas)[0]
 offsets[id]={floor:Number(baseline.toFixed(6)),...Object.fromEntries(Object.entries(grounds).map(([kind,rows])=>[kind,rows.map(y=>Number((baseline-y).toFixed(6)))]))}
}
await writeFile('src/features/pets/pet-ground-offsets.json',JSON.stringify(offsets,null,2)+'\n')
console.log(`Registered fixed ground for ${Object.keys(offsets).length} pets; translation only, no image changes or per-frame scaling.`)
