import {readFileSync,writeFileSync} from 'node:fs'
import {createHash} from 'node:crypto'
const root=process.argv[2]||'assets/storage-upload/new/20261023-043727'
if(!/^assets\/storage-upload\/new\/\d{8}-\d{6}$/.test(root))throw Error('Expected a workspace art batch')
const read=p=>JSON.parse(readFileSync(p,'utf8').replace(/^\uFEFF/,''))
const write=(p,v)=>writeFileSync(p,JSON.stringify(v,null,2)+'\n')
const manifest=read(root+'/manifest.json'),log=read(root+'/generation-log.json')
const catalog=read('supabase/catalog/catalog.json'),columns=Object.keys(catalog.collectible_species[0])
const layouts=read('src/features/aquarium/nyamnyam-frame-layouts.json'),facing=read('src/features/aquarium/artwork-facing.json')
const registration=read(root+'/registration.json'),anchors=read(root+'/anchor-results-four.json'),audit=read(root+'/sprite-audit.json')
if(audit.missing.length||audit.sprites.length!==manifest.items.length||audit.sprites.some(s=>!s.safe))throw Error('Incomplete art audit')
for(const p of manifest.items){
 const row=Object.fromEntries(columns.map(k=>[k,['speed','swim_y_min','swim_y_max'].includes(k)?String(p[k]):p[k]]))
 if(Object.values(row).some(v=>v===undefined))throw Error('Incomplete catalog row')
 const index=catalog.collectible_species.findIndex(s=>s.id===p.id)
 if(index<0)catalog.collectible_species.push(row);else catalog.collectible_species[index]=row
 if(!catalog.collectible_habitats.some(h=>h.species_id===p.id&&h.region_id==='nyamnyam'))catalog.collectible_habitats.push({species_id:p.id,region_id:'nyamnyam'})
 const measured=anchors.find(a=>a.storage_path===p.sprite_sheet_path),r=registration.find(a=>a.id===p.id)
 if(!measured||measured.frames.length!==4||measured.frames.some(f=>![f.dx,f.dy,f.rmse].every(Number.isFinite)))throw Error('Invalid registration')
 r.frames=measured.frames;r.shifts=measured.frames.map(f=>[f.dx,f.dy])
 layouts[p.sprite_sheet_path]={cell:r.cell,scale:r.scale,shifts:r.shifts}
 const entry={id:p.id,path:p.sprite_sheet_path,facing:'right',sha256:createHash('sha256').update(readFileSync(root+'/'+p.sprite_sheet_path)).digest('hex')}
 const fi=facing.findIndex(e=>e.path===entry.path);if(fi<0)facing.push(entry);else facing[fi]=entry
 for(const stage of ['thumbnail','sprite']){
  const record=log.find(e=>e.id===p.id&&e.stage===stage)
  if(!record?.prompt)throw Error('Missing exact image prompt')
  p[stage+'Prompt']=record.prompt
 }
 p.facing_direction='right';p.status='reviewed'
}
manifest.icons=log.filter(e=>e.stage==='icon').map(e=>({...e,sha256:createHash('sha256').update(readFileSync(e.path)).digest('hex')}))
const releases=read('src/features/regions/species-releases.json')
const ids=manifest.items.map(p=>p.id),missing=ids.filter(id=>!releases.some(r=>r.speciesIds.includes(id)))
if(missing.length)releases.push({releasedAt:new Date().toISOString(),speciesIds:missing})
const rare=catalog.collectible_species.filter(s=>s.kind==='fish'&&s.rarity==='rare'&&s.native_region_id==='nyamnyam')
if(rare.reduce((a,s)=>a+s.sell_price,0)/rare.length!==310)throw Error('Food-sea rare fish average must remain 310')
catalog.collectible_species.sort((a,b)=>a.id.localeCompare(b.id))
catalog.collectible_habitats.sort((a,b)=>a.species_id.localeCompare(b.species_id)||a.region_id.localeCompare(b.region_id))
write('supabase/catalog/catalog.json',catalog)
write('src/features/aquarium/nyamnyam-frame-layouts.json',layouts)
write('src/features/aquarium/artwork-facing.json',facing)
write('src/features/regions/species-releases.json',releases)
write(root+'/manifest.json',manifest);write(root+'/registration.json',registration)
console.log(`Registered ${manifest.items.length} food-sea species; existing rare fish average remains 310G.`)
