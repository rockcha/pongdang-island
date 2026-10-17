import {readFileSync,writeFileSync,copyFileSync,mkdirSync} from 'node:fs'
import {createHash} from 'node:crypto'
const batch='assets/storage-upload/new/20261017-135100',plan=JSON.parse(readFileSync('artifacts/primal-expansion-plan.json','utf8'))
const reports=JSON.parse(readFileSync(batch+'/body-registration.json','utf8'))
if(reports.length!==23)throw new Error('Expected 23 registered sheets')
const layouts={}
for(const r of reports){
 if(r.width/r.columns!==r.height/2)throw new Error('Non-square cell: '+r.id)
 layouts[r.storage_path]={cell:r.width/r.columns,shifts:r.frames.map(f=>[f.dx,f.dy])}
}
writeFileSync('src/features/aquarium/primal-frame-layouts.json',JSON.stringify(layouts,null,2)+'\n')
const plios=reports.find(s=>s.id==='plios-blackwave-king')
const mythicPath='src/features/aquarium/mythic-swim.ts'
let mythic=readFileSync(mythicPath,'utf8').replace(/^ .*id:'plios-blackwave-king'.*\r?\n/gm,'')
const entry=` {id:'plios-blackwave-king',aliases:['plios-blackwave-king'],scale:1,cell:${plios.width/4},shifts:${JSON.stringify(plios.frames.map(f=>[f.dx,f.dy]))}},`
mythic=mythic.replace('const sheets:MythicSheet[]=[','const sheets:MythicSheet[]=[\n'+entry)
writeFileSync(mythicPath,mythic)
mkdirSync('public/aquarium/swim',{recursive:true});mkdirSync('public/aquarium/plants',{recursive:true})
copyFileSync(batch+'/'+plios.storage_path,'public/aquarium/swim/plios-blackwave-king_swim8_sprite.png')
for(const s of plan.filter(s=>s.plant))copyFileSync(batch+`/decorations/${s.rarity==='common'?'normal':s.rarity}/${s.id}_sprite.png`,`public/aquarium/plants/${s.id}_sprite.png`)
const sources=[...JSON.parse(readFileSync(batch+'/generation-sources.json','utf8')).entries,...JSON.parse(readFileSync(batch+'/final-sources.json','utf8'))]
const hash=b=>createHash('sha256').update(b).digest('hex')
const files=[]
for(const s of plan){
 const prefix=`${s.kind?'decorations':'fish'}/${s.rarity==='common'?'normal':s.rarity}/${s.id}`
 for(const suffix of !s.kind||s.plant?['thumbnail','sprite']:['thumbnail']){
  const key=prefix+'_'+suffix+'.png',sha256=hash(readFileSync(batch+'/'+key))
  const selected=sources.findLast(r=>r.storage_path===key&&hash(readFileSync(r.path))===sha256)
  if(!selected)throw new Error('Missing provenance: '+key)
  files.push({...selected,sha256,rarity:s.rarity,facing_direction:s.kind?null:'right',reference_role:suffix==='thumbnail'?'style':'exact identity or atlas edit'})
 }
}
if(files.length!==57)throw new Error('Expected 57 PNGs')
writeFileSync(batch+'/manifest.json',JSON.stringify({tool:'built-in image_gen',region:'primal',files,validation:{frames:'All 20 fish face screen right; 19 swim4 and one mythic8. Three fixed plant sheets.',registration:'Rigid head/shell/root patch translations only; a single scale per species.',limitations:'Local PNG and data checks; live device playback not verified.'}},null,2)+'\n')
console.log('Finalized 57 PNGs, 23 measured frame layouts, Plios mythic action and three bundled plants.')
