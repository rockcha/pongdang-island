import {copyFileSync,mkdirSync,readFileSync,writeFileSync,openSync,closeSync,unlinkSync} from 'node:fs'
import {dirname,resolve,relative,isAbsolute} from 'node:path'
import {createHash} from 'node:crypto'
import {batch} from './prepare-galaxy-assets.mjs'
const input=JSON.parse(readFileSync(process.argv[2],'utf8'))
const lock=resolve(batch,'.manifest.lock')
let handle
for(let attempt=0;attempt<200;attempt++){
 try{handle=openSync(lock,'wx');break}catch(error){if(error.code!=='EEXIST')throw error;await new Promise(r=>setTimeout(r,50))}
}
if(handle===undefined)throw Error('Manifest is busy; retry receipt import')
try{
for(const receipt of Array.isArray(input)?input:[input]){
const target=resolve(batch,receipt.path),rel=relative(resolve(batch),target)
if(rel.startsWith('..')||isAbsolute(rel))throw Error('Asset destination outside batch')
mkdirSync(dirname(target),{recursive:true})
copyFileSync(receipt.source,target)
const file=batch+'/manifest.json',manifest=JSON.parse(readFileSync(file,'utf8'))
const original=`sources/${receipt.id}-${receipt.path.includes('_sprite')?'sprite':'thumbnail'}.source`
mkdirSync(resolve(batch,'sources'),{recursive:true})
copyFileSync(receipt.source,resolve(batch,original))
const replaced=manifest.assets.filter(a=>a.path===receipt.path)
if(replaced.length)manifest.superseded_assets=[...(manifest.superseded_assets??[]),...replaced]
manifest.assets=manifest.assets.filter(a=>a.path!==receipt.path)
manifest.assets.push({...receipt,source:original,generation_file:receipt.source.split(/[\\/]/).at(-1),sha256:createHash('sha256').update(readFileSync(target)).digest('hex'),generated_at:new Date().toISOString(),status:'generated-pending-audit'})
writeFileSync(file,JSON.stringify(manifest,null,2)+'\n')
console.log(JSON.stringify({path:target,count:manifest.assets.length}))
}
}finally{closeSync(handle);unlinkSync(lock)}
