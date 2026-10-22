import {readFileSync,writeFileSync,mkdirSync,copyFileSync} from 'node:fs'
import {createHash} from 'node:crypto'
const root='assets/storage-upload/new/20261023-080520'
const read=p=>JSON.parse(readFileSync(p,'utf8').replace(/^\uFEFF/,''))
const write=(p,v)=>writeFileSync(p,JSON.stringify(v,null,2)+'\n')
const id='primal-nemerion-last-ocean-heir'
if(process.argv.includes('--init')){
 mkdirSync(root,{recursive:true})
 const previous=read('assets/storage-upload/new/20261023-050755/manifest.json').items.find(p=>p.id===id)
 const {thumbnailSource,thumbnailGenerated,spriteSource,spriteGenerated,thumbnailPrompt,spritePrompt,...p}=previous
 p.thumbnail_path=`fish/mythic/${id}_v2_thumbnail.png`
 p.sprite_sheet_path=`fish/mythic/${id}_swim8_v2_sprite.png`
 p.catalog_sprite_sheet_path=`fish/mythic/${id}_v2_sprite.png`
 p.description='사라진 대양의 기억을 품은 거대한 고대 바다뱀. 길고 육중한 몸을 따라 파동을 흘려 유영하다가, 몸을 크게 굽혔다 펴며 태고의 물결을 일으킵니다.'
 p.design='Giant ancient sea serpent: elongated limbless teal-scaled body, pale belly, amber eye, low weathered dorsal ridge, head right and long tapered tail left.'
 p.status='planned'
 write(root+'/manifest.json',{tool:'built-in image_gen',batch:'20261023-080520',referenceStyle:'assets/references/collectible-style/epic-mythic-starlight.png',replaces:'20261023-050755 Nemerion artwork after user selected ancient sea serpent',items:[p]})
 console.log(root)
}else{
 const manifest=read(root+'/manifest.json'),p=manifest.items[0]
 const reports=read(root+'/registration.json'),r=Array.isArray(reports)?reports[0]:reports
 const measured=read(root+'/anchor-results-eight.json'),a=Array.isArray(measured)?measured[0]:measured
 const audit=read(root+'/sprite-audit.json')
 if(audit.missing.length||audit.sprites.some(s=>!s.safe)||a.frames.length!==8||a.frames.some(f=>![f.dx,f.dy,f.rmse].every(Number.isFinite)))throw Error('Unreviewed or invalid sheet')
 r.frames=a.frames;r.shifts=a.frames.map(f=>[f.dx,f.dy])
 const layouts=read('src/features/aquarium/primal-mythic-action-layouts.json'),i=layouts.findIndex(s=>s.id===id)
 if(i<0)throw Error('Expected existing Nemerion')
 layouts[i]={id,aliases:[id+'_v1',id+'_swim8_v1',id+'_v2',id+'_swim8_v2'],cell:r.cell,scale:r.scale,shifts:r.shifts,assetVersion:2}
 write('src/features/aquarium/primal-mythic-action-layouts.json',layouts)
 copyFileSync(root+'/'+p.sprite_sheet_path,'public/aquarium/swim/'+id+'_swim8_v2_sprite.png')
 const catalog=read('supabase/catalog/catalog.json'),row=catalog.collectible_species.find(s=>s.id===id)
 Object.assign(row,{description:p.description,thumbnail_path:p.thumbnail_path,sprite_sheet_path:p.catalog_sprite_sheet_path})
 write('supabase/catalog/catalog.json',catalog)
 const facing=read('src/features/aquarium/artwork-facing.json')
 const entry={id,path:p.catalog_sprite_sheet_path,facing:'right',sha256:createHash('sha256').update(readFileSync(root+'/'+p.catalog_sprite_sheet_path)).digest('hex')}
 const fi=facing.findIndex(f=>f.path===entry.path);if(fi<0)facing.push(entry);else facing[fi]=entry
 write('src/features/aquarium/artwork-facing.json',facing)
 const log=read(root+'/generation-log.json')
 p.thumbnailPrompt=log.find(e=>e.stage==='thumbnail').prompt;p.spritePrompt=log.find(e=>e.stage==='sprite').prompt
 r.patch=a.patch
 p.status='reviewed';p.facing_direction='right'
 manifest.entries=[{id,frames:8,columns:4,source:'sources/'+id+'-sprite.source',storage_path:p.sprite_sheet_path,prompt:p.spritePrompt,referenceRoles:{guide:'placement and scale only',thumbnail:'approved ancient sea-serpent identity'}}]
 write(root+'/manifest.json',manifest);write(root+'/registration.json',[r])
 const sources=read('assets/references/mythic-sprites/sources.json')
 if(!sources.manifests.includes(root+'/manifest.json'))sources.manifests.push(root+'/manifest.json')
 write('assets/references/mythic-sprites/sources.json',sources)
 console.log('Registered Nemerion sea-serpent artwork v2; retained species ID, rarity, habitats and price.')
}
