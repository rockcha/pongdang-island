import fs from 'node:fs'
import sharp from 'sharp'
import {relative} from 'node:path'
import {batch,items} from './prepare-pharaoh-assets.mjs'
const read=p=>JSON.parse(fs.readFileSync(p,'utf8').replace(/^\uFEFF/,''))
const measured=[...read(batch+'/registered-4.json'),...read(batch+'/registered-8.json')]
const audit=read(batch+'/raw-sprite-audit.json'),four={},eight=[],registration=[],anchors={4:[],8:[]},entries=[]
for(const i of items.filter(i=>i.sprite_sheet_path)){
 const rec=measured.find(r=>r.storage_path===i.sprite_sheet_path),raw=audit.assets.find(a=>a.id===i.id)
 if(!rec||!raw?.valid||rec.frames.some(f=>!Number.isFinite(f.rmse)||f.rmse>60))throw Error('Unreviewed source or anchor '+i.id)
 const path=batch+'/'+i.sprite_sheet_path,{data,info}=await sharp(path).ensureAlpha().raw().toBuffer({resolveWithObject:true}),cols=i.frames/2,cell=info.width/cols
 if(!Number.isInteger(cell)||cell!==info.height/2)throw Error('Invalid export grid '+i.id)
 const pad=Math.ceil(Math.max(...rec.frames.flatMap(f=>[Math.abs(f.dx),Math.abs(f.dy)])))+8,newCell=cell+pad*2,width=newCell*cols,height=newCell*2,out=Buffer.alloc(width*height*4)
 for(const f of rec.frames){
  const ox=f.frame%cols*cell,oy=Math.floor(f.frame/cols)*cell,nx=f.frame%cols*newCell+pad-f.dx,ny=Math.floor(f.frame/cols)*newCell+pad-f.dy
  if(nx-f.frame%cols*newCell<0||ny-Math.floor(f.frame/cols)*newCell<0)throw Error('Insufficient shared padding')
  for(let y=0;y<cell;y++)data.copy(out,((ny+y)*width+nx)*4,((oy+y)*info.width+ox)*4,((oy+y)*info.width+ox+cell)*4)
 }
 const final=await sharp(out,{raw:{width,height,channels:4}}).png().toBuffer(),verify=await sharp(final).ensureAlpha().raw().toBuffer()
 if(!verify.equals(out))throw Error('Final RGBA export changed pixels '+i.id)
 fs.writeFileSync(path,final)
 const scale=Number((.84/Math.max(...raw.frames.map(f=>Math.max(f.width,f.height)/newCell))).toFixed(6))
 const shifts=Array.from({length:i.frames},()=>[0,0]),patch=[rec.patch[0]+pad,rec.patch[1]+pad,...rec.patch.slice(2)]
 registration.push({id:i.id,storage_path:i.sprite_sheet_path,sourceCell:cell,cell:newCell,padding:pad,scale,patch,originalPatch:rec.patch,frames:rec.frames,method:'Measured rigid patch; inverse integer translation encoded in PNG; identical padding and scale for all frames',rgbaPreserved:true,rawAudit:{width:raw.width,height:raw.height,bounds:raw.frames.map(f=>[f.left,f.top,f.width,f.height,f.opaque])}})
 anchors[i.frames].push({file:path,storage_path:i.sprite_sheet_path,patch})
 if(i.frames===8){eight.push({id:i.id,aliases:[i.id,i.id+'_swim8_v1',i.id+'_compat_v1'],cell:newCell,scale,shifts,assetVersion:1});fs.mkdirSync('public/aquarium/swim',{recursive:true});fs.copyFileSync(path,`public/aquarium/swim/${i.id}_swim8_v1_sprite.png`);const m=read(batch+'/manifest.json'),a=m.assets.find(a=>a.path===i.sprite_sheet_path);entries.push({id:i.id,kind:'fish',rarity:'mythic',frames:8,columns:4,storage_path:i.sprite_sheet_path,source:relative(batch,a.original).replaceAll('\\','/'),prompt:a.prompt,referenceRoles:{thumbnail:'individual identity',style:'inherited from fantasy thumbnail',guide:'placement only'},facing_direction:'right'})}
 else four[i.sprite_sheet_path]={cell:newCell,scale,shifts}
}
fs.writeFileSync('src/features/aquarium/pharaoh-frame-layouts.json',JSON.stringify(four,null,2)+'\n')
fs.writeFileSync('src/features/aquarium/pharaoh-mythic-action-layouts.json',JSON.stringify(eight,null,2)+'\n')
fs.writeFileSync(batch+'/registration.json',JSON.stringify(registration,null,2)+'\n')
for(const n of [4,8])fs.writeFileSync(batch+`/final-anchors-${n}.json`,JSON.stringify(anchors[n],null,2)+'\n')
const m=read(batch+'/manifest.json');m.entries=entries;fs.writeFileSync(batch+'/manifest.json',JSON.stringify(m,null,2)+'\n')
console.log(JSON.stringify({aligned:registration.length,rgbaPreserved:true,runtimeResidualShifts:0}))
