import fs from 'node:fs'
import path from 'node:path'
import sharp from 'sharp'
import {createHash} from 'node:crypto'
const root='assets/storage-upload/new/20261029-055051'
const read=p=>JSON.parse(fs.readFileSync(p,'utf8').replace(/^\uFEFF/,''))
const write=(p,v)=>fs.writeFileSync(p,JSON.stringify(v,null,2)+'\n')
const manifest=read(root+'/manifest.json'),assets={},layouts={},mythics=[]
for(const s of manifest.items){
 delete s.price
 if(s.id==='atlantean-sentinel')s.size=132
 if(s.kind==='decoration'){s.movement_type='fixed';s.swim_y_min=null;s.swim_y_max=null;s.flip_with_direction=false}
 s.hashes={}
 for(const [type,key] of [['thumbnail',s.thumbnail_path],...(s.frames>1?[['sprite',s.sprite_sheet_path]]:[])]){
  const file=root+'/'+key,bytes=fs.readFileSync(file)
  s.hashes[key]=createHash('sha256').update(bytes).digest('hex')
  const url=type==='sprite'?'/aquarium/swim/starruins-bluegold/'+path.basename(key):'/game-art/starruins-bluegold/'+key
  fs.mkdirSync(path.dirname('public'+url),{recursive:true});fs.copyFileSync(file,'public'+url)
  const entry={url}
  if(type==='thumbnail')for(const [size,resolution] of [[320,'small'],[640,'large']]){
   const derivative='/game-art/thumbnails/'+createHash('sha256').update(bytes).update(`webp-q88-alpha100-inside-v1:${size}`).digest('hex').slice(0,24)+`-${size}.webp`
   await sharp(bytes).resize({width:size,height:size,fit:'inside',withoutEnlargement:true}).webp({quality:88,alphaQuality:100,smartSubsample:true,effort:5}).toFile('public'+derivative)
   entry[resolution]=derivative
  }
  const aliases=[key,s.path+'_'+(type==='sprite'?'sprite':'thumbnail')+'.png']
  if(s.id==='cracked-perfume-vial')aliases.push('trash/normal/cracked-perfume-vial_thumbnail.png')
  if(s.id==='atlantean-sentinel'&&type==='sprite')aliases.push('fish/mythic/atlantean-sentinel-standing_sprite.png','fish/mythic/atlantean-sentinel-walk_sprite.png')
  for(const alias of aliases)assets[alias]=entry
  if(type==='sprite'){
   if(!s.registration)throw Error('Missing measured anchor registration '+s.id)
   const {width}=await sharp(bytes).metadata(),cell=width/(s.frames===8?4:2)
   // Final PNG already contains alignment. Never reapply legacy runtime shifts.
   const layout={cell,scale:s.registration.displayScale,shifts:Array.from({length:s.frames},()=>[0,0])}
   if(s.frames===8){
    mythics.push({id:s.id,aliases:[s.id,s.id+'-standing',s.id+'-walk',s.id+'_swim8_bluegold_v2'],...layout,assetVersion:2})
    fs.copyFileSync(file,`public/aquarium/swim/${s.id}_swim8_v2_sprite.png`)
   }else for(const alias of aliases)layouts[alias]=layout
  }
 }
}
write('src/features/aquarium/starruins-bluegold-assets.json',assets)
write('src/features/aquarium/starruins-bluegold-frame-layouts.json',layouts)
write('src/features/aquarium/starruins-bluegold-mythic-layouts.json',mythics)
manifest.status='Local art replacement wired to existing catalog paths; no catalog, prices, releases or remote storage changes'
write(root+'/manifest.json',manifest)
console.log(JSON.stringify({items:manifest.items.length,aliases:Object.keys(assets).length,layouts:Object.keys(layouts).length,mythics:mythics.length}))
