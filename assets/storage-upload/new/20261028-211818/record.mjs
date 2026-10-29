import fs from 'node:fs'
import path from 'node:path'
import crypto from 'node:crypto'
const batch=decodeURIComponent(path.dirname(new URL(import.meta.url).pathname.replace(/^\/([A-Za-z]:)/,'$1')))
const [id,type,source]=process.argv.slice(2)
if(!['thumbnail','sprite'].includes(type))throw Error('Invalid asset type')
const file=path.join(batch,'manifest.json'),manifest=JSON.parse(fs.readFileSync(file,'utf8'))
const item=manifest.items.find(i=>i.id===id)
if(!item)throw Error('Unknown item')
const target=path.join(batch,type==='thumbnail'?item.thumbnail_path:item.sprite_sheet_path)
fs.mkdirSync(path.dirname(target),{recursive:true})
fs.mkdirSync(path.join(batch,'sources'),{recursive:true})
fs.copyFileSync(source,target)
fs.copyFileSync(source,path.join(batch,'sources',`${id}-${type}.source`))
item.generated??={}
item.generated[type]={tool:'built-in image_gen',original_file:source,sha256:crypto.createHash('sha256').update(fs.readFileSync(source)).digest('hex'),created_at:new Date().toISOString()}
fs.writeFileSync(file,JSON.stringify(manifest,null,2)+'\n')
console.log(`${id}: ${type} saved`)
