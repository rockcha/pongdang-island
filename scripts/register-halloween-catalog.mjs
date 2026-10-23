import {readFileSync,writeFileSync,copyFileSync,existsSync} from 'node:fs'
import {createHash} from 'node:crypto'
const root='assets/storage-upload/new/20261023-212823'
const read=p=>JSON.parse(readFileSync(p,'utf8').replace(/^\uFEFF/,''))
const write=(p,v)=>writeFileSync(p,JSON.stringify(v,null,2)+'\n')
const m=read(root+'/manifest.json'),catalog=read('supabase/catalog/catalog.json')
const registration=read(root+'/registration.json'),audit=read(root+'/sprite-audit.json')
const measured=[...read(root+'/anchor-results-four.json'),...read(root+'/anchor-results-eight.json')]
const prepareRuntime=process.argv.includes('--prepare-runtime')
if(m.items.length!==51||audit.missing.length||audit.sprites.length!==31||audit.sprites.some(s=>!s.safe))throw Error('Incomplete or unsafe art')
if(!prepareRuntime){
 const reviewed=read(root+'/visual-review.json')
 if(m.items.some(e=>!reviewed.items.some(r=>r.id===e.id&&r.thumbnail&&r.direction&&(e.frames===1||r.motion))))throw Error('Missing visual review')
}
const facing=read('src/features/aquarium/artwork-facing.json'),layouts={},mythics=[]
const columns=Object.keys(catalog.collectible_species[0])
for(const e of m.items){
 if(!e.id.startsWith('halloween-'))throw Error('Ungated event ID')
 const sprite=e.frames===8?e.sprite_sheet_path.replace('_swim8_v1_sprite.png','_v1_sprite.png'):e.sprite_sheet_path
 for(const p of [e.thumbnail_path,sprite,e.sprite_sheet_path].filter(Boolean))if(!existsSync(root+'/'+p))throw Error('Missing final asset '+p)
 if(e.frames>1){
  const r=registration.find(r=>r.id===e.id),a=measured.find(a=>a.storage_path===e.sprite_sheet_path)
  if(!r||!a||a.frames.length!==e.frames)throw Error('Missing anchors '+e.id)
  const shifts=a.frames.map(f=>{if(![f.dx,f.dy,f.rmse].every(Number.isFinite)||f.rmse>60)throw Error('Bad anchor '+e.id);return[f.dx,f.dy]})
  r.frames=a.frames;r.shifts=shifts
  if(e.frames===8){
   mythics.push({id:e.id,aliases:[e.id+'_v1',e.id+'_swim8_v1'],cell:r.cell,scale:r.scale,shifts,assetVersion:1})
   copyFileSync(root+'/'+e.sprite_sheet_path,'public/aquarium/swim/'+e.id+'_swim8_v1_sprite.png')
  }else layouts[e.sprite_sheet_path]={cell:r.cell,scale:r.scale,shifts}
 }
 const data={...e,speed:String(e.speed),swim_y_min:e.swim_y_min===null?null:String(e.swim_y_min),swim_y_max:e.swim_y_max===null?null:String(e.swim_y_max),sprite_sheet_path:sprite}
 if(columns.some(k=>data[k]===undefined))throw Error('Missing field '+e.id)
 const row=Object.fromEntries(columns.map(k=>[k,data[k]]))
 const existing=catalog.collectible_species.findIndex(s=>s.id===e.id)
 if(existing<0)catalog.collectible_species.push(row);else catalog.collectible_species[existing]=row
 // Shared event species are discoverable in every sea; habitat links retain the
 // compatibility contract without assigning a native-region probability bonus.
 for(const region of catalog.regions)if(!catalog.collectible_habitats.some(h=>h.species_id===e.id&&h.region_id===region.id))catalog.collectible_habitats.push({species_id:e.id,region_id:region.id})
 if(e.kind==='fish'){
  const art={id:e.id,path:sprite,facing:'right',sha256:createHash('sha256').update(readFileSync(root+'/'+sprite)).digest('hex')}
  const i=facing.findIndex(a=>a.path===sprite);if(i<0)facing.push(art);else facing[i]=art
 }
 e.catalog_sprite_sheet_path=sprite;e.status=prepareRuntime?'runtime-prepared':'reviewed'
 e.hashes=Object.fromEntries([e.thumbnail_path,e.sprite_sheet_path,sprite].filter(Boolean).map(p=>[p,createHash('sha256').update(readFileSync(root+'/'+p)).digest('hex')]))
}
// Local replay compares arrays in database order, so keep their canonical order.
catalog.collectible_species.sort((a,b)=>a.id.localeCompare(b.id))
catalog.collectible_habitats.sort((a,b)=>a.species_id.localeCompare(b.species_id)||a.region_id.localeCompare(b.region_id))
if(!prepareRuntime)write('supabase/catalog/catalog.json',catalog)
write('src/features/aquarium/halloween-frame-layouts.json',layouts);write('src/features/aquarium/halloween-mythic-action-layouts.json',mythics);write('src/features/aquarium/artwork-facing.json',facing)
write(root+'/registration.json',registration)
m.entries=m.items.filter(e=>e.frames===8).map(e=>({id:e.id,frames:8,columns:4,source:'sources/'+e.id+'-sprite.source',storage_path:e.sprite_sheet_path,prompt:e.spritePrompt,referenceRoles:{thumbnail:'reviewed character identity',guide:'fixed cell placement and safe margins'}}))
write(root+'/manifest.json',m)
const releases=read('src/features/regions/species-releases.json'),ids=m.items.map(e=>e.id)
if(!prepareRuntime&&!releases.some(r=>r.speciesIds.some(id=>ids.includes(id)))){releases.push({releasedAt:m.releaseAt,speciesIds:ids});write('src/features/regions/species-releases.json',releases)}
console.log(`${prepareRuntime?'Prepared runtime for':'Registered'} ${m.items.length} Halloween species and ${mythics.length} eight-frame sheets locally; remote deployment is separate.`)
