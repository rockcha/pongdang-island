import fs from 'node:fs'
import sharp from 'sharp'
const refinement=process.argv.includes('--refinement')
const {batch,items}=await import(refinement?'./prepare-hangang-refinement.mjs':'./prepare-hangang-assets.mjs')
const read=p=>JSON.parse(fs.readFileSync(p,'utf8').replace(/^\uFEFF/,'')),records=read(batch+'/registration.json'),four=read('src/features/aquarium/hangang-frame-layouts.json'),eight=read('src/features/aquarium/hangang-mythic-action-layouts.json')
let changed=0
for(const count of [4,8])for(const measurement of read(`${batch}/final-registration-${count}.json`)){
 if(!measurement.frames.some(f=>f.dx||f.dy))continue
 if(measurement.frames.some(f=>Math.abs(f.dx)>8||Math.abs(f.dy)>8))throw Error('Review rigid patch before refining '+measurement.storage_path)
 const record=records.find(r=>r.storage_path===measurement.storage_path),file=batch+'/'+record.storage_path,{data,info}=await sharp(file).ensureAlpha().raw().toBuffer({resolveWithObject:true}),oldCell=record.cell,columns=count/2,pad=Math.max(...measurement.frames.flatMap(f=>[Math.abs(f.dx),Math.abs(f.dy)]))+2,cell=oldCell+pad*2,width=cell*columns,height=cell*2,out=Buffer.alloc(width*height*4)
 for(const f of measurement.frames){
  const sx=f.frame%columns*oldCell,sy=Math.floor(f.frame/columns)*oldCell,dx=f.frame%columns*cell+pad-f.dx,dy=Math.floor(f.frame/columns)*cell+pad-f.dy
  for(let y=0;y<oldCell;y++)data.copy(out,((dy+y)*width+dx)*4,((sy+y)*info.width+sx)*4,((sy+y)*info.width+sx+oldCell)*4)
 }
 const png=await sharp(out,{raw:{width,height,channels:4}}).png().toBuffer()
 if(!(await sharp(png).ensureAlpha().raw().toBuffer()).equals(out))throw Error('RGBA export mismatch')
 fs.writeFileSync(file,png)
 record.refinements??=[];record.refinements.push({method:'Independent System.Drawing RGB registration; inverse integer shifts baked into PNG',addedPadding:pad,frames:measurement.frames})
 record.padding+=pad;record.scale*=cell/oldCell;record.cell=cell
 const layout=count===8?eight.find(r=>r.id===record.id):four[record.storage_path]
 layout.cell=cell;layout.scale=record.scale
 if(count===8)fs.copyFileSync(file,`public/aquarium/swim/${record.id}_swim8_v${layout.assetVersion??1}_sprite.png`)
 changed++
}
for(const i of items.filter(i=>i.frames===8)){
 const record=records.find(r=>r.id===i.id),cell=record.cell,{data}=await sharp(batch+'/'+i.sprite_sheet_path).ensureAlpha().raw().toBuffer({resolveWithObject:true}),out=Buffer.alloc(cell*cell*4*4)
 for(let frame=0;frame<4;frame++)for(let y=0;y<cell;y++)data.copy(out,((Math.floor(frame/2)*cell+y)*cell*2+frame%2*cell)*4,(y*cell*4+frame*cell)*4,(y*cell*4+(frame+1)*cell)*4)
 await sharp(out,{raw:{width:cell*2,height:cell*2,channels:4}}).png().toFile(batch+'/'+(i.compatibility_path??`fish/mythic/${i.id}_compat_v1_sprite.png`))
}
for(const count of [4,8])fs.writeFileSync(`${batch}/final-anchors-${count}.json`,JSON.stringify(records.filter(r=>r.frames.length===count).map(r=>({file:batch+'/'+r.storage_path,storage_path:r.storage_path,patch:[r.patch[0]+r.padding,r.patch[1]+r.padding,r.patch[2],r.patch[3]]})),null,2)+'\n')
fs.writeFileSync(batch+'/registration.json',JSON.stringify(records,null,2)+'\n')
fs.writeFileSync('src/features/aquarium/hangang-frame-layouts.json',JSON.stringify(four,null,2)+'\n')
fs.writeFileSync('src/features/aquarium/hangang-mythic-action-layouts.json',JSON.stringify(eight,null,2)+'\n')
console.log(JSON.stringify({refined:changed,rgbaPreserved:true}))
