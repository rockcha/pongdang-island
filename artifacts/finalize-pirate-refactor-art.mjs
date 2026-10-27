import fs from 'node:fs'
import path from 'node:path'
import {createHash} from 'node:crypto'
const root='assets/storage-upload/new/20261027-090400',stage='artifacts/pirate-refactor-upload'
const m=JSON.parse(fs.readFileSync(root+'/manifest.json','utf8')),read=p=>JSON.parse(fs.readFileSync(p,'utf8'))
m.generationHistory=fs.readdirSync(root+'/generation').map(f=>read(root+'/generation/'+f))
m.entries=m.items.filter(i=>i.frames===8).map(i=>({id:i.id,frames:8,columns:4,storage_path:i.sprite_sheet_path,source:'sources/'+i.id+'-sprite.source',prompt:read(root+'/generation/'+i.id+'-sprite.json').prompt,references:[{role:'approved identity and placement guide',file:root+'/guides/'+i.id+'-sprite.png'}],styleReference:i.styleReference}))
m.files=[]
for(const item of m.items){
 item.status='reviewed'
 for(const key of [item.thumbnail_path,item.sprite_sheet_path]){
  const bytes=fs.readFileSync(root+'/'+key)
  m.files.push({file:key,storage_path:key,bucket:'collectibles',sha256:createHash('sha256').update(bytes).digest('hex'),width:bytes.readUInt32BE(16),height:bytes.readUInt32BE(20)})
  fs.mkdirSync(path.dirname(stage+'/'+key),{recursive:true});fs.copyFileSync(root+'/'+key,stage+'/'+key)
 }
}
m.registration='registration.json';m.edgeAudit='audit.json'
fs.writeFileSync(root+'/manifest.json',JSON.stringify(m,null,2)+'\n')
console.log('Staged 18 version-two assets; sources/guides/review excluded from upload')
