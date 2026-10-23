import {readFileSync,writeFileSync,mkdirSync} from 'node:fs'
import {createHash} from 'node:crypto'
const root='assets/storage-upload/new/20261023-110848',id='shared-grimhowl-giant-wolf-eel'
const read=p=>JSON.parse(readFileSync(p,'utf8').replace(/^\uFEFF/,'')),write=(p,v)=>writeFileSync(p,JSON.stringify(v,null,2)+'\n')
if(process.argv.includes('--init')){
 mkdirSync(root,{recursive:true})
 const row=read('supabase/catalog/catalog.json').collectible_species.find(s=>s.id===id)
 write(root+'/manifest.json',{tool:'built-in image_gen',batch:'20261023-110848',referenceStyle:'assets/references/collectible-style/epic-mythic-starlight.png',items:[{...row,frames:4,thumbnail_path:`fish/epic/${id}_v2_thumbnail.png`,sprite_sheet_path:`fish/epic/${id}_v2_sprite.png`,status:'planned'}]})
 console.log(root)
}else{
 const manifest=read(root+'/manifest.json'),p=manifest.items[0],audit=read(root+'/sprite-audit.json')
 p.description='은빛 물결무늬와 차가운 눈빛을 지닌 거대 늑대장어. 긴 몸을 낮게 물결치며, 날카로운 송곳니로 심해의 침묵을 가릅니다.'
 const reports=read(root+'/registration.json'),r=Array.isArray(reports)?reports[0]:reports
 const measured=read(root+'/anchor-results-four.json'),a=Array.isArray(measured)?measured[0]:measured
 if(audit.missing.length||audit.sprites.some(s=>!s.safe)||a.frames.length!==4||a.frames.some(f=>![f.dx,f.dy,f.rmse].every(Number.isFinite)||f.rmse>60))throw Error('Invalid anchor or sheet audit')
 const log=read(root+'/generation-log.json')
 p.thumbnailPrompt=log.find(e=>e.stage==='thumbnail').prompt;p.spritePrompt=log.find(e=>e.stage==='sprite').prompt;p.status='reviewed';p.facing_direction='right'
 r.patch=a.patch;r.frames=a.frames;r.shifts=a.frames.map(f=>[f.dx,f.dy])
 const layouts=read('src/features/aquarium/ocean-creature-frame-layouts.json')
 layouts[p.sprite_sheet_path]={cell:r.cell,scale:r.scale,shifts:r.shifts}
 const legacy=read(root+'/legacy-anchor-results.json')
 if(legacy.frames.some(f=>!Number.isFinite(f.rmse)||f.rmse>60))throw Error('Invalid legacy head registration')
 layouts[legacy.storage_path].shifts=legacy.frames.map(f=>[f.dx,f.dy])
 write('src/features/aquarium/ocean-creature-frame-layouts.json',layouts)
 const catalog=read('supabase/catalog/catalog.json'),row=catalog.collectible_species.find(s=>s.id===id)
 row.thumbnail_path=p.thumbnail_path;row.sprite_sheet_path=p.sprite_sheet_path;row.description=p.description
 write('supabase/catalog/catalog.json',catalog)
 const facing=read('src/features/aquarium/artwork-facing.json'),entry={id,path:p.sprite_sheet_path,facing:'right',sha256:createHash('sha256').update(readFileSync(root+'/'+p.sprite_sheet_path)).digest('hex')}
 const i=facing.findIndex(f=>f.path===entry.path);if(i<0)facing.push(entry);else facing[i]=entry
 write('src/features/aquarium/artwork-facing.json',facing);write(root+'/registration.json',[r]);write(root+'/manifest.json',manifest)
 console.log('Registered reviewed Grimhowl v2 artwork and measured head alignment; species attributes and release date retained.')
}
