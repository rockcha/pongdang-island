import {readFileSync,writeFileSync,mkdirSync,copyFileSync} from 'node:fs'
import {dirname} from 'node:path'
import {createHash} from 'node:crypto'
const root="assets/storage-upload/new/20261022-191208"
const manifest=JSON.parse(readFileSync(root+'/manifest.json','utf8'))
const path='supabase/catalog/catalog.json'
const catalog=JSON.parse(readFileSync(path,'utf8'))
if(process.argv.includes('--finalize')){
 for(const asset of manifest.assets){
  const bytes=readFileSync(root+'/'+asset.storage_path)
  if(bytes.readUInt32BE(0)!==0x89504e47||bytes[25]!==6)throw Error('Expected RGBA PNG')
  asset.width=bytes.readUInt32BE(16);asset.height=bytes.readUInt32BE(20)
  asset.sha256=createHash('sha256').update(bytes).digest('hex')
  copyFileSync(root+'/'+asset.storage_path,'public/'+asset.storage_path)
 }
 writeFileSync(root+'/manifest.json',JSON.stringify(manifest,null,2)+'\n')
 console.log('Final RGBA dimensions and uploaded file hashes recorded; public copies synchronized.')
 process.exit(0)
}
for(const asset of manifest.assets){
 mkdirSync(dirname(root+'/'+asset.storage_path),{recursive:true})
 copyFileSync(asset.source,root+'/'+asset.storage_path)
 copyFileSync(asset.source,'public/'+asset.storage_path)
 catalog.fishing_baits.find(row=>row.id===asset.id).image_path='https://ewafafphiovbpjwogwzn.supabase.co/storage/v1/object/public/collectibles/'+asset.storage_path
}
writeFileSync(path,JSON.stringify(catalog,null,2)+'\n')
