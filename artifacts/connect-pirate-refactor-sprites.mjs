import fs from 'node:fs'
const root='assets/storage-upload/new/20261027-090400'
const read=p=>JSON.parse(fs.readFileSync(p,'utf8').replace(/^\uFEFF/,''))
const reports=read(root+'/registration.json'),four=read(root+'/registered-four.json'),eight=read(root+'/registered-eight.json')
const path4='src/features/aquarium/plunder-frame-layouts.json',path8='src/features/aquarium/plunder-mythic-action-layouts.json'
const layouts=read(path4),mythics=read(path8)
for(const r of reports){
 const registration=[...four,...eight].find(a=>a.storage_path===r.storage_path)
 if(!registration)throw Error('Missing measured registration '+r.id)
 const shifts=registration.frames.map(f=>[f.dx,f.dy]);r.anchorRegistration=registration;r.patch=registration.patch
 if(shifts.length===8){
  const i=mythics.findIndex(s=>s.id===r.id);if(i<0)throw Error('Missing existing mythic identity')
  mythics[i]={...mythics[i],cell:r.cell,scale:r.scale,shifts,assetVersion:2,aliases:[...new Set([...mythics[i].aliases,r.id+'_swim8_v2'])]}
  fs.copyFileSync(root+'/'+r.storage_path,'public/aquarium/swim/'+r.id+'_swim8_v2_sprite.png')
 }else layouts[r.storage_path]={cell:r.cell,scale:r.scale,shifts}
}
fs.writeFileSync(path4,JSON.stringify(layouts,null,2)+'\n');fs.writeFileSync(path8,JSON.stringify(mythics,null,2)+'\n')
fs.writeFileSync(root+'/registration.json',JSON.stringify(reports,null,2)+'\n')
console.log('Connected seven refined four-frame sheets and two replacement eight-frame mythics; legacy aliases retained')
