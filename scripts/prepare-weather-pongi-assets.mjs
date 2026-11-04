import fs from 'node:fs'
import path from 'node:path'
import sharp from 'sharp'

export const batch='assets/storage-upload/new/20261104-170551'
const manifest=JSON.parse(fs.readFileSync(`${batch}/manifest.json`,'utf8'))
const sprites=fs.existsSync(`${batch}/sprite-generation.json`)?JSON.parse(fs.readFileSync(`${batch}/sprite-generation.json`,'utf8')):{}
manifest.items??=manifest.entries
delete manifest.entries
// Geometry-only preparation. Creative edits and animation frames use image_gen.
for(const item of manifest.items){
 const thumbnailSource=fs.existsSync(item.sourceThumbnail)?item.sourceThumbnail:path.join(batch,'sources',`${item.id}-thumbnail.source`)
 const image=sharp(thumbnailSource)
 const metadata=await image.metadata()
 if(!metadata.hasAlpha)throw Error(`Missing alpha: ${item.id}`)
 const raw=await image.clone().ensureAlpha().raw().toBuffer({resolveWithObject:true})
 let x0=raw.info.width,y0=raw.info.height,x1=0,y1=0
 for(let y=0;y<raw.info.height;y++)for(let x=0;x<raw.info.width;x++)if(raw.data[(y*raw.info.width+x)*4+3]>=32){x0=Math.min(x0,x);y0=Math.min(y0,y);x1=Math.max(x1,x);y1=Math.max(y1,y)}
 const width=x1-x0+1,height=y1-y0+1
 const margin=24
 if(x0<margin||y0<margin||x1>=raw.info.width-margin||y1>=raw.info.height-margin)throw Error(`Source touches image edge: ${item.id}`)
 const crop={left:Math.max(0,x0-12),top:Math.max(0,y0-12),width:Math.min(raw.info.width-x0+12,width+24),height:Math.min(raw.info.height-y0+12,height+24)}
 const cropped=await sharp(thumbnailSource).extract(crop).resize({width:430,height:430,fit:'inside'}).png().toBuffer()
 const size=await sharp(cropped).metadata()
 const thumb=await sharp({create:{width:512,height:512,channels:4,background:'#00000000'}}).composite([{input:cropped,left:Math.floor((512-size.width)/2),top:Math.floor((512-size.height)/2)}]).png({compressionLevel:9}).toBuffer()
 const target=path.join(batch,item.thumbnail_path)
 fs.mkdirSync(path.dirname(target),{recursive:true});fs.writeFileSync(target,thumb)
 fs.mkdirSync(path.join(batch,'sources'),{recursive:true})
 const savedThumbnail=path.join(batch,'sources',`${item.id}-thumbnail.source`)
 if(path.resolve(thumbnailSource)!==path.resolve(savedThumbnail))fs.copyFileSync(thumbnailSource,savedThumbnail)
 const guide=path.join(batch,'guides',`${item.id}.png`)
 fs.mkdirSync(path.dirname(guide),{recursive:true})
 await sharp({create:{width:1024,height:1024,channels:4,background:'#00000000'}}).composite([0,1,2,3].map(i=>({input:thumb,left:i%2*512,top:Math.floor(i/2)*512}))).png().toFile(guide)
 console.log(item.id,`${raw.info.width}x${raw.info.height}`,`bounds ${width}x${height}`)
 if(sprites[item.key]){
  item.sourceSprite=sprites[item.key].source
  const spriteSource=fs.existsSync(item.sourceSprite)?item.sourceSprite:path.join(batch,'sources',`${item.id}-sprite.source`)
  item.spritePrompt=sprites[item.key].prompt
  item.frames=4
  const savedSprite=path.join(batch,'sources',`${item.id}-sprite.source`)
  if(path.resolve(spriteSource)!==path.resolve(savedSprite))fs.copyFileSync(spriteSource,savedSprite)
  fs.copyFileSync(spriteSource,path.join(batch,item.sprite_sheet_path))
 }
}
fs.writeFileSync(`${batch}/manifest.json`,JSON.stringify(manifest,null,2)+'\n')
