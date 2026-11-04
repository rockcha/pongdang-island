import fs from 'node:fs'
import path from 'node:path'
import sharp from 'sharp'
import {createHash} from 'node:crypto'

const root=process.argv[2]
if(!root)throw Error('Usage: node scripts/prepare-shared-decorations.mjs <batch> [--metadata-only]')
const file=path.join(root,'manifest.json'),manifest=JSON.parse(fs.readFileSync(file,'utf8'))
for(const item of manifest.items){
 const dest=path.join(root,item.thumbnail_path),source=path.join(root,'sources',item.id+'-thumbnail.source')
 if(!process.argv.includes('--metadata-only')){
  fs.mkdirSync(path.dirname(source),{recursive:true});fs.mkdirSync(path.dirname(dest),{recursive:true})
  if(!fs.existsSync(source))fs.copyFileSync(item.sourcePath,source)
  const metadata=await sharp(source).metadata()
  if(!metadata.hasAlpha)throw Error('Missing source transparency: '+item.id)
  await sharp(source).resize(472,472,{fit:'contain',background:{r:0,g:0,b:0,alpha:0}}).extend({top:20,bottom:20,left:20,right:20,background:{r:0,g:0,b:0,alpha:0}}).png().toFile(dest)
 }
 const buffer=fs.readFileSync(dest),metadata=await sharp(buffer).metadata()
 item.final={width:metadata.width,height:metadata.height,bytes:buffer.length,sha256:createHash('sha256').update(buffer).digest('hex')}
}
fs.writeFileSync(file,JSON.stringify(manifest,null,2)+'\n')
console.log('Prepared '+manifest.items.length+' fixed decoration thumbnails')
