import {loadEnvFile} from 'node:process'
import {readFileSync,writeFileSync} from 'node:fs'
import {createHash} from 'node:crypto'
import {createClient} from '@supabase/supabase-js'
loadEnvFile('.env.storage.local')
const expected='ewafafphiovbpjwogwzn.supabase.co'
if(new URL(process.env.SUPABASE_URL).hostname!==expected)throw Error('Wrong project')
const client=createClient(process.env.SUPABASE_URL,process.env.SUPABASE_SECRET_KEY,{auth:{persistSession:false,autoRefreshToken:false}})
const ids=['bait_moonshade_dumpling','bait_deep_sleep_sachet']
const check=result=>{if(result.error)throw Error(result.error.message);return result.data}
const rows=check(await client.from('fishing_baits').select('*').in('id',ids))
if(rows.length!==2)throw Error('Missing bait rows')
const catalog=JSON.parse(readFileSync('supabase/catalog/catalog.json','utf8'))
for(const row of rows){
 const local=catalog.fishing_baits.find(r=>r.id===row.id)
 for(const key of Object.keys(local))if(key!=='image_path'&&JSON.stringify(row[key])!==JSON.stringify(local[key]))throw Error('Remote/local difference: '+row.id+'/'+key)
}
console.log(JSON.stringify({project:expected,checkedAt:new Date().toISOString(),rows:rows.map(({id,name,image_path})=>({id,name,image_path}))},null,2))
if(process.argv[2]==='apply'){
 const root=process.argv[3],manifest=JSON.parse(readFileSync(root+'/manifest.json','utf8'))
 for(const asset of manifest.assets){
  const bytes=readFileSync(root+'/'+asset.storage_path)
  const url=client.storage.from('collectibles').getPublicUrl(asset.storage_path).data.publicUrl
  const response=await fetch(url)
  if(!response.ok)throw Error('Image not uploaded: '+asset.id)
  const downloaded=Buffer.from(await response.arrayBuffer())
  const hash=b=>createHash('sha256').update(b).digest('hex')
  if(hash(bytes)!==hash(downloaded))throw Error('Storage hash mismatch')
  const updated=check(await client.from('fishing_baits').update({image_path:url}).eq('id',asset.id).eq('image_path',rows.find(r=>r.id===asset.id).image_path).select('id,image_path'))
  if(updated.length!==1)throw Error('Concurrent image update: '+asset.id)
 }
 const after=check(await client.from('fishing_baits').select('*').in('id',ids))
 for(const row of after){
  const before=rows.find(r=>r.id===row.id),local=catalog.fishing_baits.find(r=>r.id===row.id)
  if(row.image_path!==local.image_path)throw Error('Final image mismatch')
  for(const key of Object.keys(before))if(key!=='image_path'&&JSON.stringify(row[key])!==JSON.stringify(before[key]))throw Error('Unexpected change: '+key)
 }
 writeFileSync(root+'/remote-verification.json',JSON.stringify({project:expected,verifiedAt:new Date().toISOString(),scope:'Two bait image paths and two public Storage file hashes only; full schema and migration history not verified',rows:after.map(({id,image_path})=>({id,image_path}))},null,2)+'\n')
 console.log('Verified both image paths; other bait columns preserved.')
}
