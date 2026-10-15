import { createClient } from '@supabase/supabase-js'
import { existsSync,readFileSync,readdirSync } from 'node:fs'
import { createHash } from 'node:crypto'

// Keep admin credentials server-side: never use a VITE_ variable for this key.
if(existsSync('.env'))process.loadEnvFile('.env')
const apply=process.argv.includes('--apply')
const grades=['normal','rare','epic','mythic']
const localRoot='assets/storage-upload/collectibles'
const localFiles=grade=>existsSync(`${localRoot}/decorations/${grade}`)?readdirSync(`${localRoot}/decorations/${grade}`):[]
if(!apply){
 console.log('Plan: in bucket collectibles, move structures/<grade>/* to decorations/<grade>/*; upload missing local decoration PNGs. No changes made.')
 for(const grade of grades)for(const file of localFiles(grade)){
  if(file.endsWith('.png'))console.log(`decorations/${grade}/${file}`)
 }
 console.log('Apply with: node scripts/migrate-decoration-storage.mjs --apply (requires SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY or SUPABASE_SECRET_KEY).')
}else{
 const url=process.env.SUPABASE_URL??process.env.VITE_SUPABASE_URL
 const key=process.env.SUPABASE_SECRET_KEY??process.env.SUPABASE_SERVICE_ROLE_KEY
 if(!url||!key)throw new Error('Set SUPABASE_URL and SUPABASE_SECRET_KEY or SUPABASE_SERVICE_ROLE_KEY in the local environment; do not put an admin key in VITE_ variables.')
 const storage=createClient(url,key,{auth:{persistSession:false,autoRefreshToken:false}}).storage.from('collectibles')
 const hash=bytes=>createHash('sha256').update(bytes).digest('hex')
 async function list(prefix){
  const files=[]
  for(let offset=0;;offset+=100){
   const {data,error}=await storage.list(prefix,{limit:100,offset,sortBy:{column:'name',order:'asc'}})
   if(error)throw error
   for(const entry of data){
    if(!entry.id)throw new Error(`Unexpected nested folder ${prefix}/${entry.name}; move it in Dashboard before retrying.`)
    files.push(entry.name)
   }
   if(data.length<100)return files
  }
 }
 async function download(path){const {data,error}=await storage.download(path);if(error)throw error;return Buffer.from(await data.arrayBuffer())}
 for(const grade of grades){
  const destination=new Set(await list(`decorations/${grade}`))
  for(const file of await list(`structures/${grade}`)){
   const from=`structures/${grade}/${file}`,to=`decorations/${grade}/${file}`
   if(destination.has(file)){
    if(hash(await download(from))!==hash(await download(to)))throw new Error(`Different destination already exists: ${to}; nothing overwritten.`)
    const {error}=await storage.remove([from]);if(error)throw error
   }else{
    const {error}=await storage.move(from,to);if(error)throw error
    destination.add(file)
   }
   console.log(`Moved: ${from} -> ${to}`)
  }
  for(const file of localFiles(grade)){
   if(!file.endsWith('.png')||destination.has(file))continue
   const path=`decorations/${grade}/${file}`
   const bytes=readFileSync(`${localRoot}/${path}`)
   const {error}=await storage.upload(path,bytes,{contentType:'image/png',upsert:false});if(error)throw error
   if(hash(bytes)!==hash(await download(path)))throw new Error(`Upload verification failed: ${path}`)
   console.log(`Uploaded and verified: ${path}`)
  }
 }
 console.log('Storage complete. Apply SQL 25, then 24, and deploy the renamed client together.')
}
