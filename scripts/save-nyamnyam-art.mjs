import {readFileSync,writeFileSync,mkdirSync,copyFileSync,openSync,closeSync,unlinkSync} from 'node:fs'
import {resolve,dirname,relative} from 'node:path'
import {createHash} from 'node:crypto'

const [id,stage,source,batchRoot]=process.argv.slice(2)
const root=batchRoot||'assets/storage-upload/new/20261023-034400'
if(!/^assets\/storage-upload\/new\/\d{8}-\d{6}$/.test(root))throw Error('Expected a workspace art batch')
if(!['thumbnail','sprite'].includes(stage))throw Error('Expected thumbnail or sprite')
const lockPath=root+'/manifest.lock',deadline=Date.now()+5000
let lock
while(lock===undefined){
 try{lock=openSync(lockPath,'wx')}catch(error){
  if(error.code!=='EEXIST'||Date.now()>deadline)throw error
  Atomics.wait(new Int32Array(new SharedArrayBuffer(4)),0,0,50)
 }
}
try{
const path=root+'/manifest.json',manifest=JSON.parse(readFileSync(path,'utf8'))
const item=manifest.items.find(p=>p.id===id)
if(!item)throw Error('Unknown planned species')
const sourcePath=resolve(source),generatedRoot=resolve('C:/Users/user/.codex/generated_images')
if(relative(generatedRoot,sourcePath).startsWith('..'))throw Error('Unexpected generation source')
const key=stage==='thumbnail'?item.thumbnail_path:item.sprite_sheet_path
if(!key)throw Error('Species has no animation')
const dest=resolve(root,key),bytes=readFileSync(sourcePath)
if(bytes.toString('hex',0,8)!=='89504e470d0a1a0a')throw Error('Expected a PNG')
mkdirSync(dirname(dest),{recursive:true});copyFileSync(sourcePath,dest)
const original=resolve(root,'sources',id+'-'+stage+'.source')
mkdirSync(dirname(original),{recursive:true});copyFileSync(sourcePath,original)
item[stage+'Source']=sourcePath
item[stage+'Generated']={width:bytes.readUInt32BE(16),height:bytes.readUInt32BE(20),sha256:createHash('sha256').update(bytes).digest('hex')}
item.status='generated-'+stage
writeFileSync(path,JSON.stringify(manifest,null,2)+'\n')
console.log(JSON.stringify({id,stage,path:dest,width:bytes.readUInt32BE(16),height:bytes.readUInt32BE(20)}))
}finally{closeSync(lock);unlinkSync(lockPath)}
