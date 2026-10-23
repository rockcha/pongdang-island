import {readFileSync,writeFileSync} from 'node:fs'
import {createHash} from 'node:crypto'
const root=process.argv[2],prepare=process.argv.includes('--prepare-runtime')
if(!root)throw Error('Provide revision batch')
const read=p=>JSON.parse(readFileSync(p,'utf8').replace(/^\uFEFF/,''))
const write=(p,v)=>writeFileSync(p,JSON.stringify(v,null,2)+'\n')
const manifest=read(root+'/manifest.json'),catalog=read('supabase/catalog/catalog.json')
const audit=read(root+'/sprite-audit.json'),registration=read(root+'/registration.json'),anchors=read(root+'/anchor-results-four.json')
if(audit.missing.length||audit.sprites.some(s=>!s.safe)||audit.thumbnails.some(t=>t.edgePixels))throw Error('Incomplete or unsafe art')
if(!prepare&&!read(root+'/visual-review.json').passed)throw Error('Visual review required')
const facing=read('src/features/aquarium/artwork-facing.json'),layouts=read('src/features/aquarium/halloween-frame-layouts.json')
for(const e of manifest.items){
 const species=catalog.collectible_species.find(s=>s.id===e.id)
 if(!species||!e.id.startsWith('halloween-')||e.frames!== (species.sprite_sheet_path?4:1))throw Error('Unexpected revision '+e.id)
 if(e.frames===4){
  const r=registration.find(s=>s.id===e.id),a=anchors.find(s=>s.storage_path===e.sprite_sheet_path)
  if(!r||!a||a.frames.length!==4||a.frames.some(f=>!Number.isFinite(f.rmse)||f.rmse>60))throw Error('Missing measured anchor '+e.id)
  Object.assign(r,{patch:a.patch,frames:a.frames,shifts:a.frames.map(f=>[f.dx,f.dy])})
  layouts[e.sprite_sheet_path]={cell:r.cell,scale:r.scale,shifts:r.shifts}
  const art={id:e.id,path:e.sprite_sheet_path,facing:'right',sha256:createHash('sha256').update(readFileSync(root+'/'+e.sprite_sheet_path)).digest('hex')}
  const index=facing.findIndex(f=>f.path===art.path)
  if(index<0)facing.push(art);else facing[index]=art
 }
 const revision={...e};Object.assign(e,species,revision)
 e.hashes=Object.fromEntries([e.thumbnail_path,e.sprite_sheet_path].filter(Boolean).map(p=>[p,createHash('sha256').update(readFileSync(root+'/'+p)).digest('hex')]))
 if(!prepare){species.thumbnail_path=e.thumbnail_path;species.sprite_sheet_path=e.sprite_sheet_path;if(e.revisedDescription)species.description=e.revisedDescription}
}
write('src/features/aquarium/halloween-frame-layouts.json',layouts)
write('src/features/aquarium/artwork-facing.json',facing)
write(root+'/registration.json',registration)
manifest.status=prepare?'runtime-prepared':'reviewed'
write(root+'/manifest.json',manifest)
if(!prepare)write('supabase/catalog/catalog.json',catalog)
console.log(`Prepared ${manifest.items.length} existing species revisions${prepare?' for preview':' and catalog'}; prices, movement and release times preserved`)
