import {readFileSync,writeFileSync} from 'node:fs'
import {createHash} from 'node:crypto'
const root=process.argv[2]
if(!root)throw Error('Provide local draft root')
const read=p=>JSON.parse(readFileSync(p,'utf8').replace(/^\uFEFF/,'')),write=(p,v)=>writeFileSync(p,JSON.stringify(v,null,2)+'\n')
const m=read(root+'/manifest.json'),audit=read(root+'/sprite-audit.json'),registration=read(root+'/registration.json'),anchors=read(root+'/anchor-results-four.json')
if(m.status!=='local-draft'||m.deployment.database||m.deployment.storage)throw Error('Local draft only')
if(audit.missing.length||audit.sprites.length!==m.items.length||audit.sprites.some(s=>!s.safe)||audit.thumbnails.some(s=>s.edgePixels))throw Error('Artwork audit incomplete')
const layouts=read('src/features/aquarium/halloween-frame-layouts.json'),facing=read('src/features/aquarium/artwork-facing.json')
const catalog=read('supabase/catalog/catalog.json'),columns=Object.keys(catalog.collectible_species[0]),draft=[]
for(const s of m.items){
 if(catalog.collectible_species.some(e=>e.id===s.id))throw Error('Draft already in operating catalog')
 const r=registration.find(e=>e.id===s.id),a=anchors.find(e=>e.storage_path===s.sprite_sheet_path)
 if(!r||!a||a.frames.length!==4||a.frames.some(f=>!Number.isFinite(f.rmse)||f.rmse>60))throw Error('Invalid rigid registration '+s.id)
 Object.assign(r,{patch:a.patch,frames:a.frames,shifts:a.frames.map(f=>[f.dx,f.dy])})
 layouts[s.sprite_sheet_path]={cell:r.cell,scale:r.scale,shifts:r.shifts}
 s.hashes=Object.fromEntries([s.thumbnail_path,s.sprite_sheet_path].map(p=>[p,createHash('sha256').update(readFileSync(root+'/'+p)).digest('hex')]))
 const entry={id:s.id,path:s.sprite_sheet_path,facing:'right',sha256:s.hashes[s.sprite_sheet_path]}
 const i=facing.findIndex(e=>e.path===entry.path);if(i<0)facing.push(entry);else facing[i]=entry
 const data={...s,speed:String(s.speed),swim_y_min:String(s.swim_y_min),swim_y_max:String(s.swim_y_max)}
 if(columns.some(k=>data[k]===undefined))throw Error('Missing catalog field')
 draft.push(Object.fromEntries(columns.map(k=>[k,data[k]])))
}
write('src/features/aquarium/halloween-frame-layouts.json',layouts);write('src/features/aquarium/artwork-facing.json',facing)
write(root+'/registration.json',registration);write(root+'/manifest.json',m)
write(root+'/catalog-draft.json',{formatVersion:1,status:'local-only',collectible_species:draft,collectible_habitats:draft.flatMap(s=>catalog.regions.map(r=>({species_id:s.id,region_id:r.id})))})
console.log('Prepared local-only catalog candidate and runtime artwork registrations; no operating catalog, release dates, migration or remote changes')
