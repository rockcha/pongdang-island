import {readFile,writeFile,mkdir} from 'node:fs/promises'
import sharp from 'sharp'
import {createHash} from 'node:crypto'
const read=async p=>JSON.parse(await readFile(p,'utf8'))
const registration=await read('src/features/pets/pet-motion-registration.json')
const stages=await read('src/features/pets/pet-render-layouts.json')
const ground=await read('src/features/pets/pet-ground-offsets.json')
const eyes=(await read('assets/storage-upload/new/20261110-160000/motion-landmarks.json')).pets
// Reviewed forehead patches in a 400px source cell: follow the head, never
// recenter to a moving tail, paw or the changing outer silhouette.
const atlasPatches={
 'maple-panda':[214,145,64,20], 'poka-shark':[230,125,64,20],
 'acorn-squirrel':[236,136,32,16], 'hedge-pin':[213,139,64,20],
 'bonbon-triceratops':[234,151,26,16], 'nurung-fox':[208,135,64,20],
 'ppinu-penguin':[198,125,64,20], 'coco-capybara':[246,113,64,20],
 'peach-axolotl':[205,120,64,20], 'cloud-alpaca':[206,126,64,20],
}
const offsets={},review={}
await mkdir('tmp/pet-horizontal-review',{recursive:true})
function samples(frame,box){
 const [x,y,w,h]=box,points=[]
 for(let py=y;py<y+h;py+=2)for(let px=x;px<x+w;px+=2){const i=(py*400+px)*4;if(frame[i+3]>=220)points.push([px,py,frame[i],frame[i+1],frame[i+2]])}
 if(points.length<w*h/4*.9)throw Error(`Insufficient opaque head patch: ${box}`)
 const mean=[2,3,4].map(c=>points.reduce((a,p)=>a+p[c],0)/points.length)
 const variance=points.reduce((a,p)=>a+(p[2]-mean[0])**2+(p[3]-mean[1])**2+(p[4]-mean[2])**2,0)/(points.length*3)
 if(variance<15)throw Error(`Featureless patch: ${box}, variance=${variance}`)
 return points
}
function match(frame,points,expectedY,yRadius=24){
 function score(dx,dy){let sum=0;for(const [x,y,r,g,b] of points){const at=((y+dy)*400+x+dx)*4;if(frame[at+3]<200)return Infinity;sum+=Math.min(12288,(frame[at]-r)**2+(frame[at+1]-g)**2+(frame[at+2]-b)**2)}return sum/(points.length*3)}
 let best={dx:0,dy:0,error:score(0,0)}
 const improve=(dx,dy)=>{const error=score(dx,dy);if(error<best.error||(error===best.error&&Math.abs(dx)+Math.abs(dy)<Math.abs(best.dx)+Math.abs(best.dy)))best={dx,dy,error}}
 for(let dy=expectedY-yRadius;dy<=expectedY+yRadius;dy+=2)for(let dx=-32;dx<=32;dx+=2)improve(dx,dy)
 const coarse=best
 for(let dy=coarse.dy-2;dy<=coarse.dy+2;dy++)for(let dx=coarse.dx-2;dx<=coarse.dx+2;dx++)improve(dx,dy)
 if(!Number.isFinite(best.error)||Math.sqrt(best.error)>48||Math.abs(best.dx)>=32||Math.abs(best.dy-expectedY)>=yRadius)throw Error(`Head match needs review: ${JSON.stringify({...best,expectedY})}`)
 return {...best,rmse:Number(Math.sqrt(best.error).toFixed(3))}
}
for(const id of [...Object.keys(registration),...Object.keys(atlasPatches)]){
 const atlas=id in atlasPatches;offsets[id]={};review[id]={}
 for(const kind of atlas?['atlas']:['idle','happy','eat','needs']){
  const suffix=atlas?'atlas16_v1':kind==='idle'?'idle8_v2':`${kind}8_v1`,path=`public/pets/${id}_${suffix}_sprite.png`
  const meta=await sharp(path).metadata(),cell=meta.width/4,frames=[]
  for(let f=0;f<(atlas?16:8);f++)frames.push(await sharp(path).extract({left:f%4*cell,top:Math.floor(f/4)*cell,width:cell,height:cell}).resize(400,400).ensureAlpha().raw().toBuffer())
  const eye=atlas?null:eyes[id][kind],cx=eye?(eye[0][0]+eye[1][0])/2:0,cy=eye?(eye[0][1]+eye[1][1])/2:0
  const box=atlas?atlasPatches[id]:id==='sand-golem'?[Math.round(cx-16),Math.round(cy-40),32,14]:[Math.round(cx-24),Math.round(cy-(id==='jelly-seal'?48:44)),48,18]
  const points=samples(frames[0],box),scale=atlas?1.75:registration[id][kind].scale*stages[id].scale
  const matches=[]
  for(let f=0;f<frames.length;f++){
   const yOffset=ground[id][atlas?'atlas':kind][f]
   const expectedY=Math.round(-yOffset/scale*400/cell)
   try{
    const baseFrame=atlas ? f<12?Math.floor(f/4)*4:f<14?12:14 : 0
    if(baseFrame===f||baseFrame===0)matches.push({...match(frames[f],points,expectedY,id==='coco-capybara'?40:24),templateFrame:0,templatePatch:box})
    else{
     const base=matches[baseFrame],patch=[box[0]+base.dx,box[1]+base.dy,box[2],box[3]]
     const own=samples(frames[baseFrame],patch)
     const baseExpected=Math.round(-ground[id].atlas[baseFrame]/scale*400/cell)
     const local=match(frames[f],own,expectedY-baseExpected)
     matches.push({...local,dx:base.dx+local.dx,dy:base.dy+local.dy,templateFrame:baseFrame,templatePatch:patch})
    }
   }catch(e){throw Error(`${id}/${kind}/${f}: ${e.message}`)}
  }
  offsets[id][kind]=matches.map(m=>Number((-m.dx*cell/400*scale).toFixed(6)))
  review[id][kind]={path,sourceSha256:createHash('sha256').update(await readFile(path)).digest('hex'),cell,patch:box,samples:points.length,matches}
 }
 console.log(id,JSON.stringify(offsets[id]))
}
await writeFile('src/features/pets/pet-horizontal-offsets.json',JSON.stringify(offsets,null,2)+'\n')
await writeFile('tmp/pet-horizontal-review/registration.json',JSON.stringify(review,null,2)+'\n')
await writeFile('assets/storage-upload/new/20261111-160000/horizontal-registration.json',JSON.stringify(review,null,2)+'\n')
