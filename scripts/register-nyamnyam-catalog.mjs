import {readFileSync,writeFileSync,copyFileSync,mkdirSync,existsSync} from 'node:fs'
import {createHash} from 'node:crypto'
import {dirname} from 'node:path'

const root='assets/storage-upload/new/20261023-034400'
const read=path=>JSON.parse(readFileSync(path,'utf8').replace(/^\uFEFF/,''))
const manifest=read(root+'/manifest.json'),catalog=read('supabase/catalog/catalog.json')
const registration=read(root+'/registration.json')
const measured=[...read(root+'/anchor-results-four.json'),...read(root+'/anchor-results-eight.json')]
const audit=read(root+'/sprite-audit.json')
if(manifest.items.length!==48||audit.missing.length||audit.sprites.some(s=>!s.safe))throw Error('Artwork is incomplete or unsafe')
const layouts={},mythics=[],facing=read('src/features/aquarium/artwork-facing.json')
const columns=Object.keys(catalog.collectible_species[0])
for(const p of manifest.items){
 const sprite=p.frames===8?p.sprite_sheet_path.replace('_swim8_v1_sprite.png','_v1_sprite.png'):p.sprite_sheet_path
 if(p.frames>1){
  const r=registration.find(r=>r.id===p.id),anchors=measured.find(a=>a.storage_path===p.sprite_sheet_path)
  if(!r||!anchors||anchors.frames.length!==p.frames)throw Error('Missing registration '+p.id)
  const shifts=anchors.frames.map(f=>{
   if(![f.dx,f.dy,f.rmse].every(Number.isFinite))throw Error('Unusable body anchor '+p.id)
   return [f.dx,f.dy]
  })
  r.frames=anchors.frames;r.shifts=shifts
  if(p.frames===8){
   if(!existsSync(root+'/'+sprite))throw Error('Missing compatibility sheet '+p.id)
   mythics.push({id:p.id,aliases:[p.id+'_v1',p.id+'_swim8_v1'],cell:r.cell,scale:r.scale,shifts})
   copyFileSync(root+'/'+p.sprite_sheet_path,'public/aquarium/swim/'+p.id+'_swim8_sprite.png')
  }else layouts[p.sprite_sheet_path]={cell:r.cell,scale:r.scale,shifts}
 }
 // Fixed ornaments use NULL height bounds in the existing DB contract. Their
 // intended floor placement stays explicit in the art manifest.
 const data={...p,sprite_sheet_path:sprite,speed:String(p.kind==='trash'?.001:p.speed),swim_y_min:p.kind==='decoration'?null:String(p.swim_y_min),swim_y_max:p.kind==='decoration'?null:String(p.swim_y_max)}
 if(columns.some(k=>data[k]===undefined))throw Error('Missing catalog column for '+p.id)
 const row=Object.fromEntries(columns.map(k=>[k,data[k]]))
 const existing=catalog.collectible_species.findIndex(s=>s.id===p.id)
 if(existing<0)catalog.collectible_species.push(row);else catalog.collectible_species[existing]=row
 if(!catalog.collectible_habitats.some(h=>h.species_id===p.id&&h.region_id==='nyamnyam'))catalog.collectible_habitats.push({species_id:p.id,region_id:'nyamnyam'})
 if(p.kind==='fish'){
  const path=sprite||p.thumbnail_path,bytes=readFileSync(root+'/'+path)
  const entry={id:p.id,path,facing:'right',sha256:createHash('sha256').update(bytes).digest('hex')}
  const i=facing.findIndex(a=>a.path===path);if(i<0)facing.push(entry);else facing[i]=entry
 }
 p.catalog_sprite_sheet_path=sprite;p.facing_direction=p.kind==='fish'?'right':null;p.status='reviewed'
 for(const [stage,path] of [['thumbnail',p.thumbnail_path],['sprite',p.sprite_sheet_path]]){
  if(!path)continue
  const source=root+'/sources/'+p.id+'-'+stage+'.source'
  if(!existsSync(source)){mkdirSync(dirname(source),{recursive:true});copyFileSync(p[stage+'Source'],source)}
 }
}
for(const [rarity,expected] of Object.entries(manifest.pricing.fishAverages)){
 const species=manifest.items.filter(s=>s.kind==='fish'&&s.rarity===rarity)
 const average=species.reduce((sum,s)=>sum+s.sell_price,0)/species.length
 if(average!==expected)throw Error('Wrong fish price average for '+rarity)
 console.log(`${rarity}: ${species.length} fish, average ${average}`)
}
catalog.collectible_species.sort((a,b)=>a.id.localeCompare(b.id))
catalog.collectible_habitats.sort((a,b)=>a.species_id.localeCompare(b.species_id)||a.region_id.localeCompare(b.region_id))
const write=(path,value)=>writeFileSync(path,JSON.stringify(value,null,2)+'\n')
write('supabase/catalog/catalog.json',catalog)
write('src/features/aquarium/nyamnyam-frame-layouts.json',layouts)
write('src/features/aquarium/nyamnyam-mythic-action-layouts.json',mythics)
write('src/features/aquarium/artwork-facing.json',facing)
write(root+'/registration.json',registration)
manifest.batch='20261023-034400'
manifest.entries=manifest.items.filter(p=>p.frames===8).map(p=>({id:p.id,frames:8,columns:4,source:'sources/'+p.id+'-sprite.source',storage_path:p.sprite_sheet_path,prompt:p.spritePrompt,referenceRoles:{thumbnail:'approved character identity',guide:'safe placement and uniform scale only'}}))
if(manifest.entries.some(e=>!e.prompt))throw Error('Missing exact final mythic prompt')
write(root+'/manifest.json',manifest)
console.log(`Registered ${manifest.items.length} nyamnyam catalog entries and ${mythics.length} action sheets locally.`)
