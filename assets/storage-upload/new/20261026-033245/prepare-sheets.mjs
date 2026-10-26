import fs from 'node:fs'
import path from 'node:path'
import sharp from 'sharp'
const root='assets/storage-upload/new/20261026-033245'
const read=file=>JSON.parse(fs.readFileSync(file,'utf8').replace(/^\uFEFF/,''))
const manifest=read(root+'/manifest.json'),audit=read(root+'/raw-audit.json')
const registrations=read(root+'/raw-registration.json')
const finalConfig=[],report=[]
for(const item of manifest.items){
 const raw=audit.find(a=>a.id===item.id),registration=registrations.find(r=>r.file===item.sheetSource)
 if(!raw||!registration)continue
 const columns=item.frames===8?4:2,cell=512
 const aligned=raw.frames.map(([x,y,w,h],i)=>({x:x-registration.frames[i].dx,y:y-registration.frames[i].dy,w,h}))
 const left=Math.min(...aligned.map(b=>b.x)),top=Math.min(...aligned.map(b=>b.y))
 const right=Math.max(...aligned.map(b=>b.x+b.w)),bottom=Math.max(...aligned.map(b=>b.y+b.h))
 const scale=.82*cell/Math.max(right-left,bottom-top)
 const translateX=cell/2-(left+right)*scale/2,translateY=cell/2-(top+bottom)*scale/2
 const composites=[]
 for(let frame=0;frame<item.frames;frame++){
  const offset=registration.frames[frame],padding=1024
  const x=Math.round(translateX-offset.dx*scale),y=Math.round(translateY-offset.dy*scale)
  const crop=await sharp(item.sheetSource).extract({left:Math.round(frame%columns*raw.cell),top:Math.round(Math.floor(frame/columns)*raw.cell),width:Math.floor(raw.cell),height:Math.floor(raw.cell)}).png().toBuffer()
  const padded=await sharp(crop).resize(Math.round(raw.cell*scale),Math.round(raw.cell*scale))
   .extend({top:padding,bottom:padding,left:padding,right:padding,background:'#00000000'}).png().toBuffer()
  const pixels=await sharp(padded).extract({left:padding-x,top:padding-y,width:cell,height:cell}).png().toBuffer()
  composites.push({input:pixels,left:frame%columns*cell,top:Math.floor(frame/columns)*cell})
 }
 const destination=path.join(root,item.sprite_sheet_path)
 fs.mkdirSync(path.dirname(destination),{recursive:true})
 await sharp({create:{width:columns*cell,height:2*cell,channels:4,background:'#00000000'}}).composite(composites).png().toFile(destination)
 const [px,py,pw,ph]=registration.patch
 const patch=[Math.round(px*scale+translateX),Math.round(py*scale+translateY),Math.max(15,Math.round(pw*scale)),Math.max(15,Math.round(ph*scale))]
 finalConfig.push({file:destination,storage_path:item.sprite_sheet_path,patch})
 report.push({id:item.id,method:'One scale and common centering for all poses; measured rigid-body translations baked into cells',cell,scale,translateX,translateY,rawOffsets:registration.frames})
}
fs.writeFileSync(root+'/final-anchor-config.json',JSON.stringify(finalConfig,null,2)+'\n')
fs.writeFileSync(root+'/final-anchor-config-four.json',JSON.stringify(finalConfig.filter(c=>!c.storage_path.includes('_swim8')),null,2)+'\n')
fs.writeFileSync(root+'/final-anchor-config-eight.json',JSON.stringify(finalConfig.filter(c=>c.storage_path.includes('_swim8')),null,2)+'\n')
fs.writeFileSync(root+'/normalization.json',JSON.stringify(report,null,2)+'\n')
console.log('Normalized '+report.length+' sheets without frame-specific scaling.')
