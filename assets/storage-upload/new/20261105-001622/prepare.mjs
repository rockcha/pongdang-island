import fs from 'node:fs'
import path from 'node:path'
import {fileURLToPath} from 'node:url'
import {createHash} from 'node:crypto'
import sharp from 'sharp'

const batch=path.dirname(fileURLToPath(import.meta.url)),root=path.resolve(batch,'../../../..')
const file=path.join(batch,'manifest.json'),manifest=JSON.parse(fs.readFileSync(file,'utf8')),art={}
manifest.normalization='Uniform contain resize to transparent 512px PNG; source and resized RGBA retained without recoloring or background removal. Registration uses alpha >=4 to ignore invisible dust, with 8px extra margin around the silhouette.'
for(const item of manifest.items){
 const source=path.join(batch,item.generatedSource)
 const {data,info}=await sharp(source).ensureAlpha().resize(512,512,{fit:'contain',background:{r:0,g:0,b:0,alpha:0}}).raw().toBuffer({resolveWithObject:true})
 let left=info.width,top=info.height,right=-1,bottom=-1,transparent=0
 for(let y=0;y<info.height;y++)for(let x=0;x<info.width;x++){
  const alpha=data[(y*info.width+x)*4+3]
  if(alpha===0)transparent++
  // Ignore sub-2% alpha dust when registering the frame; preserve the PNG's RGBA.
  if(alpha<4)continue
  left=Math.min(left,x);top=Math.min(top,y);right=Math.max(right,x);bottom=Math.max(bottom,y)
 }
 if(right<left||!transparent)throw new Error(`${item.id}: expected visible artwork and transparent background`)
 const padding=8,x=Math.max(0,left-padding),y=Math.max(0,top-padding)
 item.viewBox=`${x} ${y} ${Math.min(info.width,right+padding+1)-x} ${Math.min(info.height,bottom+padding+1)-y}`
 const bytes=await sharp(data,{raw:info}).png({compressionLevel:9,adaptiveFiltering:true}).toBuffer()
 for(const dest of [path.join(batch,item.thumbnail_path),path.join(root,'public',item.thumbnail_path)]){
  fs.mkdirSync(path.dirname(dest),{recursive:true});fs.writeFileSync(dest,bytes)
 }
 item.sourceSha256=createHash('sha256').update(fs.readFileSync(source)).digest('hex')
 item.sha256=createHash('sha256').update(bytes).digest('hex')
 item.layout={width:info.width,height:info.height,registrationAlphaThreshold:4,alphaBounds:{left,top,right,bottom},padding,transparentPixels:transparent,rgbaPreservedAfterResize:true}
 art[item.id]={path:'/'+item.thumbnail_path,viewBox:item.viewBox}
 console.log(`${item.id}: ${bytes.length} bytes, viewBox ${item.viewBox}`)
}
const terrain={}
for(const item of manifest.textures??[]){
 const source=path.join(batch,item.generatedSource)
 const bytes=await sharp(source).resize(256,256,{fit:'fill'}).removeAlpha().png({compressionLevel:9,adaptiveFiltering:true}).toBuffer()
 for(const dest of [path.join(batch,item.thumbnail_path),path.join(root,'public',item.thumbnail_path)]){
  fs.mkdirSync(path.dirname(dest),{recursive:true});fs.writeFileSync(dest,bytes)
 }
 item.sourceSha256=createHash('sha256').update(fs.readFileSync(source)).digest('hex')
 item.sha256=createHash('sha256').update(bytes).digest('hex')
 item.layout={width:256,height:256,tiling:'two-axis mirrored repetition in SVG; same material in map and picker'}
 terrain[item.id]={path:'/'+item.thumbnail_path}
 console.log(`${item.id}: ${bytes.length} bytes, opaque terrain`)
}
fs.writeFileSync(file,JSON.stringify(manifest,null,2)+'\n')
fs.writeFileSync(path.join(root,'src/features/farm/decoration-art.ts'),'// Generated from assets/storage-upload/new/20261105-001622/manifest.json.\nexport const farmDecorationArt = '+JSON.stringify(art,null,2)+' as const\n')
fs.writeFileSync(path.join(root,'src/features/farm/terrain-art.ts'),'// Generated from assets/storage-upload/new/20261105-001622/manifest.json.\nexport const farmTerrainArt = '+JSON.stringify(terrain,null,2)+' as const\n')
