import fs from 'node:fs'
const root='assets/storage-upload/new/20261027-034411'
const read=p=>JSON.parse(fs.readFileSync(p,'utf8').replace(/^\uFEFF/,''))
const reports=read(root+'/registration.json'),four=read(root+'/registered-four.json'),eight=read(root+'/registered-eight.json')
const layouts={},mythics=[]
for(const r of reports){
 const registration=[...four,...eight].find(a=>a.storage_path===r.storage_path)
 if(!registration)throw Error('Missing registration '+r.id)
 // Runtime origin offsets are measured in cell pixels relative to frame zero.
 const shifts=registration.frames.map(f=>[f.dx,f.dy])
 r.anchorRegistration=registration
 if(shifts.length===8){
  mythics.push({id:r.id,aliases:[r.id,r.id+'_swim8_v1'],cell:r.cell,scale:r.scale,shifts,assetVersion:1})
  fs.copyFileSync(root+'/'+r.storage_path,'public/aquarium/swim/'+r.id+'_swim8_v1_sprite.png')
 }else layouts[r.storage_path]={cell:r.cell,scale:r.scale,shifts}
}
fs.writeFileSync('src/features/aquarium/plunder-frame-layouts.json',JSON.stringify(layouts,null,2)+'\n')
fs.writeFileSync('src/features/aquarium/plunder-mythic-action-layouts.json',JSON.stringify(mythics,null,2)+'\n')
fs.writeFileSync(root+'/registration.json',JSON.stringify(reports,null,2)+'\n')
console.log('Connected 25 four-pose sheets and three eight-pose mythics')
