import fs from 'node:fs'
import {loadEnvFile} from 'node:process'
import {createHash} from 'node:crypto'
import {createClient} from '@supabase/supabase-js'
loadEnvFile('.env.storage.local')
const project='ewafafphiovbpjwogwzn',operator='e50ad282-fb2a-485c-9124-303d560d05b1',root='assets/notices/20261030-economic-relics'
if(process.env.SUPABASE_URL!==`https://${project}.supabase.co`)throw Error('Wrong project')
const local=JSON.parse(fs.readFileSync(root+'/notice.json','utf8'))
const quote=s=>"'"+s.replaceAll("'","''")+"'",sha=s=>createHash('sha256').update(s).digest('hex')
async function query(query,read_only=true){
 const r=await fetch(`https://api.supabase.com/v1/projects/${project}/database/query`,{method:'POST',headers:{Authorization:`Bearer ${process.env.SUPABASE_ACCESS_TOKEN}`,'Content-Type':'application/json'},body:JSON.stringify({query,read_only})})
 if(!r.ok)throw Error('Management HTTP '+r.status)
 return r.json()
}
const [guard]=await query(`select md5(pg_get_functiondef('app_private.notice_save(uuid,text,text,text,text[],text,boolean,timestamptz,timestamptz,integer)'::regprocedure)) hash,exists(select 1 from app_private.notice_operators where user_id=${quote(operator)}) valid`)
if(guard.hash!=='b067f98002d00dc237ebe662406fc04b'||!guard.valid)throw Error('Notice authorization drift')
const [before]=await query(`select id,title,body,images,status,category,pinned,starts_at,ends_at,revision from public.notices where id=${quote(local.id)}::uuid`)
if(!before||before.status!=='published'||before.body.replaceAll('만기 이자','조개 적금 이자').replaceAll('savings-interest-relics.png','savings-interest-relics-v2.png')!==local.body)throw Error('Notice changed beyond requested wording')
const client=createClient(process.env.SUPABASE_URL,process.env.SUPABASE_SECRET_KEY||process.env.SUPABASE_SERVICE_ROLE_KEY,{auth:{persistSession:false,autoRefreshToken:false}})
const imagePath=local.id+'/savings-interest-relics-v2.png',bytes=fs.readFileSync(root+'/savings-interest-relics-v2.png')
const {error}=await client.storage.from('notice-images').upload(imagePath,bytes,{contentType:'image/png',upsert:false,cacheControl:'31536000'})
if(error&&String(error.statusCode)!=='409'&&error.message!=='The resource already exists')throw Error('Image upload failed')
const {data,error:signError}=await client.storage.from('notice-images').createSignedUrl(imagePath,60)
if(signError)throw Error('Cannot sign image')
const response=await fetch(data.signedUrl)
if(!response.ok||sha(Buffer.from(await response.arrayBuffer()))!==sha(bytes))throw Error('Image byte mismatch')
if(before.body!==local.body||JSON.stringify(before.images)!==JSON.stringify(local.images)){
 const timestamp=v=>v?quote(v)+'::timestamptz':'null'
 await query(`begin;set local role authenticated;select set_config('request.jwt.claim.sub',${quote(operator)},true);select public.notice_save(${quote(local.id)}::uuid,${quote(before.category)},${quote(before.title)},${quote(local.body)},array[${local.images.map(quote).join(',')}]::text[],${quote(before.status)},${before.pinned},${timestamp(before.starts_at)},${timestamp(before.ends_at)},${before.revision});commit;`,false)
}
const [saved]=await query(`select id,status,revision,body=${quote(local.body)} body_verified,images from public.notices where id=${quote(local.id)}::uuid`)
if(!saved?.body_verified||saved.status!=='published'||JSON.stringify(saved.images)!==JSON.stringify(local.images))throw Error('Notice update mismatch')
const receipt={project,...saved,imagePath,sha256:sha(bytes),verifiedAt:new Date().toISOString()}
fs.writeFileSync(root+'/wording-update-receipt.json',JSON.stringify(receipt,null,2)+'\n')
console.log(JSON.stringify(receipt))
