import fs from 'node:fs/promises'
import sharp from 'sharp'
const root='assets/storage-upload/new/20261104-141330'
const manifest=JSON.parse(await fs.readFile(`${root}/manifest.json`,'utf8'))
const registrations=JSON.parse((await fs.readFile(`${root}/raw-registration.json`,'utf8')).replace(/^\uFEFF/,''))
const report=[]
for(const item of manifest.items){
 const reg=registrations.find(r=>r.storage_path===item.sprite_sheet_path)
 const raw=await sharp(reg.file).ensureAlpha().raw().toBuffer({resolveWithObject:true})
 const cell=raw.info.width/2, pad=32, outCell=cell+pad*2
 const frames=[]
 for(let i=0;i<4;i++){
  const {dx,dy}=reg.frames[i]
  const pixels=await sharp(raw.data,{raw:raw.info}).extract({left:(i%2)*cell,top:Math.floor(i/2)*cell,width:cell,height:cell}).raw().toBuffer()
  let count=0,minX=cell,minY=cell,maxX=0,maxY=0,patchOpaque=0
  for(let y=0;y<cell;y++)for(let x=0;x<cell;x++)if(pixels[(y*cell+x)*4+3]){
   count++;minX=Math.min(minX,x-dx+pad);maxX=Math.max(maxX,x-dx+pad);minY=Math.min(minY,y-dy+pad);maxY=Math.max(maxY,y-dy+pad)
   if(x>=439+dx&&x<465+dx&&y>=276+dy&&y<302+dy&&pixels[(y*cell+x)*4+3]>240)patchOpaque++
  }
  if(minX<0||minY<0||maxX>=outCell||maxY>=outCell)throw Error(`Would clip ${item.id} frame ${i}`)
  if(patchOpaque<400)throw Error(`Transparent anchor ${item.id} ${i}: ${patchOpaque}`)
  const target=Buffer.alloc(outCell*outCell*4)
  for(let y=0;y<cell;y++)for(let x=0;x<cell;x++){
   const tx=x-dx+pad,ty=y-dy+pad
   pixels.copy(target,(ty*outCell+tx)*4,(y*cell+x)*4,(y*cell+x)*4+4)
  }
  frames.push({data:target,count,bounds:[minX,minY,maxX,maxY],patchOpaque})
 }
 const composites=await Promise.all(frames.map(async(f,i)=>({input:await sharp(f.data,{raw:{width:outCell,height:outCell,channels:4}}).png().toBuffer(),left:(i%2)*outCell,top:Math.floor(i/2)*outCell})))
 await sharp({create:{width:outCell*2,height:outCell*2,channels:4,background:'#00000000'}}).composite(composites).png().toFile(`${root}/${item.sprite_sheet_path}`)
 report.push({id:item.id,cell:outCell,padding:pad,translation:reg.frames,frames:frames.map(({data,...f})=>f)})
}
await fs.writeFile(`${root}/alignment.json`,JSON.stringify(report,null,2)+'\n')
await fs.writeFile(`${root}/final-anchor-config.json`,JSON.stringify(registrations.map(r=>({...r,file:`${root}/${r.storage_path}`,patch:[471,308,26,26]})),null,2)+'\n')
console.log('Aligned four sheets without clipping or per-frame scaling; all anchor patches opaque.')
