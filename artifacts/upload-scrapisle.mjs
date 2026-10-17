import {readFileSync,writeFileSync} from 'node:fs'
import {createHash} from 'node:crypto'
import {loadEnvFile} from 'node:process'
import {createClient} from '@supabase/supabase-js'
loadEnvFile('.env.storage.local')
const {batch}=JSON.parse(readFileSync('artifacts/scrapisle-plan.json','utf8')),m=JSON.parse(readFileSync(batch+'/manifest.json','utf8'))
const c=createClient(process.env.SUPABASE_URL,process.env.SUPABASE_SECRET_KEY,{auth:{persistSession:false,autoRefreshToken:false}}),files=[...m.files.map(f=>({...f,bucket:'collectibles',local:batch+'/'+f.storage_path})),{bucket:'regions',storage_path:'scrapisle.png',local:'public/banners/scrapisle-horizon.png'}]
const hash=b=>createHash('sha256').update(b).digest('hex'),proof=[]
for(const f of files){
 const bytes=readFileSync(f.local),sha256=hash(bytes)
 if(!process.argv.includes('--verify-only')){
  const {error}=await c.storage.from(f.bucket).upload(f.storage_path,bytes,{contentType:'image/png',upsert:false})
  if(error&&String(error.statusCode)!=='409'&&error.message!=='The resource already exists')throw Error('Upload failed '+f.storage_path+': '+error.message)
 }
 const {data}=c.storage.from(f.bucket).getPublicUrl(f.storage_path),r=await fetch(data.publicUrl)
 if(!r.ok||hash(Buffer.from(await r.arrayBuffer()))!==sha256)throw Error('Public hash mismatch: '+f.storage_path)
 proof.push({bucket:f.bucket,key:f.storage_path,sha256,bytes:bytes.length});console.log('Verified '+f.bucket+'/'+f.storage_path)
}
writeFileSync(batch+'/upload-verification.json',JSON.stringify({verifiedAt:new Date().toISOString(),projectHost:new URL(process.env.SUPABASE_URL).hostname,files:proof,sqlApplied:false},null,2)+'\n')
console.log(`Verified ${proof.length} public Storage files. SQL has NOT been executed.`)
