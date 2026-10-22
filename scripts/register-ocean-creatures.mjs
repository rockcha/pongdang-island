import {readFileSync,writeFileSync,copyFileSync,existsSync} from 'node:fs'
import {createHash} from 'node:crypto'
const root='assets/storage-upload/new/20261023-050755'
const read=p=>JSON.parse(readFileSync(p,'utf8').replace(/^\uFEFF/,''))
const write=(p,v)=>writeFileSync(p,JSON.stringify(v,null,2)+'\n')
const array=v=>Array.isArray(v)?v:[v]
const manifest=read(root+'/manifest.json'),log=read(root+'/generation-log.json'),audit=read(root+'/sprite-audit.json')
const catalog=read('supabase/catalog/catalog.json'),columns=Object.keys(catalog.collectible_species[0])
const registration=read(root+'/registration.json'),anchors=[...array(read(root+'/anchor-results-four.json')),...array(read(root+'/anchor-results-eight.json'))]
const layouts=read('src/features/aquarium/ocean-creature-frame-layouts.json'),mythics=read('src/features/aquarium/primal-mythic-action-layouts.json'),facing=read('src/features/aquarium/artwork-facing.json')
if(manifest.items.length!==3||audit.missing.length||audit.sprites.some(s=>!s.safe))throw Error('Incomplete artwork')
for(const p of manifest.items){
 const r=registration.find(a=>a.id===p.id),a=anchors.find(a=>a.storage_path===p.sprite_sheet_path)
 if(!a||a.frames.length!==p.frames||a.frames.some(f=>![f.dx,f.dy,f.rmse].every(Number.isFinite)))throw Error('Unusable rigid-body anchor '+p.id)
 r.frames=a.frames;r.shifts=a.frames.map(f=>[f.dx,f.dy])
 const catalogSheet=p.frames===8?p.sprite_sheet_path.replace('_swim8_v1_sprite.png','_v1_sprite.png'):p.sprite_sheet_path
 if(!existsSync(root+'/'+catalogSheet))throw Error('Missing catalog sheet')
 if(p.frames===8){
  const sheet={id:p.id,aliases:[p.id+'_v1',p.id+'_swim8_v1'],cell:r.cell,scale:r.scale,shifts:r.shifts}
  const i=mythics.findIndex(s=>s.id===p.id);if(i<0)mythics.push(sheet);else mythics[i]=sheet
  copyFileSync(root+'/'+p.sprite_sheet_path,'public/aquarium/swim/'+p.id+'_swim8_sprite.png')
 }else layouts[p.sprite_sheet_path]={cell:r.cell,scale:r.scale,shifts:r.shifts}
 const data={...p,sprite_sheet_path:catalogSheet,speed:String(p.speed),swim_y_min:String(p.swim_y_min),swim_y_max:String(p.swim_y_max)}
 const row=Object.fromEntries(columns.map(k=>[k,data[k]]))
 if(Object.values(row).some(v=>v===undefined))throw Error('Incomplete catalog row')
 const i=catalog.collectible_species.findIndex(s=>s.id===p.id);if(i<0)catalog.collectible_species.push(row);else catalog.collectible_species[i]=row
 const habitats=p.habitats==='all'?catalog.regions.map(r=>r.id):p.habitats
 for(const region_id of habitats)if(!catalog.collectible_habitats.some(h=>h.species_id===p.id&&h.region_id===region_id))catalog.collectible_habitats.push({species_id:p.id,region_id})
 const art={id:p.id,path:catalogSheet,facing:'right',sha256:createHash('sha256').update(readFileSync(root+'/'+catalogSheet)).digest('hex')}
 const fi=facing.findIndex(f=>f.path===art.path);if(fi<0)facing.push(art);else facing[fi]=art
 for(const stage of ['thumbnail','sprite']){const record=log.find(e=>e.id===p.id&&e.stage===stage);if(!record?.prompt)throw Error('Missing prompt');p[stage+'Prompt']=record.prompt}
 p.catalog_sprite_sheet_path=catalogSheet;p.facing_direction='right';p.status='reviewed'
}
manifest.entries=manifest.items.filter(p=>p.frames===8).map(p=>({id:p.id,frames:8,columns:4,source:'sources/'+p.id+'-sprite.source',storage_path:p.sprite_sheet_path,prompt:p.spritePrompt,referenceRoles:{guide:'strict placement and scale',thumbnail:'approved identity'}}))
const releases=read('src/features/regions/species-releases.json'),missing=manifest.items.map(p=>p.id).filter(id=>!releases.some(r=>r.speciesIds.includes(id)))
if(missing.length)releases.push({releasedAt:new Date().toISOString(),speciesIds:missing})
catalog.collectible_species.sort((a,b)=>a.id.localeCompare(b.id));catalog.collectible_habitats.sort((a,b)=>a.species_id.localeCompare(b.species_id)||a.region_id.localeCompare(b.region_id))
write('supabase/catalog/catalog.json',catalog);write('src/features/aquarium/ocean-creature-frame-layouts.json',layouts);write('src/features/aquarium/primal-mythic-action-layouts.json',mythics);write('src/features/aquarium/artwork-facing.json',facing);write('src/features/regions/species-releases.json',releases);write(root+'/registration.json',registration);write(root+'/manifest.json',manifest)
console.log('Registered two shared epic creatures across all current regions and one primal mythic with eight poses.')
