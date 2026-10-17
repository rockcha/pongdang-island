import {readFileSync,writeFileSync,copyFileSync,mkdirSync} from 'node:fs'
import {createHash} from 'node:crypto'
const batch='assets/storage-upload/new/20261017-153200',plan=JSON.parse(readFileSync('artifacts/whitenight-expansion-plan.json','utf8'))
const reports=JSON.parse(readFileSync(batch+'/body-registration.json','utf8')),audit=JSON.parse(readFileSync(batch+'/alpha-audit.json','utf8'))
if(reports.length!==23||audit.length!==55)throw Error('Expected 23 sheets and 55 PNGs')
if(audit.some(r=>r.frames.some(f=>f.edgePixels>0)))throw Error('A frame still touches a cell edge')
const layouts={}
for(const r of reports){if(r.width/r.columns!==r.height/2)throw Error('Non-square cell '+r.id);layouts[r.storage_path]={cell:r.width/r.columns,shifts:r.frames.map(f=>[f.dx,f.dy])}}
writeFileSync('src/features/aquarium/whitenight-frame-layouts.json',JSON.stringify(layouts,null,2)+'\n')
const mythicFile='src/features/aquarium/mythic-swim.ts'
let mythic=readFileSync(mythicFile,'utf8')
for(const s of plan.filter(s=>s.rarity==='mythic')){
 const r=reports.find(r=>r.id===s.id)
 mythic=mythic.replace(new RegExp("^ .*id:'"+s.id+"'.*\\r?\\n",'gm'),'')
 const row=` {id:'${s.id}',aliases:['${s.id}'],scale:1,cell:${r.width/4},shifts:${JSON.stringify(r.frames.map(f=>[f.dx,f.dy]))}},`
 mythic=mythic.replace('const sheets:MythicSheet[]=[','const sheets:MythicSheet[]=[\n'+row)
 mkdirSync('public/aquarium/swim',{recursive:true})
 copyFileSync(batch+'/'+r.storage_path,`public/aquarium/swim/${s.id}_swim8_sprite.png`)
}
writeFileSync(mythicFile,mythic.replaceAll('\r\n','\n'))
const sources=JSON.parse(readFileSync(batch+'/generation-sources.json','utf8')).entries,hash=b=>createHash('sha256').update(b).digest('hex'),files=[]
for(const s of plan){const prefix=`${s.kind?'decorations':'fish'}/${s.rarity==='common'?'normal':s.rarity}/${s.id}`
 for(const type of s.kind?['thumbnail']:['thumbnail','sprite']){
  const key=prefix+'_'+type+'.png',sha256=hash(readFileSync(batch+'/'+key)),source=sources.findLast(r=>r.storage_path===key&&hash(readFileSync(r.path))===sha256)
  if(!source)throw Error('Missing selected provenance '+key)
  files.push({...source,sha256,rarity:s.rarity,style_reference:`assets/references/collectible-style/${['common','rare'].includes(s.rarity)?'common-rare-pongi':'epic-mythic-starlight'}.png`,reference_role:type==='thumbnail'?'style only':'exact individual',facing_direction:s.kind?null:'right'})
 }
}
writeFileSync(batch+'/manifest.json',JSON.stringify({tool:'built-in image_gen',region:'whitenight',files,validation:{alpha:'All 55 PNGs: alpha>=16 does not touch any cell boundary.',registration:'23 sheets measured with rigid head/body or fixed base patches; translations only, no per-frame scale.',limitations:'Local visual and PNG checks; not live-device playback verification.'}},null,2)+'\n')
console.log('Finalized 55 selected PNGs, 23 frame registrations and two mythic8 actions.')
