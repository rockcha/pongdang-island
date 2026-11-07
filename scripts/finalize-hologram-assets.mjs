import fs from 'node:fs'
import path from 'node:path'
import {createHash} from 'node:crypto'
import sharp from 'sharp'
import {batch,items,excludedDraftIds,scenePaths} from './prepare-hologram-assets.mjs'
const read=file=>JSON.parse(fs.readFileSync(file,'utf8').replace(/^\uFEFF/,''))
const hash=bytes=>createHash('sha256').update(bytes).digest('hex')
const browser=read('artifacts/hologram/browser/verification.json'),registration=read(`${batch}/registration.json`)
if(browser.specificationSha256!==hash(fs.readFileSync(`${batch}/specification.json`)))throw Error('Renderer verification is for a different roster specification')
if(!browser.success||browser.evidence.length!==2||browser.evidence.some(r=>r.paintedPreviews!==5||r.errors.length||r.failed.length||!r.stationaryAnemone))throw Error('Complete actual renderer verification first')
if(registration.length!==items.filter(i=>i.frames).length||registration.some(r=>!r.rgbaPreserved||r.frames.some(f=>!Number.isFinite(f.rmse)||f.rmse>40)))throw Error('Incomplete rigid anchor verification')
const manifest=read(`${batch}/manifest.json`),required=items.flatMap(i=>[i.thumbnail_path,i.sprite_sheet_path].filter(Boolean)).concat(scenePaths)
let before=0,after=0
for(const file of required){
 const entry=manifest.items.find(r=>r.file===file)
 if(!entry||!fs.existsSync(`${batch}/${file}`)||!fs.existsSync(`${batch}/${entry.preserved_source}`))throw Error(`Missing reproducible artifact ${file}`)
 const source=fs.readFileSync(`${batch}/${entry.preserved_source}`),input=fs.readFileSync(`${batch}/${file}`)
 if(entry.lossless_compression_verified&&entry.sha256===hash(input)&&entry.source_sha256===hash(source)){before+=input.length;after+=input.length;continue}
 const pixels=await sharp(input).ensureAlpha().raw().toBuffer()
 const optimized=await sharp(input).png({compressionLevel:9,adaptiveFiltering:true}).toBuffer()
 if(!(await sharp(optimized).ensureAlpha().raw().toBuffer()).equals(pixels))throw Error(`Lossless compression changed pixels: ${file}`)
 fs.writeFileSync(`${batch}/${file}`,optimized)
 const meta=await sharp(optimized).metadata()
 if((file.includes('_thumbnail.')||file.includes('/platforms/')||file.includes('/rods/'))&&!meta.hasAlpha)throw Error(`Expected alpha: ${file}`)
 Object.assign(entry,{source_sha256:hash(source),sha256:hash(optimized),rgba_sha256:hash(pixels),width:meta.width,height:meta.height,lossless_compression_verified:true})
 before+=input.length;after+=optimized.length
}
for(const file of required.filter(f=>f.startsWith('regions/')||f.startsWith('fishing/'))){const target=`public/${file}`;fs.mkdirSync(path.dirname(target),{recursive:true});fs.copyFileSync(`${batch}/${file}`,target)}
for(const item of items.filter(i=>i.rarity==='mythic'&&i.kind==='fish'))fs.copyFileSync(`${batch}/${item.sprite_sheet_path}`,`public/aquarium/swim/${item.id}_swim8_v1_sprite.png`)
const rodTarget='public/fishing/equipment/hologram-thumbnail-v1.webp',rodImage=await sharp(`${batch}/equipment/rods/hologram/thumbnail.png`).resize(320,320,{fit:'inside'}).webp({quality:90,alphaQuality:100}).toBuffer()
fs.mkdirSync(path.dirname(rodTarget),{recursive:true});fs.writeFileSync(rodTarget,rodImage)
manifest.derived_assets=[{file:rodTarget,source:'equipment/rods/hologram/thumbnail.png',profile:'webp-q90-alpha100-inside-320-v1',sha256:hash(rodImage),bytes:rodImage.length}]
manifest.status='verified-for-release'
manifest.excluded_unreleased_draft_ids=excludedDraftIds
manifest.remote_applied=false
manifest.artwork_review={reviewedSpeciesIds:items.map(i=>i.id),palette:'midnight navy / ink teal, cyan emission, sparse magenta-violet',objects:'No added character faces. Original robot display, robot head, camera lens and identity portrait features retained where part of subject.',frameLayout:`${registration.length} source grids passed: square cells, right-facing mobile species; normal sources at least 6% clear margin, mythic sources at least 8% on all sides before alignment. Rooted anemone has no head or face.`,alignment:'Visually inspected opaque rigid patches; inverse integer translation baked into final PNG with uniform padding, no per-frame scale changes.',rendererVerification:'artifacts/hologram/browser/verification.json',compression:{beforeBytes:before,afterBytes:after,rgbaUnchanged:true}}
fs.writeFileSync(`${batch}/manifest.json`,JSON.stringify(manifest,null,2)+'\n')
console.log(JSON.stringify({assets:required.length,thumbnails:items.length,alignedSprites:registration.length,beforeBytes:before,afterBytes:after,remoteApplied:false}))
