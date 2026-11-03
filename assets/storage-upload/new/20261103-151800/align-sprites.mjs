import fs from 'node:fs'
import path from 'node:path'
import {fileURLToPath} from 'node:url'
import sharp from 'sharp'
const batch=path.dirname(fileURLToPath(import.meta.url))
const parse=file=>JSON.parse(fs.readFileSync(path.join(batch,file),'utf8').replace(/^\uFEFF/,''))
const manifest=parse('manifest.json'),anchors=parse('anchors-original.json'),finalConfig=[]
for(const item of manifest.items.filter(i=>i.frames===4)){
 const measured=anchors.find(a=>a.storage_path===item.sprite_sheet_path)
 if(!measured)throw Error('Missing measured anchors for '+item.id)
 const {data,info}=await sharp(path.join(batch,'sources',item.id+'-sprite.source')).ensureAlpha().raw().toBuffer({resolveWithObject:true})
 if(info.width!==info.height||info.width%2)throw Error('Invalid original sheet')
 const sourceCell=info.width/2,padding=Math.max(16,...measured.frames.map(f=>Math.max(Math.abs(f.dx),Math.abs(f.dy))+8)),cell=sourceCell+padding*2,width=cell*2
 const output=Buffer.alloc(width*width*4)
 for(const f of measured.frames){
  if(!Number.isFinite(f.rmse)||f.rmse>25||!Number.isInteger(f.dx)||!Number.isInteger(f.dy))throw Error('Unusable rigid anchor')
  const ox=f.frame%2*sourceCell,oy=Math.floor(f.frame/2)*sourceCell,dx=f.frame%2*cell+padding-f.dx,dy=Math.floor(f.frame/2)*cell+padding-f.dy
  for(let y=0;y<sourceCell;y++){const offset=((oy+y)*info.width+ox)*4;data.copy(output,((dy+y)*width+dx)*4,offset,offset+sourceCell*4)}
 }
 const file=path.join(batch,item.sprite_sheet_path)
 await sharp(output,{raw:{width,height:width,channels:4}}).png().toFile(file)
 const decoded=await sharp(file).ensureAlpha().raw().toBuffer()
 if(!decoded.equals(output))throw Error('RGBA changed during PNG encoding')
 item.spritePreparation={source:'sources/'+item.id+'-sprite.source',sourceCell,cell,padding,method:'Integer translation of full cells; common transparent padding; no resizing or alpha modification',rgbaPreserved:true,anchors:measured.frames}
 const [x,y,w,h]=measured.patch
 finalConfig.push({file:path.relative(process.cwd(),file).replaceAll('\\','/'),storage_path:item.sprite_sheet_path,patch:[x+padding,y+padding,w,h]})
}
fs.writeFileSync(path.join(batch,'anchors-final-config.json'),JSON.stringify(finalConfig,null,2)+'\n')
fs.writeFileSync(path.join(batch,'manifest.json'),JSON.stringify(manifest,null,2)+'\n')
console.log(manifest.items.filter(i=>i.frames===4).map(i=>({id:i.id,cell:i.spritePreparation.cell,rgbaPreserved:i.spritePreparation.rgbaPreserved})))
