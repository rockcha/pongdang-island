import fs from 'node:fs'
import path from 'node:path'
import {fileURLToPath} from 'node:url'
import {spawnSync} from 'node:child_process'
import {createHash} from 'node:crypto'
import {optimizePng} from '../../../../scripts/optimize-png-lossless.mjs'
const batch=path.dirname(fileURLToPath(import.meta.url)),manifest=JSON.parse(fs.readFileSync(path.join(batch,'manifest.json'),'utf8'))
const staging=path.resolve('artifacts/storage-staging/20261103-151800')
manifest.assets=[]
for(const item of manifest.items)for(const relative of [item.thumbnail_path,...(item.sprite_sheet_path?[item.sprite_sheet_path]:[])]){
 const file=path.join(batch,relative),original=fs.readFileSync(file),optimized=optimizePng(original)
 if(optimized.length<original.length)fs.writeFileSync(file,optimized)
 const bytes=fs.readFileSync(file),destination=path.join(staging,relative)
 fs.mkdirSync(path.dirname(destination),{recursive:true});fs.copyFileSync(file,destination)
 manifest.assets.push({storage_path:relative,sha256:createHash('sha256').update(bytes).digest('hex'),bytes:bytes.length})
}
fs.writeFileSync(path.join(batch,'manifest.json'),JSON.stringify(manifest,null,2)+'\n')
const result=spawnSync(process.execPath,['scripts/upload-collectibles.mjs',staging,...process.argv.slice(2)],{stdio:'inherit',windowsHide:true})
process.exitCode=result.status??1
