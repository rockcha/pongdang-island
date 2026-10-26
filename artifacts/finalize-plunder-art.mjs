import fs from 'node:fs'
import path from 'node:path'
import {createHash} from 'node:crypto'
const root='assets/storage-upload/new/20261027-034411',stage='artifacts/plunder-upload'
const m=JSON.parse(fs.readFileSync(root+'/manifest.json','utf8'))
const states=fs.readdirSync('artifacts/plunder-generation-state').filter(p=>p.endsWith('.json')).map(p=>JSON.parse(fs.readFileSync('artifacts/plunder-generation-state/'+p,'utf8')))
m.generationHistory=states
m.files=[]
for(const item of m.items){
 item.status='reviewed'
 item.generations=states.filter(s=>s.id===item.id)
 for(const key of [item.thumbnail_path,...(item.sprite_sheet_path?[item.sprite_sheet_path]:[])]){
  const bytes=fs.readFileSync(root+'/'+key),sha256=createHash('sha256').update(bytes).digest('hex')
  m.files.push({file:key,storage_path:key,bucket:'collectibles',sha256,width:bytes.readUInt32BE(16),height:bytes.readUInt32BE(20)})
  fs.mkdirSync(path.dirname(stage+'/'+key),{recursive:true});fs.copyFileSync(root+'/'+key,stage+'/'+key)
 }
}
m.registration='registration.json';m.edgeAudit='audit.json'
fs.writeFileSync(root+'/manifest.json',JSON.stringify(m,null,2)+'\n')
console.log('Prepared '+m.files.length+' immutable versioned assets; region art excluded from collectible upload')
