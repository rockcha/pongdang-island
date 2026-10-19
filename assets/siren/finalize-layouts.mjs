import fs from 'node:fs'
const manifestPath='assets/siren/manifest.json',m=JSON.parse(fs.readFileSync(manifestPath,'utf8'))
const registration=JSON.parse(fs.readFileSync(m.batch+'/registration.json','utf8').replace(/^\uFEFF/,''))
if(registration.length!==m.sprites.length)throw Error('Missing sprite registration')
const ordinary={}
const mythicPath='src/features/aquarium/mythic-action-layouts.json',mythics=JSON.parse(fs.readFileSync(mythicPath,'utf8'))
for(const row of registration){
 const e=m.entries.find(e=>e.id===row.id),job=m.sprites.find(j=>j.id===row.id),a=row.audit
 const cell=a.width/job.columns
 if(Math.abs(a.width/a.height-job.columns/2)>0.001)throw Error(`Incorrect sprite grid: ${row.id}`)
 if(a.samples<8)throw Error(`Insufficient body reference pixels: ${row.id}`)
 const scale=Number(Math.max(.8,Math.min(1.4,.84/a.extent)).toFixed(4))
 const record={cell,scale,shifts:a.shifts}
 if(e.rarity==='mythic'){
  const target=mythics.find(s=>s.id===e.id);Object.assign(target,record)
  fs.copyFileSync(job.path,`public/aquarium/swim/${e.id}_swim8_sprite.png`)
 }else ordinary[e.sprite_path]=record
 job.registration={...record,patch:a.patch,scores:a.scores}
}
fs.writeFileSync('src/features/aquarium/siren-frame-layouts.json',JSON.stringify(ordinary,null,2)+'\n')
fs.writeFileSync(mythicPath,JSON.stringify(mythics,null,2)+'\n')
for(const e of m.entries)e.path=`${m.batch}/${e.storage_path}`
fs.writeFileSync(manifestPath,JSON.stringify(m,null,2)+'\n');fs.writeFileSync(m.batch+'/manifest.json',JSON.stringify(m,null,2)+'\n')
console.log(`Registered ${registration.length} sheets, including two eight-frame mythic actions`)
