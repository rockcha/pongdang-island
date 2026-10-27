import fs from 'node:fs'
const {root}=JSON.parse(fs.readFileSync('artifacts/shared-wonders-root.json','utf8'))
const read=p=>JSON.parse(fs.readFileSync(p,'utf8').replace(/^\uFEFF/,''))
const reports=read(root+'/registration.json'),registered=read(root+'/registered-four.json')
const layouts={}
for(const r of reports){
 const a=registered.find(a=>a.storage_path===r.storage_path)
 if(!a||a.frames.length!==4||a.frames.some(f=>!Number.isFinite(f.rmse)||f.rmse>60))throw Error('Missing measured four-frame registration '+r.id)
 r.anchorRegistration=a;r.patch=a.patch
 layouts[r.storage_path]={cell:r.cell,scale:r.scale,shifts:a.frames.map(f=>[f.dx,f.dy])}
}
if(reports.length!==7)throw Error('Expected common seven only')
fs.writeFileSync('src/features/aquarium/shared-wonders-frame-layouts.json',JSON.stringify(layouts,null,2)+'\n')
fs.writeFileSync(root+'/registration.json',JSON.stringify(reports,null,2)+'\n')
console.log('Connected seven measured four-frame common sheets')
