import fs from 'node:fs'
import {createHash} from 'node:crypto'
const {root}=JSON.parse(fs.readFileSync('artifacts/shared-wonders-root.json','utf8'))
const m=JSON.parse(fs.readFileSync(root+'/manifest.json','utf8')),project='ewafafphiovbpjwogwzn',files=[]
for(const item of m.items)for(const file of [item.thumbnail_path,item.sprite_sheet_path]){
 const uploaded=fs.readFileSync('artifacts/shared-wonders-upload/'+file)
 const response=await fetch(`https://${project}.supabase.co/storage/v1/object/public/collectibles/${file}`)
 if(!response.ok)throw Error('Public image unavailable '+file)
 const actual=Buffer.from(await response.arrayBuffer()),hash=b=>createHash('sha256').update(b).digest('hex')
 if(hash(actual)!==hash(uploaded))throw Error('Public hash mismatch '+file)
 fs.writeFileSync(root+'/'+file,uploaded)
 files.push({file,sha256:hash(actual),bytes:actual.length})
}
fs.writeFileSync(root+'/storage-verification.json',JSON.stringify({project,verifiedAt:new Date().toISOString(),count:files.length,files},null,2)+'\n')
console.log('Verified '+files.length+' public image hashes; batch contains exact uploaded bytes')
