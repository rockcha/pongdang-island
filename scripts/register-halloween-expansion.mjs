import {readFileSync,writeFileSync,copyFileSync} from 'node:fs'
import {createHash} from 'node:crypto'
const root=process.argv[2],prepare=process.argv.includes('--prepare-runtime')
if(!root)throw Error('Provide batch root')
const read=p=>JSON.parse(readFileSync(p,'utf8').replace(/^\uFEFF/,''))
const write=(p,v)=>writeFileSync(p,JSON.stringify(v,null,2)+'\n')
const m=read(root+'/manifest.json'),catalog=read('supabase/catalog/catalog.json')
const audit=read(root+'/sprite-audit.json'),registration=read(root+'/registration.json')
const asArray=value=>Array.isArray(value)?value:[value]
const anchors=[...asArray(read(root+'/anchor-results-four.json')),...asArray(read(root+'/anchor-results-eight.json'))]
if(m.items.length!==11||audit.missing.length||audit.sprites.length!==11||audit.sprites.some(s=>!s.safe)||audit.thumbnails.some(t=>t.edgePixels))throw Error('Incomplete or unsafe batch')
if(!prepare&&!read(root+'/visual-review.json').passed)throw Error('Review actual aquarium and collection previews first')
const facing=read('src/features/aquarium/artwork-facing.json'),layouts=read('src/features/aquarium/halloween-frame-layouts.json'),mythics=read('src/features/aquarium/halloween-mythic-action-layouts.json')
const columns=Object.keys(catalog.collectible_species[0])
for(const e of m.items){
 if(!e.id.startsWith('halloween-')||!['swim','pulse','crawl'].includes(e.movement_type))throw Error('Missing event or motion '+e.id)
 const r=registration.find(r=>r.id===e.id),a=anchors.find(a=>a.storage_path===e.sprite_sheet_path)
 if(!r||!a||a.frames.length!==e.frames||a.frames.some(f=>!Number.isFinite(f.rmse)||f.rmse>60))throw Error('Invalid measured registration '+e.id)
 Object.assign(r,{patch:a.patch,frames:a.frames,shifts:a.frames.map(f=>[f.dx,f.dy])})
 if(e.frames===8){
  const value={id:e.id,aliases:[e.id+'_v1',e.id+'_swim8_v1'],cell:r.cell,scale:r.scale,shifts:r.shifts,assetVersion:1}
  const index=mythics.findIndex(s=>s.id===e.id);if(index<0)mythics.push(value);else mythics[index]=value
  copyFileSync(root+'/'+e.sprite_sheet_path,'public/aquarium/swim/'+e.sprite_sheet_path.split('/').at(-1))
 }else layouts[e.sprite_sheet_path]={cell:r.cell,scale:r.scale,shifts:r.shifts}
 const sprite=e.catalog_sprite_sheet_path??e.sprite_sheet_path
 const art={id:e.id,path:sprite,facing:'right',sha256:createHash('sha256').update(readFileSync(root+'/'+sprite)).digest('hex')}
 const index=facing.findIndex(f=>f.path===sprite);if(index<0)facing.push(art);else facing[index]=art
 e.hashes=Object.fromEntries([...new Set([e.thumbnail_path,e.sprite_sheet_path,sprite])].map(p=>[p,createHash('sha256').update(readFileSync(root+'/'+p)).digest('hex')]))
 if(!prepare){
  const data={...e,sprite_sheet_path:sprite,speed:String(e.speed),swim_y_min:String(e.swim_y_min),swim_y_max:String(e.swim_y_max)}
  if(columns.some(k=>data[k]===undefined))throw Error('Missing column for '+e.id)
  const row=Object.fromEntries(columns.map(k=>[k,data[k]])),prior=catalog.collectible_species.findIndex(s=>s.id===e.id)
  if(prior<0)catalog.collectible_species.push(row);else catalog.collectible_species[prior]=row
  for(const region of catalog.regions)if(!catalog.collectible_habitats.some(h=>h.species_id===e.id&&h.region_id===region.id))catalog.collectible_habitats.push({species_id:e.id,region_id:region.id})
 }
}
write('src/features/aquarium/halloween-frame-layouts.json',layouts)
write('src/features/aquarium/halloween-mythic-action-layouts.json',mythics)
write('src/features/aquarium/artwork-facing.json',facing)
write(root+'/registration.json',registration)
m.entries=m.items.filter(e=>e.frames===8).map(e=>({id:e.id,frames:8,columns:4,storage_path:e.sprite_sheet_path,source:'sources/'+e.id+'-sprite.source',prompt:e.spritePrompt,referenceRoles:{thumbnail:'approved creature identity',guide:'locked grid, anchor and safe alpha margins'}}))
m.status=prepare?'runtime-prepared':'reviewed';write(root+'/manifest.json',m)
if(!prepare){
 catalog.collectible_species.sort((a,b)=>a.id.localeCompare(b.id))
 catalog.collectible_habitats.sort((a,b)=>a.species_id.localeCompare(b.species_id)||a.region_id.localeCompare(b.region_id))
 write('supabase/catalog/catalog.json',catalog)
 const releases=read('src/features/regions/species-releases.json')
 const newIds=m.items.filter(e=>!e.revision).map(e=>e.id).filter(id=>!releases.some(r=>r.speciesIds.includes(id)))
 if(newIds.length)releases.push({releasedAt:m.releaseAt,speciesIds:newIds})
 write('src/features/regions/species-releases.json',releases)
 const sources=read('assets/references/mythic-sprites/sources.json'),path=root+'/manifest.json'
 if(!sources.manifests.includes(path))sources.manifests.push(path)
 write('assets/references/mythic-sprites/sources.json',sources)
}
console.log(`Prepared ${m.items.length} reviewed artworks${prepare?' for runtime QA':' and registered ten new species plus patchwork shark revision'}`)
