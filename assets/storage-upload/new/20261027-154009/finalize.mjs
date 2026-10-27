import fs from 'node:fs'
import path from 'node:path'
import crypto from 'node:crypto'
import sharp from 'sharp'
const root='assets/storage-upload/new/20261027-154009'
const catalog=JSON.parse(fs.readFileSync('supabase/catalog/catalog.json','utf8'))
const species=catalog.collectible_species.filter(s=>s.native_region_id==='mechsanctum')
const file=root+'/manifest.json',old=JSON.parse(fs.readFileSync(file,'utf8'))
const entries=new Map(old.assets.map(a=>[a.storage_path??a.publicPath,a]))
for(const f of fs.readdirSync(root+'/.records')){const a=JSON.parse(fs.readFileSync(root+'/.records/'+f,'utf8'));entries.set(a.storage_path??a.publicPath,a)}
const anchovy=species.find(s=>s.id==='mechsanctum-clockwork-anchovy')
entries.set(anchovy.thumbnail_path,{id:anchovy.id,storage_path:anchovy.thumbnail_path,prompt:'Previously generated and user-approved clockwork anchovy reference; silver body, brass spring window, winding key and mint fins. Original preview prompt is not retained in this batch.',source:'C:/Users/ojr55/.codex/generated_images/01a171d4-fb61-70f1-b6c9-da5c9d12ad43/exec-9b247d94-f7cc-4707-a9fb-f33f734f3bb8.png',references:[]})
for(const s of species)for(const p of [s.thumbnail_path,s.sprite_sheet_path].filter(Boolean))if(!entries.has(p))throw Error('Missing generation record '+p)
const assets=[]
for(const entry of entries.values()){
 const local=entry.publicPath?'public/'+entry.publicPath:root+'/'+entry.storage_path
 if(!fs.existsSync(local))throw Error('Missing artwork '+local)
 const bytes=fs.readFileSync(local),metadata=await sharp(bytes).metadata()
 const source=entry.publicPath?root+'/.source/'+entry.id+'.png':root+'/.source/'+path.basename(entry.storage_path)
 assets.push({...entry,local,source_local:source,sha256:crypto.createHash('sha256').update(bytes).digest('hex'),width:metadata.width,height:metadata.height,bytes:bytes.length,source_facing:entry.frames?'right':undefined})
}
const items=species.map(s=>({id:s.id,name:s.name,kind:s.kind,rarity:s.rarity,thumbnail_path:s.thumbnail_path,sprite_sheet_path:s.sprite_sheet_path,frames:s.kind==='fish'?(s.rarity==='mythic'?8:4):0,source_facing:s.kind==='fish'?'right':null}))
const entries8=assets.filter(a=>a.frames===8).map(a=>({id:a.id,frames:8,columns:4,prompt:a.prompt,storage_path:a.storage_path,source:'.source/'+path.basename(a.storage_path),references:a.references}))
fs.writeFileSync(file,JSON.stringify({tool:'built-in image_gen.imagegen',region:'mechsanctum',items,entries:entries8,assets:assets.sort((a,b)=>a.local.localeCompare(b.local))},null,2)+'\n')
// Only runtime bucket objects enter the upload staging folder. Generation
// sources, rejected variants, guides and public application art remain local.
const stage='tmp/mechsanctum-upload'
for(const a of assets.filter(a=>a.storage_path)){const target=stage+'/'+a.storage_path;fs.mkdirSync(path.dirname(target),{recursive:true});fs.copyFileSync(a.local,target)}
console.log(JSON.stringify({species:items.length,generated:assets.length,uploadObjects:assets.filter(a=>a.storage_path).length}))
