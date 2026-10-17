import {loadEnvFile} from 'node:process'
import {readFileSync,writeFileSync} from 'node:fs'
import {createHash} from 'node:crypto'
import {createClient} from '@supabase/supabase-js'
loadEnvFile('.env.storage.local')
const client=createClient(process.env.SUPABASE_URL,process.env.SUPABASE_SECRET_KEY,{auth:{persistSession:false}})
const base='assets/storage-upload/new/cloudferry/'
const files=[['regions','cloudferry.png','regions/cloudferry.png'],['collectibles','map/routes/map-cloudferry_thumbnail.png','map/routes/map-cloudferry_thumbnail.png'],['collectibles','equipment/rods/cloudferry/thumbnail.png','equipment/rods/cloudferry/thumbnail.png']]
const verified=[]
for(const [bucket,key,file] of files){
 const bytes=readFileSync(base+file)
 const result=await client.storage.from(bucket).upload(key,bytes,{contentType:'image/png',upsert:false})
 if(result.error&&String(result.error.statusCode)!=='409')throw Error('Upload failed: '+key+' '+result.error.statusCode)
 const response=await fetch(client.storage.from(bucket).getPublicUrl(key).data.publicUrl)
 if(!response.ok)throw Error('Public image unavailable: '+key)
 const digest=b=>createHash('sha256').update(b).digest('hex')
 if(digest(Buffer.from(await response.arrayBuffer()))!==digest(bytes))throw Error('Image mismatch: '+key)
 verified.push({bucket,key,sha256:digest(bytes)})
}
writeFileSync(base+'remote-assets.json',JSON.stringify({verifiedAt:new Date().toISOString(),verified},null,2)+'\n')
console.log('Verified 3 uploaded images by SHA256. Region database installation remains separate.')
