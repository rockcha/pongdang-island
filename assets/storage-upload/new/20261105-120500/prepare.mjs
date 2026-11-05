import fs from 'node:fs'
import sharp from 'sharp'
const root=new URL('.',import.meta.url),read=p=>JSON.parse(fs.readFileSync(new URL(p,root),'utf8').replace(/^\uFEFF/,''))
const source=await sharp(new URL('sources/galaxy-ananke-sprite.source',root).pathname.replace(/^\/([A-Z]:)/i,'$1')).ensureAlpha().raw().toBuffer({resolveWithObject:true})
const cell=Math.ceil(Math.max(source.info.width/4,source.info.height/2)),width=cell*4,height=cell*2,data=Buffer.alloc(width*height*4)
for(let f=0;f<8;f++){
 const col=f%4,row=Math.floor(f/4),left=Math.round(col*source.info.width/4),right=Math.round((col+1)*source.info.width/4),top=Math.round(row*source.info.height/2),bottom=Math.round((row+1)*source.info.height/2)
 for(let y=top;y<bottom;y++)source.data.copy(data,((row*cell+y-top)*width+col*cell)*4,(y*source.info.width+left)*4,(y*source.info.width+right)*4)
}
if(!process.argv.includes('--final')){
 fs.writeFileSync(new URL('normalized.png',root),await sharp(data,{raw:{width,height,channels:4}}).png().toBuffer())
 fs.writeFileSync(new URL('frame-0.png',root),await sharp(data,{raw:{width,height,channels:4}}).extract({left:0,top:0,width:cell,height:cell}).resize(888,888).png().toBuffer())
 console.log({cell,width,height});process.exit(0)
}
const registration=read('registration.json'),record=Array.isArray(registration)?registration[0]:registration
if(record.frames.length!==8||record.frames.some(f=>!Number.isFinite(f.rmse)||f.rmse>40))throw Error('Rigid anchor registration needs review')
const padding=Math.ceil(Math.max(...record.frames.flatMap(f=>[Math.abs(f.dx),Math.abs(f.dy)])))+8,newCell=cell+padding*2,outWidth=newCell*4,outHeight=newCell*2,out=Buffer.alloc(outWidth*outHeight*4)
for(const f of record.frames){
 const ox=f.frame%4*cell,oy=Math.floor(f.frame/4)*cell,nx=f.frame%4*newCell+padding-f.dx,ny=Math.floor(f.frame/4)*newCell+padding-f.dy
 for(let y=0;y<cell;y++)data.copy(out,((ny+y)*outWidth+nx)*4,((oy+y)*width+ox)*4,((oy+y)*width+ox+cell)*4)
}
const bytes=await sharp(out,{raw:{width:outWidth,height:outHeight,channels:4}}).png({compressionLevel:9}).toBuffer()
if(!(await sharp(bytes).raw().toBuffer()).equals(out))throw Error('RGBA preservation failed')
fs.writeFileSync(new URL('fish/mythic/galaxy-ananke_swim8_v2_sprite.png',root),bytes)
fs.writeFileSync('public/aquarium/swim/galaxy-ananke_swim8_v2_sprite.png',bytes)
const layoutsPath='src/features/aquarium/galaxy-mythic-action-layouts.json',layouts=JSON.parse(fs.readFileSync(layoutsPath)),layout=layouts.find(s=>s.id==='galaxy-ananke')
Object.assign(layout,{cell:newCell,scale:1.55,assetVersion:2,shifts:Array.from({length:8},()=>[0,0])})
fs.writeFileSync(layoutsPath,JSON.stringify(layouts,null,2)+'\n')
fs.writeFileSync(new URL('alignment.json',root),JSON.stringify({...record,sourceCell:cell,cell:newCell,padding,rgbaPreserved:true,shiftsBaked:true},null,2)+'\n')
console.log({cell:newCell,padding})
