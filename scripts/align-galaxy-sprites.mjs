import fs from 'node:fs'
import sharp from 'sharp'
import {batch,items} from './prepare-galaxy-assets.mjs'
const read=p=>JSON.parse(fs.readFileSync(p,'utf8').replace(/^\uFEFF/,''))
const prepare=process.argv.includes('--prepare'),partial=process.argv.includes('--partial')
const selected=items.filter(i=>i.frames>1),four={},eight=[],records=[]
fs.mkdirSync(`${batch}/normalized`,{recursive:true})
assetLoop: for(const item of selected){
 const source=`${batch}/sources/${item.id}-sprite.source`
 if(!fs.existsSync(source)){if(partial)continue;throw Error('Missing raw sprite '+item.id)}
 const raw=await sharp(source).ensureAlpha().raw().toBuffer({resolveWithObject:true}),columns=item.frames/2
 if(Math.abs(raw.info.width/columns-raw.info.height/2)>1)throw Error('Incorrect grid '+item.id)
 const cell=Math.ceil(Math.max(raw.info.width/columns,raw.info.height/2)),width=cell*columns,height=cell*2,data=Buffer.alloc(width*height*4)
 // Partition at rounded boundaries without resampling source artwork.
 for(let frame=0;frame<item.frames;frame++){
  const col=frame%columns,row=Math.floor(frame/columns),left=Math.round(col*raw.info.width/columns),right=Math.round((col+1)*raw.info.width/columns),top=Math.round(row*raw.info.height/2),bottom=Math.round((row+1)*raw.info.height/2)
  for(let y=top;y<bottom;y++)raw.data.copy(data,((row*cell+y-top)*width+col*cell)*4,(y*raw.info.width+left)*4,(y*raw.info.width+right)*4)
 }
 const bounds=[]
 for(let frame=0;frame<item.frames;frame++){
  const ox=frame%columns*cell,oy=Math.floor(frame/columns)*cell
  let left=cell,top=cell,right=-1,bottom=-1,opaque=0
  for(let y=0;y<cell;y++)for(let x=0;x<cell;x++)if(data[((y+oy)*width+x+ox)*4+3]>=32){left=Math.min(left,x);top=Math.min(top,y);right=Math.max(right,x);bottom=Math.max(bottom,y);opaque++}
  const margin=Math.min(left,top,cell-right-1,cell-bottom-1)
  if(!opaque||margin<(item.frames===8?cell*.08:2)){
   if(partial){console.warn(`Excluded unsafe original ${item.id} frame ${frame}, margin ${margin}`);continue assetLoop}
   throw Error(`Unsafe original ${item.id} frame ${frame}, margin ${margin}`)
  }
  bounds.push({frame,left,top,width:right-left+1,height:bottom-top+1,margin,opaque})
 }
 const normalized=`${batch}/normalized/${item.id}.png`
 if(prepare){await sharp(data,{raw:{width,height,channels:4}}).png().toFile(normalized);records.push({id:item.id,storage_path:item.sprite_sheet_path,file:normalized,cell,frames:item.frames,rawBounds:bounds});continue}
 const registrations=read(`${batch}/registered-${item.frames}.json`)
 const record=(Array.isArray(registrations)?registrations:[registrations]).find(r=>r.storage_path===item.sprite_sheet_path)
 if(!record||record.frames.length!==item.frames||record.frames.some(f=>!Number.isFinite(f.rmse)||f.rmse>40))throw Error('Missing/rejected rigid anchor registration '+item.id)
 if(!read(`${batch}/anchor-review.json`).some(r=>r.id===item.id&&r.reviewed===true&&JSON.stringify(r.patch)===JSON.stringify(record.patch)))throw Error('Rigid patch needs visual review '+item.id)
 const padding=Math.ceil(Math.max(...record.frames.flatMap(f=>[Math.abs(f.dx),Math.abs(f.dy)])))+8,newCell=cell+2*padding,outWidth=newCell*columns,outHeight=newCell*2,out=Buffer.alloc(outWidth*outHeight*4)
 for(const f of record.frames){
  if(!Number.isInteger(f.dx)||!Number.isInteger(f.dy))throw Error('Expected integer registration '+item.id)
  const ox=f.frame%columns*cell,oy=Math.floor(f.frame/columns)*cell,nx=f.frame%columns*newCell+padding-f.dx,ny=Math.floor(f.frame/columns)*newCell+padding-f.dy
  for(let y=0;y<cell;y++)data.copy(out,((ny+y)*outWidth+nx)*4,((oy+y)*width+ox)*4,((oy+y)*width+ox+cell)*4)
 }
 const bytes=await sharp(out,{raw:{width:outWidth,height:outHeight,channels:4}}).png().toBuffer()
 if(!(await sharp(bytes).raw().toBuffer()).equals(out))throw Error('RGBA preservation failed '+item.id)
 fs.writeFileSync(`${batch}/${item.sprite_sheet_path}`,bytes)
 const scale=Number((.84/Math.max(...bounds.map(b=>Math.max(b.width,b.height)/newCell))).toFixed(6)),shifts=Array.from({length:item.frames},()=>[0,0])
 if(item.frames===8){
  eight.push({id:item.id,aliases:[item.id,item.id+'_swim8_v1'],cell:newCell,scale,shifts,assetVersion:1})
  fs.mkdirSync('public/aquarium/swim',{recursive:true})
  fs.writeFileSync(`public/aquarium/swim/${item.id}_swim8_v1_sprite.png`,bytes)
 }else four[item.sprite_sheet_path]={cell:newCell,scale,shifts}
 records.push({...record,id:item.id,sourceCell:cell,cell:newCell,padding,scale,rawBounds:bounds,rgbaPreserved:true,method:'Visually reviewed opaque rigid patch; inverse integer translation baked into PNG with uniform padding, no per-frame scaling'})
}
if(prepare)fs.writeFileSync(`${batch}/source-grids.json`,JSON.stringify(records,null,2)+'\n')
else{
 fs.writeFileSync(`${batch}/registration.json`,JSON.stringify(records,null,2)+'\n')
 fs.writeFileSync('src/features/aquarium/galaxy-frame-layouts.json',JSON.stringify(four,null,2)+'\n')
 fs.writeFileSync('src/features/aquarium/galaxy-mythic-action-layouts.json',JSON.stringify(eight,null,2)+'\n')
}
console.log(JSON.stringify({mode:prepare?'prepare':'bake-alignment',processed:records.length,expected:selected.length}))
