import {loadEnvFile} from 'node:process'
import {readFileSync,writeFileSync} from 'node:fs'
import {createHash} from 'node:crypto'
import {createClient} from '@supabase/supabase-js'
loadEnvFile('.env.storage.local')
const client=createClient(process.env.SUPABASE_URL,process.env.SUPABASE_SECRET_KEY,{auth:{persistSession:false}})
const base='assets/storage-upload/new/cloudferry/'
// Two explicitly requested image replacements. No catalog or player rows are touched.
const files=['map/routes/map-cloudferry_thumbnail.png','equipment/rods/cloudferry/thumbnail.png']
const verified=[]
for(const key of files){
 const bytes=readFileSync(base+key)
 const result=await client.storage.from('collectibles').upload(key,bytes,{contentType:'image/png',upsert:true,cacheControl:'60'})
 if(result.error)throw Error('Upload failed: '+key+' '+result.error.statusCode)
 const url=client.storage.from('collectibles').getPublicUrl(key).data.publicUrl
 const response=await fetch(url+'?v=totoro-2&verify='+Date.now())
 if(!response.ok)throw Error('Public image unavailable: '+key)
 const digest=b=>createHash('sha256').update(b).digest('hex')
 if(digest(Buffer.from(await response.arrayBuffer()))!==digest(bytes))throw Error('Image mismatch: '+key)
 verified.push({bucket:'collectibles',key,sha256:digest(bytes)})
}
writeFileSync(base+'totoro-revision/remote-assets.json',JSON.stringify({verifiedAt:new Date().toISOString(),verified},null,2)+'\n')
console.log('Verified 2 revised thumbnails by SHA256. No database changes.')
