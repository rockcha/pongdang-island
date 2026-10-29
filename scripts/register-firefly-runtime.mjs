import sharp from 'sharp'
import {readFileSync,writeFileSync,copyFileSync,mkdirSync} from 'node:fs'
import {relative} from 'node:path'
import {batch,items} from './prepare-firefly-assets.mjs'
const read=p=>JSON.parse(readFileSync(p,'utf8').replace(/^\uFEFF/,''))
const manifest=read(batch+'/manifest.json'),audit=read(batch+'/image-audit.json')
const measured=[...read(batch+'/registered-4.json'),...read(batch+'/registered-8.json')]
const four={},eight=[],reports=[],entries=[]
for(const item of items.filter(i=>i.sprite_sheet_path)){
 const asset=manifest.assets.find(a=>a.path===item.sprite_sheet_path),record=measured.find(r=>r.storage_path===item.sprite_sheet_path)
 if(!asset||!record)throw Error('Missing animation registration: '+item.id)
 const file=batch+'/'+item.sprite_sheet_path,meta=await sharp(file).metadata(),columns=item.rarity==='mythic'?4:2
 if(meta.width%columns||meta.height%2||meta.width/columns!==meta.height/2)throw Error('Export animation cells as equal integer squares: '+item.id)
 const raw=audit.assets.find(a=>a.id===asset.id)
 if(!raw||raw.frames.length!==columns*2||raw.frames.some(f=>f.opaque<20||f.margin<(columns===4?raw.cellWidth*.08:1)))throw Error('Unsafe original animation margins: '+item.id)
 if(record.frames.length!==columns*2||record.frames.some(f=>!Number.isFinite(f.rmse)||f.rmse>60))throw Error('Unreliable rigid anchor: '+item.id)
 const cell=meta.width/columns,maxExtent=Math.max(...raw.frames.map(f=>Math.max(f.width/raw.cellWidth,f.height/raw.cellHeight))),scale=Math.min(1.5,.84/maxExtent)
 const shifts=record.frames.map(f=>[f.dx,f.dy])
 const report={id:item.id,storage_path:item.sprite_sheet_path,cell,scale,patch:record.patch,frames:record.frames,rawAudit:{width:raw.width,height:raw.height,bounds:raw.frames.map(f=>[f.left,f.top,f.width,f.height,f.opaque])},method:record.method}
 reports.push(report)
 if(columns===4){
  eight.push({id:item.id,aliases:[item.id,item.id+'_swim8_v1'],cell,scale,shifts,assetVersion:1})
  mkdirSync('public/aquarium/swim',{recursive:true});copyFileSync(file,`public/aquarium/swim/${item.id}_swim8_v1_sprite.png`)
  entries.push({id:item.id,kind:'fish',rarity:'mythic',frames:8,columns:4,storage_path:item.sprite_sheet_path,source:relative(batch,asset.original).replaceAll('\\','/'),prompt:asset.prompt,referenceRoles:{thumbnail:'exact individual identity',style:'inherited from approved fantasy thumbnail'},facing_direction:'right'})
 }else four[item.sprite_sheet_path]={cell,scale,shifts}
}
if(eight.length!==4||Object.keys(four).length!==33)throw Error('Incomplete fairy animation roster')
writeFileSync('src/features/aquarium/firefly-frame-layouts.json',JSON.stringify(four,null,2)+'\n')
writeFileSync('src/features/aquarium/firefly-mythic-action-layouts.json',JSON.stringify(eight,null,2)+'\n')
writeFileSync(batch+'/registration.json',JSON.stringify(reports,null,2)+'\n')
manifest.entries=entries
writeFileSync(batch+'/manifest.json',JSON.stringify(manifest,null,2)+'\n')
console.log(JSON.stringify({four:Object.keys(four).length,eight:eight.length}))
