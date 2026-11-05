import fs from 'node:fs'
import path from 'node:path'
import sharp from 'sharp'
import {fileURLToPath} from 'node:url'
import {createHash} from 'node:crypto'

const batch=path.dirname(fileURLToPath(import.meta.url)),root=path.resolve(batch,'../../../..')
const file=path.join(batch,'manifest.json'),manifest=JSON.parse(fs.readFileSync(file,'utf8')),art={}
const size=manifest.composition.canvasSize,threshold=manifest.composition.registrationAlphaThreshold
manifest.composition.maximumCenterError=0
function bounds(data,info){
 let left=info.width,top=info.height,right=-1,bottom=-1
 for(let y=0;y<info.height;y++)for(let x=0;x<info.width;x++)if(data[(y*info.width+x)*4+3]>=threshold){
  left=Math.min(left,x);top=Math.min(top,y);right=Math.max(right,x);bottom=Math.max(bottom,y)
 }
 if(right<left)throw Error('Missing visible foreground')
 return {left,top,right,bottom,width:right-left+1,height:bottom-top+1,centerX:(left+right+1)/2,centerY:(top+bottom+1)/2}
}
for(const item of manifest.items){
 const source=path.join(batch,item.generatedSource),original=fs.readFileSync(source)
 let bytes
 if(item.layer==='soil'){
  const metadata=await sharp(original).metadata()
  if(metadata.width!==metadata.height)throw Error('The soil source must itself be square')
  const {data,info}=await sharp(original).resize(size,size).ensureAlpha().raw().toBuffer({resolveWithObject:true})
  for(let i=3;i<data.length;i+=4)if(data[i]!==255)throw Error('The soil must be opaque across the complete square')
  bytes=await sharp(data,{raw:info}).png({compressionLevel:9,adaptiveFiltering:true}).toBuffer()
  item.layout={width:size,height:size,opaqueFullSquare:true,padding:0}
 }else{
  const originalPixels=await sharp(original).ensureAlpha().raw().toBuffer({resolveWithObject:true})
  if(!originalPixels.data.some((value,index)=>index%4===3&&value===0))throw Error(`${item.id}: missing alpha transparency`)
  const sourceBounds=bounds(originalPixels.data,originalPixels.info),pad=4
  const left=Math.max(0,sourceBounds.left-pad),top=Math.max(0,sourceBounds.top-pad)
  const crop={left,top,width:Math.min(originalPixels.info.width,sourceBounds.right+1+pad)-left,height:Math.min(originalPixels.info.height,sourceBounds.bottom+1+pad)-top}
  let resized,resizedBounds,extent=item.targetExtent
  // Even visible dimensions allow exact integer-pixel centering without stretching.
  for(;extent>=item.targetExtent-16;extent--){
   resized=await sharp(original).extract(crop).ensureAlpha().resize(extent,extent,{fit:'inside'}).raw().toBuffer({resolveWithObject:true})
   resizedBounds=bounds(resized.data,resized.info)
   if(resizedBounds.width%2===0&&resizedBounds.height%2===0)break
  }
  if(!resized||!resizedBounds||resizedBounds.width%2||resizedBounds.height%2)throw Error(`${item.id}: cannot register an exact pixel center`)
  const offset={left:Math.round(size/2-resizedBounds.centerX),top:Math.round(size/2-resizedBounds.centerY)}
  if(offset.left<0||offset.top<0||offset.left+resized.info.width>size||offset.top+resized.info.height>size)throw Error(`${item.id}: foreground exceeds its canvas`)
  const sprite=await sharp(resized.data,{raw:resized.info}).png().toBuffer()
  bytes=await sharp({create:{width:size,height:size,channels:4,background:{r:0,g:0,b:0,alpha:0}}}).composite([{input:sprite,...offset}]).png({compressionLevel:9,adaptiveFiltering:true}).toBuffer()
  const final=await sharp(bytes).raw().toBuffer({resolveWithObject:true}),finalBounds=bounds(final.data,final.info)
  if(finalBounds.centerX!==size/2||finalBounds.centerY!==size/2)throw Error(`${item.id}: foreground is not centered`)
  item.layout={width:size,height:size,sourceCrop:crop,uniformScale:true,normalizedExtent:extent,resizedWidth:resized.info.width,resizedHeight:resized.info.height,offset,visibleBounds:finalBounds,centerError:{x:finalBounds.centerX-size/2,y:finalBounds.centerY-size/2}}
 }
 for(const destination of [path.join(batch,item.thumbnail_path),path.join(root,'public',item.thumbnail_path)]){
  fs.mkdirSync(path.dirname(destination),{recursive:true});fs.writeFileSync(destination,bytes)
 }
 item.sourceSha256=createHash('sha256').update(original).digest('hex')
 item.sha256=createHash('sha256').update(bytes).digest('hex')
 art[item.id]='/'+item.thumbnail_path
 console.log(`${item.id}: ${bytes.length} bytes, ${item.layer==='soil'?'opaque square':`center ${item.layout.visibleBounds.centerX}, ${item.layout.visibleBounds.centerY}`}`)
}
fs.writeFileSync(file,JSON.stringify(manifest,null,2)+'\n')
fs.writeFileSync(path.join(root,'src/features/farm/plot-art-assets.ts'),`// Generated from assets/storage-upload/new/20261105-002745/manifest.json\nexport const farmPlotViewBox='0 0 512 512'\nexport const farmPlotImages=${JSON.stringify(art,null,2)} as const\n`)
