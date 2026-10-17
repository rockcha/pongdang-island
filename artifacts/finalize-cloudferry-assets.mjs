import {readFileSync,writeFileSync,copyFileSync,mkdirSync} from 'node:fs'
import {createHash} from 'node:crypto'
const {batch,species:plan}=JSON.parse(readFileSync('artifacts/cloudferry-expansion-plan.json','utf8'))
const reports=JSON.parse(readFileSync(batch+'/body-registration.json','utf8'))
const audit=JSON.parse(readFileSync(batch+'/alpha-audit.json','utf8'))
const framing=JSON.parse(readFileSync(batch+'/uniform-framing.json','utf8'))
if(reports.length!==22||audit.length!==47||framing.length!==47)throw Error('Expected 22 sheets and 47 framed PNGs')
if(audit.some(r=>r.frames.some(f=>f.edgePixels>0)))throw Error('A source still touches a cell edge')
const layouts={}
for(const r of reports){if(r.width/r.columns!==r.height/2)throw Error('Non-square cell '+r.id);layouts[r.storage_path]={cell:r.width/r.columns,shifts:r.frames.map(f=>[f.dx,f.dy])}}
writeFileSync('src/features/aquarium/cloudferry-frame-layouts.json',JSON.stringify(layouts,null,2)+'\n')
let runtime=readFileSync('src/features/aquarium/swim-frame-layout.ts','utf8')
if(!runtime.includes("import cloudferryLayouts")){runtime="import cloudferryLayouts from './cloudferry-frame-layouts.json'\n"+runtime;runtime=runtime.replace('...whitenightLayouts}','...whitenightLayouts,...cloudferryLayouts}')}
writeFileSync('src/features/aquarium/swim-frame-layout.ts',runtime.replaceAll('\r\n','\n'))
let mythic=readFileSync('src/features/aquarium/mythic-swim.ts','utf8')
for(const s of plan.filter(s=>s.rarity==='mythic')){
 const r=reports.find(r=>r.id===s.id)
 mythic=mythic.replace(new RegExp("^ .*id:'"+s.id+"'.*\\r?\\n",'gm'),'')
 const row=` {id:'${s.id}',aliases:['${s.id}'],scale:1,cell:${r.width/4},shifts:${JSON.stringify(r.frames.map(f=>[f.dx,f.dy]))}},`
 mythic=mythic.replace('const sheets:MythicSheet[]=[','const sheets:MythicSheet[]=[\n'+row)
 mkdirSync('public/aquarium/swim',{recursive:true});copyFileSync(batch+'/'+r.storage_path,`public/aquarium/swim/${s.id}_swim8_sprite.png`)
}
writeFileSync('src/features/aquarium/mythic-swim.ts',mythic.replaceAll('\r\n','\n'))
const sources=JSON.parse(readFileSync(batch+'/generation-sources.json','utf8')).entries
const hash=bytes=>createHash('sha256').update(bytes).digest('hex'),files=[]
for(const s of plan)for(const storage_path of [s.thumbnail,...(s.sprite?[s.sprite]:[])]){
 const source=sources.find(r=>r.storage_path===storage_path),transform=framing.find(r=>r.storage_path===storage_path)
 if(!source||!transform)throw Error('Missing provenance '+storage_path)
 files.push({...source,sha256:hash(readFileSync(batch+'/'+storage_path)),source_sha256:hash(readFileSync(source.path)),uniform_framing:transform,rarity:s.rarity,kind:s.kind,movement:s.movement,facing_direction:s.kind==='fish'?'right':null})
}
writeFileSync(batch+'/manifest.json',JSON.stringify({tool:'built-in image_gen',region:'cloudferry',species:25,files,validation:{alpha:'All 47 selected PNGs: alpha>=16 clear at cell boundaries.',framing:'One union box and one uniform scale/translation per sheet; no per-pose crop, scale or auto-centering.',registration:'22 rigid head/body or fixed-base translations measured after uniform framing.',visual:'Reviewed right-facing thumbnails and frame contact sheets.',limitations:'Local asset and replay verification; no claim of physical mobile-device QA.'}},null,2)+'\n')
console.log('Finalized 47 PNGs, 22 registered sheets, and the castle eight-frame six-second action.')
