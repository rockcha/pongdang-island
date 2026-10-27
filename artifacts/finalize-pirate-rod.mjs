import fs from 'node:fs'
import {createHash} from 'node:crypto'
const {root}=JSON.parse(fs.readFileSync('artifacts/pirate-rod-root.json','utf8'))
const file=root+'/manifest.json',m=JSON.parse(fs.readFileSync(file,'utf8'))
m.files=m.items.map(i=>({id:i.id,kind:i.type,local_path:i.path,storage_path:i.type==='region-icon'?null:i.path,public_path:i.publicPath??null,raw_source:'sources/'+i.id+'.source',sha256:createHash('sha256').update(fs.readFileSync(root+'/'+i.path)).digest('hex')}))
m.runtimeOrigins={frame:.54,rotor:.45,rotorX:.478,float:.61,rotorWidth:74,reason:'Visually inspected axle centers and float body; rotation and hit-area transforms remain owned by existing fishing components.'}
m.edgeAudit='audit.json';m.storageVerification='storage-verification.json';m.previewVerification='preview-verification.json'
fs.writeFileSync(file,JSON.stringify(m,null,2)+'\n')
console.log('Finalized five generated assets and original prompts')
