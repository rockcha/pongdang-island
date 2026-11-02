import fs from 'node:fs'
import sharp from 'sharp'
const refinement=process.argv.includes('--refinement')
const {batch,items}=await import(refinement?'./prepare-hangang-refinement.mjs':'./prepare-hangang-assets.mjs')
const read=p=>JSON.parse(fs.readFileSync(p,'utf8').replace(/^\uFEFF/,''))
const partial=process.argv.includes('--partial'),four=refinement?read('src/features/aquarium/hangang-frame-layouts.json'):{},eight=refinement?read('src/features/aquarium/hangang-mythic-action-layouts.json').filter(r=>!items.some(i=>i.frames===8&&i.id===r.id)):[],records=[],audits=[],overlays=[]
const pix=(d,w,x,y)=>(y*w+x)*4
for(const item of items.filter(i=>i.kind==='fish')){
 const source=`${batch}/sources/${item.id}-sprite.source`
 if(!fs.existsSync(source)){if(partial)continue;throw Error('Missing original sprite '+item.id)}
 const raw=await sharp(source).ensureAlpha().raw().toBuffer({resolveWithObject:true}),columns=item.frames/2,cell=Math.ceil(Math.max(raw.info.width/columns,raw.info.height/2))
 if(Math.abs(raw.info.width/columns-raw.info.height/2)>1)throw Error('Non-square sprite cells '+item.id)
 // Generated 2:1 canvases can be 1774x887: grid boundaries fall on half pixels.
 // Partition at rounded boundaries and add at most one transparent pixel per cell.
 // Every original RGBA pixel is copied exactly once; no resizing or cropping.
 const info={width:cell*columns,height:cell*2},data=Buffer.alloc(info.width*info.height*4)
 for(let frame=0;frame<item.frames;frame++){
  const col=frame%columns,row=Math.floor(frame/columns),left=Math.round(col*raw.info.width/columns),right=Math.round((col+1)*raw.info.width/columns),top=Math.round(row*raw.info.height/2),bottom=Math.round((row+1)*raw.info.height/2)
  for(let y=top;y<bottom;y++)raw.data.copy(data,((row*cell+y-top)*info.width+col*cell)*4,(y*raw.info.width+left)*4,(y*raw.info.width+right)*4)
 }
 const bounds=[]
 for(let frame=0;frame<item.frames;frame++){
  const ox=frame%columns*cell,oy=Math.floor(frame/columns)*cell;let left=cell,top=cell,right=-1,bottom=-1,opaque=0
  for(let y=0;y<cell;y++)for(let x=0;x<cell;x++)if(data[pix(data,info.width,x+ox,y+oy)+3]>=32){left=Math.min(left,x);top=Math.min(top,y);right=Math.max(right,x);bottom=Math.max(bottom,y);opaque++}
  const margin=Math.min(left,top,cell-right-1,cell-bottom-1)
  if(!opaque||margin<(item.frames===8?cell*.08:2))throw Error('Unsafe ORIGINAL cell '+item.id+' frame '+frame+' margin '+margin)
  bounds.push({frame,left,top,width:right-left+1,height:bottom-top+1,opaque,margin})
 }
 const b=bounds[0],size=Math.max(24,Math.round(cell*.06)),candidates=[]
 const manual=(refinement?{'hangang-mago-creator':[313,100,24,24],'hangang-red-cheer-incarnation':[308,187,27,27]}:{
  'hangang-pungmul-seabass':[470,360,38,38],
  'hangang-seven-branched-blade':[95,325,30,30],
  'hangang-ungnyeo-mother':[260,137,24,24],
  'hangang-red-cheer-incarnation':[302,249,27,27],
 })[item.id]
 const hint=refinement?(item.id.includes('mago')?[.7,.18]:item.id.includes('red-cheer')?[.78,.35]:[.85,.38]):item.id.includes('moon-white-tiger')?[.87,.46]:item.id.includes('turtle-ship')?[.5,.45]:item.id.includes('hunmin')?[.5,.65]:item.rarity==='mythic'?[.52,.45]:[.68,.42]
 for(const fx of [hint[0]-.12,hint[0],hint[0]+.12])for(const fy of [hint[1]-.12,hint[1],hint[1]+.12]){
  const x=manual?manual[0]:Math.round(b.left+b.width*fx-size/2),y=manual?manual[1]:Math.round(b.top+b.height*fy-size/2),patchSize=manual?manual[2]:size;if(x<0||y<0||x+patchSize>=cell||y+patchSize>=cell)continue
  let samples=0,opaque=0,sum=0,sum2=0;const points=[]
  for(let py=y;py<y+patchSize;py+=3)for(let px=x;px<x+patchSize;px+=3){samples++;const at=pix(data,info.width,px,py);if(data[at+3]>=128){opaque++;points.push([px,py,at]);const v=(data[at]+data[at+1]+data[at+2])/3;sum+=v;sum2+=v*v}}
  const contrast=opaque?Math.sqrt(Math.max(0,sum2/opaque-(sum/opaque)**2)):0
  if(opaque>=20&&opaque>=samples*.7&&contrast>=7)candidates.push({patch:[x,y,patchSize,patchSize],points,contrast})
  if(manual)break
 }
 candidates.sort((a,b)=>b.contrast-a.contrast)
 if(!candidates.length)throw Error('No visible opaque rigid anchor '+item.id)
 let best
 for(const candidate of candidates.slice(0,3)){
  const frames=[{frame:0,dx:0,dy:0,rmse:0}];let total=0
  for(let frame=1;frame<item.frames;frame++){
   const ox=frame%columns*cell,oy=Math.floor(frame/columns)*cell,range=Math.round(cell*(refinement&&item.id==='hangang-mago-creator'?.08:.25));let match={dx:0,dy:0,error:Infinity}
   for(const step of [3,1]){
    const reach=step===3?range:3,cx=step===3?0:match.dx,cy=step===3?0:match.dy
    for(let dy=cy-reach;dy<=cy+reach;dy+=step)for(let dx=cx-reach;dx<=cx+reach;dx+=step){
     const [x,y,w,h]=candidate.patch;if(x+dx<0||y+dy<0||x+dx+w>=cell||y+dy+h>=cell)continue
     let error=0
     for(const [px,py,at] of candidate.points){const target=pix(data,info.width,px+dx+ox,py+dy+oy);for(let k=0;k<4;k++){const diff=data[at+k]-data[target+k];error+=diff*diff}}
     error/=candidate.points.length*4
     if(error<match.error)match={dx,dy,error}
    }
   }
   const rmse=Math.sqrt(match.error);frames.push({frame,dx:match.dx,dy:match.dy,rmse});total+=rmse
  }
  if(!best||total<best.total)best={...candidate,frames,total}
 }
 if(best.frames.some(f=>!Number.isFinite(f.rmse)||f.rmse>60))throw Error('Rigid anchor mismatch; inspect and regenerate '+item.id)
 const padding=Math.ceil(Math.max(...best.frames.flatMap(f=>[Math.abs(f.dx),Math.abs(f.dy)])))+8,newCell=cell+padding*2,width=newCell*columns,height=newCell*2,out=Buffer.alloc(width*height*4)
 for(const f of best.frames){
  const ox=f.frame%columns*cell,oy=Math.floor(f.frame/columns)*cell,nx=f.frame%columns*newCell+padding-f.dx,ny=Math.floor(f.frame/columns)*newCell+padding-f.dy
  for(let y=0;y<cell;y++)data.copy(out,((ny+y)*width+nx)*4,((oy+y)*info.width+ox)*4,((oy+y)*info.width+ox+cell)*4)
 }
 const file=batch+'/'+item.sprite_sheet_path,bytes=await sharp(out,{raw:{width,height,channels:4}}).png().toBuffer()
 if(!(await sharp(bytes).ensureAlpha().raw().toBuffer()).equals(out))throw Error('RGBA export mismatch '+item.id)
 fs.writeFileSync(file,bytes)
 const scale=Number((.84/Math.max(...bounds.map(f=>Math.max(f.width,f.height)/newCell))).toFixed(6)),shifts=Array.from({length:item.frames},()=>[0,0])
 if(item.frames===8){
  const version=refinement?2:1
  eight.push({id:item.id,aliases:[item.id,item.id+'_swim8_v1',item.id+'_compat_v1',...(refinement?[item.id+'_swim8_v2',item.id+'_compat_v2']:[])],cell:newCell,scale,shifts,assetVersion:version});fs.mkdirSync('public/aquarium/swim',{recursive:true});fs.copyFileSync(file,`public/aquarium/swim/${item.id}_swim8_v${version}_sprite.png`)
  const compat=Buffer.alloc(newCell*newCell*16)
  for(let frame=0;frame<4;frame++)for(let y=0;y<newCell;y++)out.copy(compat,((Math.floor(frame/2)*newCell+y)*newCell*2+frame%2*newCell)*4,(y*width+frame*newCell)*4,(y*width+(frame+1)*newCell)*4)
  await sharp(compat,{raw:{width:newCell*2,height:newCell*2,channels:4}}).png().toFile(`${batch}/fish/mythic/${item.id}_compat_v${version}_sprite.png`)
 }else four[item.sprite_sheet_path]={cell:newCell,scale,shifts}
 const [px,py,pw,ph]=best.patch
 overlays.push({id:item.id,input:await sharp(data,{raw:{width:info.width,height:info.height,channels:4}}).extract({left:0,top:0,width:cell,height:cell}).resize(240,240).composite([{input:Buffer.from(`<svg width="240" height="240"><rect x="${px/cell*240}" y="${py/cell*240}" width="${pw/cell*240}" height="${ph/cell*240}" fill="none" stroke="#ff316f" stroke-width="2"/></svg>`)}]).png().toBuffer()})
 records.push({id:item.id,storage_path:item.sprite_sheet_path,sourceDimensions:[raw.info.width,raw.info.height],sourceCell:cell,cell:newCell,padding,scale,patch:best.patch,opaqueSamples:best.points.length,contrast:best.contrast,frames:best.frames,rgbaPreserved:true,method:'Rounded source grid boundaries; at most one transparent pixel added per cell; opaque rigid-patch RGB registration; inverse integer translation encoded in PNG; uniform padding and scale; no source pixel discarded'})
 records.at(-1).rawAudit={bounds}
 audits.push({id:item.id,width:raw.info.width,height:raw.info.height,normalizedWidth:info.width,normalizedHeight:info.height,frames:bounds,valid:true})
}
fs.mkdirSync(batch+'/review',{recursive:true})
for(let start=0;start<overlays.length;start+=8){const layers=overlays.slice(start,start+8).map((o,n)=>({input:o.input,left:n%4*240,top:Math.floor(n/4)*240}));await sharp({create:{width:960,height:480,channels:4,background:'#173744'}}).composite(layers).png().toFile(`${batch}/review/anchors-${start}.png`)}
fs.writeFileSync(batch+'/registration.json',JSON.stringify(records,null,2)+'\n')
fs.writeFileSync(batch+'/raw-sprite-audit.json',JSON.stringify({assets:audits},null,2)+'\n')
fs.writeFileSync('src/features/aquarium/hangang-frame-layouts.json',JSON.stringify(four,null,2)+'\n')
fs.writeFileSync('src/features/aquarium/hangang-mythic-action-layouts.json',JSON.stringify(eight,null,2)+'\n')
console.log(JSON.stringify({aligned:records.length,expected:items.filter(i=>i.frames>1).length,rawMarginChecked:true,rgbaPreserved:true}))
