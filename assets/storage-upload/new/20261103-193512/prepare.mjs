import fs from 'node:fs'
import path from 'node:path'
import {fileURLToPath} from 'node:url'
import {createHash} from 'node:crypto'
import {packBuilding} from '../20261103-180113/pack.mjs'
const batch=path.dirname(fileURLToPath(import.meta.url)),file=path.join(batch,'manifest.json'),manifest=JSON.parse(fs.readFileSync(file,'utf8'))
for(const item of manifest.items){
 const {bytes,layout}=await packBuilding(path.join(batch,item.source))
 for(const dest of [path.join(batch,item.thumbnail_path),path.join('public',item.thumbnail_path)]){fs.mkdirSync(path.dirname(dest),{recursive:true});fs.writeFileSync(dest,bytes)}
 item.layout=layout;item.sha256=createHash('sha256').update(bytes).digest('hex')
}
fs.writeFileSync(file,JSON.stringify(manifest,null,2)+'\n')
