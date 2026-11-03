import fs from 'node:fs'
import path from 'node:path'
import {fileURLToPath} from 'node:url'
import {createHash} from 'node:crypto'
import sharp from 'sharp'
const batch=path.dirname(fileURLToPath(import.meta.url)),file=path.join(batch,'manifest.json')
const manifest=JSON.parse(fs.readFileSync(file,'utf8'))
for(const item of manifest.items){
 const size=item.kind==='crop'?256:512
 const bytes=await sharp(path.join(batch,item.source)).resize(size,size,{fit:'inside',withoutEnlargement:true}).png({compressionLevel:9}).toBuffer()
 for(const dest of [path.join(batch,item.thumbnail_path),path.join('public',item.thumbnail_path)]){
  fs.mkdirSync(path.dirname(dest),{recursive:true});fs.writeFileSync(dest,bytes)
 }
 item.sha256=createHash('sha256').update(bytes).digest('hex')
}
fs.writeFileSync(file,JSON.stringify(manifest,null,2)+'\n')
