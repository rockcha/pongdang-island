import {readFile,writeFile} from 'node:fs/promises'
import sharp from 'sharp'
const read=async p=>JSON.parse(await readFile(p,'utf8'))
const old=(await read('assets/storage-upload/new/20261110-160000/motion-landmarks.json')).pets
const registration=await read('assets/storage-upload/new/20261111-160000/horizontal-registration.json')
const centers={
 'maple-panda':[[218,207],[275,188]],'poka-shark':[[231,193],[295,173]],
 'acorn-squirrel':[[229,194],[286,177]],'hedge-pin':[[208,212],[281,187]],
 'bonbon-triceratops':[[225,200],[285,176]],'nurung-fox':[[226,198],[287,179]],
 'ppinu-penguin':[[205,177],[270,160]],'coco-capybara':[[220,164],[310,144]],
 'peach-axolotl':[[205,194],[278,175]],'cloud-alpaca':[[220,201],[287,182]],
}
const layouts={},review={}
for(const id of [...Object.keys(old),...Object.keys(centers)]){
 const atlas=id in centers,r=registration[id][atlas?'atlas':'idle'],cell=r.cell
 layouts[id]={};review[id]={}
 for(const frame of atlas?[0,4,8]:[0]){
  const {data}=await sharp(r.path).extract({left:frame%4*cell,top:Math.floor(frame/4)*cell,width:cell,height:cell}).resize(400,400).ensureAlpha().raw().toBuffer({resolveWithObject:true})
  const shift=r.matches[frame],points=atlas?centers[id].map(([x,y])=>[x+shift.dx,y+shift.dy]):old[id].idle
  const boxes=[]
  for(const [cx,cy] of points){
   const mask=new Uint8Array(160000),seen=new Uint8Array(160000),parts=[]
   const x0=Math.max(0,Math.round(cx-32)),y0=Math.max(0,Math.round(cy-30)),x1=Math.min(399,Math.round(cx+32)),y1=Math.min(399,Math.round(cy+30))
   for(let y=y0;y<=y1;y++)for(let x=x0;x<=x1;x++){const i=(y*400+x)*4;if(data[i+3]>200&&.2126*data[i]+.7152*data[i+1]+.0722*data[i+2]<65)mask[y*400+x]=1}
   for(let p=0;p<mask.length;p++)if(mask[p]&&!seen[p]){
    const queue=[p];seen[p]=1;let l=400,t=400,right=0,b=0
    for(let j=0;j<queue.length;j++){const n=queue[j],x=n%400,y=Math.floor(n/400);l=Math.min(l,x);t=Math.min(t,y);right=Math.max(right,x);b=Math.max(b,y);for(const m of [n-1,n+1,n-400,n+400])if(m>=0&&m<mask.length&&mask[m]&&!seen[m]){seen[m]=1;queue.push(m)}}
    if(queue.length>=25&&right-l>=7&&b-t>=7)parts.push({pixels:queue.length,box:[l,t,right-l+1,b-t+1]})
   }
   const part=parts.sort((a,b)=>b.pixels-a.pixels)[0]
   if(!part)throw Error(`Missing eye: ${id}/${frame}/${cx},${cy}`)
   const [x,y,w,h]=part.box,pad=5
   boxes.push([(x-pad)*cell/400,(y-pad)*cell/400,(w+pad*2)*cell/400,(h+pad*2)*cell/400])
  }
  layouts[id][frame]=boxes;review[id][frame]={path:r.path,sourceSha256:r.sourceSha256,cell,expected:points,boxes}
 }
}
await writeFile('src/features/pets/pet-resting-eyes.json',JSON.stringify(layouts,null,2)+'\n')
await writeFile('assets/storage-upload/new/20261111-160000/resting-eye-registration.json',JSON.stringify(review,null,2)+'\n')
console.log('Registered two eye patches per resting pose for 14 pets')
