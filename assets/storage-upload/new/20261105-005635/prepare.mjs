import fs from 'node:fs'
import path from 'node:path'
import sharp from 'sharp'
import {fileURLToPath} from 'node:url'
import {createHash} from 'node:crypto'

const batch=path.dirname(fileURLToPath(import.meta.url)),root=path.resolve(batch,'../../../..')
const file=path.join(batch,'manifest.json'),manifest=JSON.parse(fs.readFileSync(file,'utf8'))
const base=JSON.parse(fs.readFileSync(path.join(root,manifest.baseManifest),'utf8'))
const art=Object.fromEntries(base.items.map(item=>[item.id,{path:'/'+item.thumbnail_path,viewBox:item.viewBox}]))
for(const item of manifest.items){
 const original=fs.readFileSync(path.join(batch,item.generatedSource))
 const {data,info}=await sharp(original).ensureAlpha().resize(512,512,{fit:'contain',background:{r:0,g:0,b:0,alpha:0}}).raw().toBuffer({resolveWithObject:true})
 let left=512,top=512,right=-1,bottom=-1,transparent=0
 for(let y=0;y<512;y++)for(let x=0;x<512;x++){
  const alpha=data[(y*512+x)*4+3]
  if(alpha===0)transparent++
  if(alpha<4)continue
  left=Math.min(left,x);top=Math.min(top,y);right=Math.max(right,x);bottom=Math.max(bottom,y)
 }
 if(right<left||!transparent)throw Error(`${item.id}: expected a visible sprite with transparent background`)
 const padding=8,x=Math.max(0,left-padding),y=Math.max(0,top-padding)
 item.viewBox=`${x} ${y} ${Math.min(512,right+padding+1)-x} ${Math.min(512,bottom+padding+1)-y}`
 const bytes=await sharp(data,{raw:info}).png({compressionLevel:9,adaptiveFiltering:true}).toBuffer()
 for(const destination of [path.join(batch,item.thumbnail_path),path.join(root,'public',item.thumbnail_path)]){
  fs.mkdirSync(path.dirname(destination),{recursive:true});fs.writeFileSync(destination,bytes)
 }
 item.sourceSha256=createHash('sha256').update(original).digest('hex')
 item.sha256=createHash('sha256').update(bytes).digest('hex')
 item.layout={width:512,height:512,registrationAlphaThreshold:4,alphaBounds:{left,top,right,bottom},padding,transparentPixels:transparent,rgbaPreservedAfterResize:true}
 art[item.id]={path:'/'+item.thumbnail_path,viewBox:item.viewBox}
 console.log(`${item.id}: ${bytes.length} bytes, viewBox ${item.viewBox}`)
}
fs.writeFileSync(file,JSON.stringify(manifest,null,2)+'\n')
fs.writeFileSync(path.join(root,'src/features/farm/decoration-art.ts'),'// Generated from the base and replacement manifests in assets/storage-upload/new/20261105-005635/manifest.json.\nexport const farmDecorationArt = '+JSON.stringify(art,null,2)+' as const\n')
