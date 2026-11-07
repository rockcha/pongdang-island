import fs from 'node:fs'
import {loadEnvFile} from 'node:process'
import {createHash} from 'node:crypto'
import {createClient} from '@supabase/supabase-js'
import {batch,items,scenePaths} from './prepare-hologram-assets.mjs'

const args=process.argv.slice(2)
if(args.some(a=>!['--dry-run','--upload'].includes(a))||args.includes('--dry-run')&&args.includes('--upload'))throw Error('Use --dry-run or --upload')
const manifest=JSON.parse(fs.readFileSync(`${batch}/manifest.json`,'utf8'))
if(manifest.status!=='verified-for-release')throw Error('Finish asset and renderer review before publishing')
const files=items.flatMap(i=>[i.thumbnail_path,i.sprite_sheet_path].filter(Boolean)).concat(scenePaths)
const hash=bytes=>createHash('sha256').update(bytes).digest('hex')
let bytes=0
for(const file of files){const data=fs.readFileSync(`${batch}/${file}`),entry=manifest.items.find(e=>e.file===file);if(!entry||hash(data)!==entry.sha256)throw Error(`Artifact hash changed: ${file}`);bytes+=data.length}
if(!args.includes('--upload')){console.log(JSON.stringify({mode:'dry-run',bucket:'collectibles',files:files.length,bytes,includesOnlyCurrentRoster:true,uploaded:0}));process.exit(0)}
loadEnvFile('.env.storage.local')
const project='https://ewafafphiovbpjwogwzn.supabase.co'
if(process.env.SUPABASE_URL!==project)throw Error('Unexpected Supabase project')
const secret=process.env.SUPABASE_SECRET_KEY||process.env.SUPABASE_SERVICE_ROLE_KEY
if(!secret)throw Error('Missing server-only Storage credential')
const client=createClient(project,secret,{auth:{persistSession:false,autoRefreshToken:false}}),verified=[]
for(const file of files){
 const data=fs.readFileSync(`${batch}/${file}`)
 const {error}=await client.storage.from('collectibles').upload(file,data,{contentType:'image/png',upsert:false,cacheControl:'31536000'})
 if(error&&String(error.statusCode)!=='409'&&error.message!=='The resource already exists')throw Error(`Upload failed: ${file} (${error.statusCode??'unknown'})`)
 const url=`${project}/storage/v1/object/public/collectibles/${file}`,response=await fetch(url)
 if(!response.ok||hash(Buffer.from(await response.arrayBuffer()))!==hash(data))throw Error(`Public hash mismatch: ${file}; increment the version instead of overwriting published artwork`)
 verified.push({bucket:'collectibles',key:file,sha256:hash(data)})
 fs.writeFileSync(`${batch}/storage-verification.json`,JSON.stringify({project:'ewafafphiovbpjwogwzn',checkedAt:new Date().toISOString(),files:verified},null,2)+'\n')
}
console.log(JSON.stringify({uploadedAndVerified:verified.length}))
