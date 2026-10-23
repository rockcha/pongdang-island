import {readFileSync,writeFileSync,copyFileSync} from 'node:fs'
import {createHash} from 'node:crypto'
const root=process.argv[2]
if(!root)throw Error('Provide reviewed revision batch')
const read=p=>JSON.parse(readFileSync(p,'utf8').replace(/^\uFEFF/,''))
const write=(p,v)=>writeFileSync(p,JSON.stringify(v,null,2)+'\n')
const m=read(root+'/manifest.json'),catalog=read('supabase/catalog/catalog.json')
const audit=read(root+'/sprite-audit.json'),registration=read(root+'/registration.json'),anchors=read(root+'/anchor-results-eight.json')
const prepare=process.argv.includes('--prepare-runtime')
if(m.items.length!==4||audit.missing.length||audit.sprites.length!==4||audit.sprites.some(s=>!s.safe))throw Error('Incomplete artwork')
if(!prepare&&!read(root+'/visual-review.json').passed)throw Error('Visual review required')
const layouts=read('src/features/aquarium/halloween-mythic-action-layouts.json'),facing=read('src/features/aquarium/artwork-facing.json')
for(const e of m.items){
 const species=catalog.collectible_species.find(s=>s.id===e.id)
 if(!species||species.kind!=='fish'||species.rarity!=='mythic')throw Error('Unexpected species '+e.id)
 const r=registration.find(s=>s.id===e.id),a=anchors.find(s=>s.storage_path===e.sprite_sheet_path)
 if(!r||!a||a.frames.length!==8||a.frames.some(f=>!Number.isFinite(f.rmse)||f.rmse>60))throw Error('Unregistered artwork')
 Object.assign(r,{patch:a.patch,frames:a.frames,shifts:a.frames.map(f=>[f.dx,f.dy])})
 const layout=layouts.find(s=>s.id===e.id)
 Object.assign(layout,{cell:r.cell,scale:r.scale,shifts:r.shifts,assetVersion:2,aliases:[...new Set([...layout.aliases,e.id+'_v2',e.id+'_swim8_v2'])]})
 copyFileSync(root+'/'+e.sprite_sheet_path,'public/aquarium/swim/'+e.sprite_sheet_path.split('/').at(-1))
 const hash=p=>createHash('sha256').update(readFileSync(root+'/'+p)).digest('hex')
 const art={id:e.id,path:e.catalog_sprite_sheet_path,facing:'right',sha256:hash(e.catalog_sprite_sheet_path)}
 const prior=facing.findIndex(f=>f.path===art.path)
 if(prior<0)facing.push(art);else facing[prior]=art
 const meta={...e};Object.assign(e,species,meta)
 e.hashes=Object.fromEntries([e.thumbnail_path,e.sprite_sheet_path,e.catalog_sprite_sheet_path].map(p=>[p,hash(p)]))
 if(!prepare){species.thumbnail_path=e.thumbnail_path;species.sprite_sheet_path=e.catalog_sprite_sheet_path}
}
write('src/features/aquarium/halloween-mythic-action-layouts.json',layouts)
write('src/features/aquarium/artwork-facing.json',facing)
write(root+'/registration.json',registration)
m.entries=m.items.map(e=>({id:e.id,frames:8,columns:4,storage_path:e.sprite_sheet_path,source:'sources/'+e.id+'-sprite.source',prompt:e.spritePrompt,referenceRoles:{guide:'identity and locked placement; small subject with safe alpha margins',thumbnail:'approved redesigned creature identity'}}))
m.status=prepare?'runtime-prepared':'reviewed'
write(root+'/manifest.json',m)
if(!prepare){
 write('supabase/catalog/catalog.json',catalog)
 const sources=read('assets/references/mythic-sprites/sources.json'),path=root+'/manifest.json'
 if(!sources.manifests.includes(path))sources.manifests.push(path)
 write('assets/references/mythic-sprites/sources.json',sources)
}
console.log(prepare?'Prepared four mythic revisions for visual review':'Registered four reviewed mythic revisions; prices and release times preserved')
