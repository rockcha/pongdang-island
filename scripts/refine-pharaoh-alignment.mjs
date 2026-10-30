import fs from 'node:fs'
import sharp from 'sharp'
import {batch} from './prepare-pharaoh-assets.mjs'
const read=p=>JSON.parse(fs.readFileSync(p,'utf8').replace(/^\uFEFF/,''))
const reports=read(batch+'/registration.json'),layouts=read('src/features/aquarium/pharaoh-mythic-action-layouts.json')
const anchors=read(batch+'/final-anchors-8.json')
let count=0
for(const r of read(batch+'/final-registered-8.json')){
 if(!r.frames.some(f=>f.dx||f.dy))continue
 const p=batch+'/'+r.storage_path,{data,info}=await sharp(p).ensureAlpha().raw().toBuffer({resolveWithObject:true}),cell=info.width/4,pad=Math.max(...r.frames.flatMap(f=>[Math.abs(f.dx),Math.abs(f.dy)]))+8,next=cell+2*pad,width=next*4,height=next*2,out=Buffer.alloc(width*height*4)
 for(const f of r.frames){const ox=f.frame%4*cell,oy=Math.floor(f.frame/4)*cell,nx=f.frame%4*next+pad-f.dx,ny=Math.floor(f.frame/4)*next+pad-f.dy;for(let y=0;y<cell;y++)data.copy(out,((ny+y)*width+nx)*4,((oy+y)*info.width+ox)*4,((oy+y)*info.width+ox+cell)*4)}
 const png=await sharp(out,{raw:{width,height,channels:4}}).png().toBuffer();if(!(await sharp(png).raw().toBuffer()).equals(out))throw Error('RGBA changed')
 fs.writeFileSync(p,png)
 const rec=reports.find(x=>x.storage_path===r.storage_path),layout=layouts.find(x=>r.storage_path.includes('/'+x.id+'_')),anchor=anchors.find(x=>x.storage_path===r.storage_path)
 rec.finalRefinement={cell:next,padding:pad,measuredResidual:r.frames,rgbaPreserved:true};rec.scale*=next/cell;rec.cell=next;rec.patch[0]+=pad;rec.patch[1]+=pad
 layout.cell=next;layout.scale=rec.scale;anchor.patch=rec.patch
 fs.copyFileSync(p,`public/aquarium/swim/${rec.id}_swim8_v1_sprite.png`);count++
}
fs.writeFileSync(batch+'/registration.json',JSON.stringify(reports,null,2)+'\n');fs.writeFileSync(batch+'/final-anchors-8.json',JSON.stringify(anchors,null,2)+'\n');fs.writeFileSync('src/features/aquarium/pharaoh-mythic-action-layouts.json',JSON.stringify(layouts,null,2)+'\n')
console.log('Refined '+count+' action-sheet residual anchors')
