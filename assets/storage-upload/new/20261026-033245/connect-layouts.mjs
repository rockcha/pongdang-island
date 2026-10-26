import fs from 'node:fs'
import sharp from 'sharp'
const root='assets/storage-upload/new/20261026-033245'
const read=p=>JSON.parse(fs.readFileSync(p,'utf8').replace(/^\uFEFF/,''))
const manifest=read(root+'/manifest.json'),raw=read(root+'/raw-audit.json'),offsets=read(root+'/raw-registration.json'),final=read(root+'/final-registration.json')
const layoutFile='src/features/aquarium/dreamabyss-frame-layouts.json',layouts=read(layoutFile),mythics=[]
manifest.entries=[]
const registration=[]
for(const item of manifest.items){
 const measured=final.find(r=>r.storage_path===item.sprite_sheet_path)
 if(!measured||measured.frames.length!==item.frames)throw Error('Missing measured final anchor: '+item.id)
 const shifts=measured.frames.map(f=>[f.dx,f.dy])
 if(item.frames===8){
  mythics.push({id:item.id,aliases:[item.id,item.id+'_swim8_v1'],cell:512,scale:1,shifts,assetVersion:1})
  const publicFile='public/aquarium/swim/'+item.id+'_swim8_v1_sprite.png'
  fs.copyFileSync(root+'/'+item.sprite_sheet_path,publicFile)
  item.catalog_sprite_sheet_path=`fish/mythic/${item.id}_compat_sprite.png`
  const chunks=[]
  for(let frame=0;frame<4;frame++)chunks.push({input:await sharp(root+'/'+item.sprite_sheet_path).extract({left:frame*512,top:0,width:512,height:512}).png().toBuffer(),left:frame%2*512,top:Math.floor(frame/2)*512})
  await sharp({create:{width:1024,height:1024,channels:4,background:'#00000000'}}).composite(chunks).png().toFile(root+'/'+item.catalog_sprite_sheet_path)
  const audit=raw.find(r=>r.id===item.id),rawAnchor=offsets.find(r=>r.storage_path===item.sprite_sheet_path)
  registration.push({id:item.id,rawAudit:{cell:audit.cell,bounds:audit.frames},rawAnchor,finalAnchor:measured,scope:'Raw alpha>=32 margins >=8%; uniform scale across poses; measured rigid-head registration before and after normalization'})
  manifest.entries.push({id:item.id,frames:8,columns:4,storage_path:item.sprite_sheet_path,source:item.sheetSource.slice(root.length+1),prompt:item.sheetPrompt,spacingEditPrompt:item.spacingEditPrompt,inputs:{identity:item.thumbnailSource.slice(root.length+1),placement:item.layoutGuide,style:manifest.styleReferences.epic}})
 }else layouts[item.sprite_sheet_path]={cell:512,scale:1,shifts}
}
fs.writeFileSync(layoutFile,JSON.stringify(layouts,null,2)+'\n')
fs.writeFileSync('src/features/aquarium/dreamabyss-mythic-action-layouts.json',JSON.stringify(mythics,null,2)+'\n')
fs.writeFileSync(root+'/registration.json',JSON.stringify(registration,null,2)+'\n')
fs.writeFileSync(root+'/manifest.json',JSON.stringify(manifest,null,2)+'\n')
console.log('Connected nine four-frame sheets and one eight-frame mythic using measured anchors')
