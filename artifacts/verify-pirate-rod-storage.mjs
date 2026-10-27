import fs from 'node:fs'
import {createHash} from 'node:crypto'
const {root}=JSON.parse(fs.readFileSync('artifacts/pirate-rod-root.json','utf8'))
const m=JSON.parse(fs.readFileSync(root+'/manifest.json','utf8')),project='ewafafphiovbpjwogwzn',files=[]
for(const i of m.items.filter(i=>i.type!=='region-icon')){
 const bytes=fs.readFileSync('artifacts/pirate-rod-upload/'+i.path),r=await fetch(`https://${project}.supabase.co/storage/v1/object/public/collectibles/${i.path}`)
 if(!r.ok)throw Error('Public asset unavailable '+i.path)
 const actual=Buffer.from(await r.arrayBuffer()),hash=b=>createHash('sha256').update(b).digest('hex')
 if(hash(actual)!==hash(bytes))throw Error('Public hash mismatch '+i.path)
 fs.writeFileSync(root+'/'+i.path,bytes);files.push({file:i.path,sha256:hash(actual),bytes:actual.length})
}
fs.writeFileSync(root+'/storage-verification.json',JSON.stringify({project,verifiedAt:new Date().toISOString(),count:files.length,files},null,2)+'\n')
console.log('Verified four public equipment image hashes')
