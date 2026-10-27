import fs from 'node:fs'
import path from 'node:path'
import crypto from 'node:crypto'
import sharp from 'sharp'

// Repack complete generated cells at one shared scale. Never synthesize poses,
// tightly crop individual silhouettes, or hide source clipping by shrinking it.
const root='assets/storage-upload/new/20261027-154009'
const {species}=JSON.parse(fs.readFileSync(root+'/plan.json','utf8'))
const cell=640,inner=512
const overrides=JSON.parse(fs.readFileSync(root+'/anchor-patches.json','utf8'))
const hash=b=>crypto.createHash('sha256').update(b).digest('hex')
function bounds(data,width,height,ox=0,oy=0,sw=width,sh=height){
 let x0=sw,y0=sh,x1=-1,y1=-1,n=0
 for(let y=0;y<sh;y++)for(let x=0;x<sw;x++)if(data[((y+oy)*width+x+ox)*4+3]>=32){x0=Math.min(x0,x);y0=Math.min(y0,y);x1=Math.max(x1,x);y1=Math.max(y1,y);n++}
 if(!n)throw Error('Empty frame')
 return {x:x0,y:y0,width:x1-x0+1,height:y1-y0+1,pixels:n,margin:Math.min(x0,y0,sw-x1-1,sh-y1-1)}
}
function patchFor(data,width,box){
 const size=32,target=[box.x+box.width*.72,box.y+box.height*.40]
 let best
 for(let y=box.y+16;y<box.y+box.height-size;y+=8)for(let x=box.x+16;x<box.x+box.width-size;x+=8){
  let n=0,texture=0
  for(let py=0;py<size;py+=3)for(let px=0;px<size;px+=3){const a=((y+py)*width+x+px)*4;if(data[a+3]>192){n++;texture+=Math.abs(data[a]-data[a+4])+Math.abs(data[a+1]-data[a+5])}}
  if(n<100)continue
  const score=Math.hypot(x+size/2-target[0],y+size/2-target[1])-Math.min(20,texture/100)
  if(!best||score<best.score)best={x,y,width:size,height:size,score}
 }
 if(!best)throw Error('No opaque rigid anchor patch')
 return best
}
function register(data,width,columns,patch,frame){
 if(frame===0)return {dx:0,dy:0,rmse:0}
 const ox=frame%columns*cell,oy=Math.floor(frame/columns)*cell
 let best={error:Infinity,dx:0,dy:0}
 for(let pass=0;pass<2;pass++){
  const cx=best.dx,cy=best.dy,range=pass===0?64:3,step=pass===0?4:1
  for(let dy=cy-range;dy<=cy+range;dy+=step)for(let dx=cx-range;dx<=cx+range;dx+=step){
   if(patch.x+dx<0||patch.x+patch.width+dx>=cell||patch.y+dy<0||patch.y+patch.height+dy>=cell)continue
   let error=0,n=0
   for(let y=0;y<patch.height;y+=3)for(let x=0;x<patch.width;x+=3){
    const a=((patch.y+y)*width+patch.x+x)*4,b=((patch.y+y+dy+oy)*width+patch.x+x+dx+ox)*4
    if(data[a+3]<128)continue
    for(let k=0;k<4;k++)error+=(data[a+k]-data[b+k])**2
    n+=4
   }
   if(n&&error/n<best.error)best={error:error/n,dx,dy}
  }
 }
 return {dx:best.dx,dy:best.dy,rmse:Math.sqrt(best.error)}
}
const audits=[],layouts={},mythics=[],facing=[]
const errors=[]
for(const s of species.filter(s=>s.frames)){
 try{
 const folder=`fish/${s.rarity==='common'?'normal':s.rarity}/`
 const storage=folder+s.id+(s.frames===8?'_swim8_v1':'_v1')+'_sprite.png'
 const file=root+'/'+storage,source=root+'/.source/'+path.basename(file)
 if(!fs.existsSync(source)){if(process.argv.includes('--partial'))continue;throw Error('Missing source: '+s.id)}
 const input=await sharp(source).ensureAlpha().raw().toBuffer({resolveWithObject:true}),{width,height}=input.info,columns=s.frames/2
 const cw=Math.floor(width/columns),ch=Math.floor(height/2),rawFrames=[]
 for(let f=0;f<s.frames;f++){
  const b=bounds(input.data,width,height,f%columns*cw,Math.floor(f/columns)*ch,cw,ch)
  if(b.margin<1)throw Error(`Clipped source ${s.id} frame ${f}: ${b.margin}`)
  if(s.frames===8&&b.margin<Math.min(cw,ch)*.08)throw Error(`Unsafe mythic source ${s.id} frame ${f}: ${b.margin}`)
  rawFrames.push(b)
 }
 const factor=inner/Math.max(cw,ch),rw=Math.round(cw*factor),rh=Math.round(ch*factor)
 const composites=[]
 for(let f=0;f<s.frames;f++)composites.push({input:await sharp(source).extract({left:f%columns*cw,top:Math.floor(f/columns)*ch,width:cw,height:ch}).resize(rw,rh).png().toBuffer(),left:f%columns*cell+Math.floor((cell-rw)/2),top:Math.floor(f/columns)*cell+Math.floor((cell-rh)/2)})
 const packed=await sharp({create:{width:columns*cell,height:2*cell,channels:4,background:'#00000000'}}).composite(composites).png().toBuffer()
 const data=await sharp(packed).ensureAlpha().raw().toBuffer(),frames=[]
 for(let f=0;f<s.frames;f++)frames.push(bounds(data,columns*cell,2*cell,f%columns*cell,Math.floor(f/columns)*cell,cell,cell))
 let patch=overrides[s.id]??patchFor(data,columns*cell,frames[0])
 if(patch.candidates){
  // Manually bounded rigid head/bezel regions, excluding walking claws and
  // opening iris/panels. Choose a textured opaque patch stable across poses.
  const candidates=patch.candidates;let chosen
  for(const x of candidates.x)for(const y of candidates.y){
   const p={x,y,width:candidates.size,height:candidates.size};let opaque=0,total=0
   for(let py=0;py<p.height;py+=3)for(let px=0;px<p.width;px+=3){total++;if(data[((y+py)*columns*cell+x+px)*4+3]>192)opaque++}
   if(opaque<total*.85)continue
   const score=Math.max(...Array.from({length:s.frames},(_,f)=>register(data,columns*cell,columns,p,f).rmse))
   if(!chosen||score<chosen.score)chosen={patch:p,score}
  }
  if(!chosen)throw Error('No opaque rigid head patch: '+s.id)
  patch=chosen.patch
 }
 const registration=[]
 for(let f=0;f<s.frames;f++)registration.push(register(data,columns*cell,columns,patch,f))
 if(registration.some(r=>!Number.isFinite(r.rmse)||r.rmse>60))throw Error('Anchor mismatch, inspect anatomy: '+s.id+' '+JSON.stringify(registration))
 fs.writeFileSync(file,packed)
 // Wide source margins protect animation. Compensate once for the whole
 // creature at runtime so small guide drawings do not shrink its game size.
 const scale=.84/Math.max(...frames.map(f=>Math.max(f.width,f.height)/cell))
 const shifts=registration.map(r=>[r.dx,r.dy])
 if(s.frames===8){const target='public/aquarium/swim/'+s.id+'_swim8_v1_sprite.png';fs.mkdirSync(path.dirname(target),{recursive:true});fs.writeFileSync(target,packed);mythics.push({id:s.id,aliases:[s.id,s.id+'_swim8_v1'],cell,scale,shifts,assetVersion:1})}
 else layouts[storage]={cell,scale,shifts}
 facing.push({id:s.id,path:storage,facing:'right',sha256:hash(packed)})
 audits.push({id:s.id,storage_path:storage,source,width:columns*cell,height:2*cell,cell,scale,rawWidth:width,rawHeight:height,rawFrames,rawAudit:{width,height,bounds:rawFrames.map(f=>[f.x,f.y,f.width,f.height,f.pixels])},frames,patch,registration,commonExportScale:factor,sha256:hash(packed)})
 console.log('Prepared '+s.id)
 }catch(error){errors.push({id:s.id,error:error.message});console.error(error.message)}
}
fs.writeFileSync(root+'/sprite-errors.json',JSON.stringify(errors,null,2)+'\n')
fs.writeFileSync(root+'/registration.json',JSON.stringify(audits,null,2)+'\n')
fs.writeFileSync(root+'/facing.json',JSON.stringify(facing,null,2)+'\n')
fs.writeFileSync('src/features/aquarium/mechsanctum-frame-layouts.json',JSON.stringify(layouts,null,2)+'\n')
fs.writeFileSync('src/features/aquarium/mechsanctum-mythic-action-layouts.json',JSON.stringify(mythics,null,2)+'\n')
if(errors.length)process.exitCode=1
