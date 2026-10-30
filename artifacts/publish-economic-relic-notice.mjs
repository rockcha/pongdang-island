import fs from 'node:fs'
import path from 'node:path'
import {loadEnvFile} from 'node:process'
import {createHash} from 'node:crypto'
import {createClient} from '@supabase/supabase-js'
loadEnvFile('.env.storage.local')
const project='ewafafphiovbpjwogwzn',operator='e50ad282-fb2a-485c-9124-303d560d05b1',root='assets/notices/20261030-economic-relics'
if(process.env.SUPABASE_URL!==`https://${project}.supabase.co`)throw Error('Wrong project')
const notice=JSON.parse(fs.readFileSync(root+'/notice.json','utf8'))
const quote=s=>"'"+s.replaceAll("'","''")+"'",hash=bytes=>createHash('sha256').update(bytes).digest('hex')
async function query(query,read_only=true){
 const response=await fetch(`https://api.supabase.com/v1/projects/${project}/database/query`,{method:'POST',headers:{Authorization:`Bearer ${process.env.SUPABASE_ACCESS_TOKEN}`,'Content-Type':'application/json'},body:JSON.stringify({query,read_only})})
 if(!response.ok)throw Error('Management HTTP '+response.status)
 return response.json()
}
const [preflight]=await query(`select md5(pg_get_functiondef('app_private.notice_save(uuid,text,text,text,text[],text,boolean,timestamptz,timestamptz,integer)'::regprocedure)) hash,exists(select 1 from app_private.notice_operators where user_id=${quote(operator)}) operator_valid`)
if(preflight.hash!=='b067f98002d00dc237ebe662406fc04b'||!preflight.operator_valid)throw Error('Notice authorization or definition changed')
const expected=JSON.parse(fs.readFileSync('supabase/catalog/catalog.json','utf8')).fishing_relics.filter(r=>['bait_refund_percent','savings_interest_bonus_percent'].includes(r.effect_kind))
const actual=await query(`select id,name,effect_kind,effect_value,enabled from public.fishing_relics where id in (${expected.map(r=>quote(r.id)).join(',')})`)
if(actual.length!==6||expected.some(r=>!actual.some(a=>a.id===r.id&&a.name===r.name&&a.effect_kind===r.effect_kind&&Number(a.effect_value)===r.effect_value&&a.enabled)))throw Error('New relic catalog does not match announcement')
const [gate]=await query("select position('notice_is_operator()' in pg_get_functiondef('app_private.craft_relic(text,text,uuid)'::regprocedure))>0 operator_only")
if(!gate.operator_only)throw Error('Crafting availability changed')
if(process.argv[2]!=='publish'){console.log(JSON.stringify({project,id:notice.id,title:notice.title,preflight:true}));process.exit(0)}
const client=createClient(process.env.SUPABASE_URL,process.env.SUPABASE_SECRET_KEY||process.env.SUPABASE_SERVICE_ROLE_KEY,{auth:{persistSession:false,autoRefreshToken:false}})
const verifiedImages=[]
for(const remotePath of notice.images){
 if(remotePath.split('/')[0]!==notice.id||remotePath.split('/').length!==2)throw Error('Invalid image path')
 const bytes=fs.readFileSync(path.join(root,path.basename(remotePath)))
 if(bytes.length>5*1024*1024)throw Error('Image exceeds upload limit')
 const {error}=await client.storage.from('notice-images').upload(remotePath,bytes,{contentType:'image/png',upsert:false,cacheControl:'31536000'})
 if(error&&String(error.statusCode)!=='409'&&error.message!=='The resource already exists')throw Error('Notice image upload failed')
 const {data,error:downloadError}=await client.storage.from('notice-images').download(remotePath)
 if(downloadError||hash(Buffer.from(await data.arrayBuffer()))!==hash(bytes))throw Error('Notice image hash mismatch')
 verifiedImages.push({path:remotePath,sha256:hash(bytes)})
}
const existing=await query(`select id,status,body,images from public.notices where id=${quote(notice.id)}::uuid`)
if(existing.length){
 if(existing[0].status!=='published'||existing[0].body!==notice.body||JSON.stringify(existing[0].images)!==JSON.stringify(notice.images))throw Error('Existing notice differs; do not overwrite')
}else{
 await query(`begin;set local role authenticated;select set_config('request.jwt.claim.sub',${quote(operator)},true);select public.notice_save(${quote(notice.id)}::uuid,${quote(notice.category)},${quote(notice.title)},${quote(notice.body)},array[${notice.images.map(quote).join(',')}]::text[],'published',false,null,null,0);commit;`,false)
}
const [saved]=await query(`select id,title,status,published_at,body=${quote(notice.body)} body_verified,images,category from public.notices where id=${quote(notice.id)}::uuid`)
if(!saved||!saved.body_verified||saved.status!=='published'||saved.title!==notice.title||saved.images.length!==2)throw Error('Published notice verification failed')
for(const image of verifiedImages){
 const {data,error}=await client.storage.from('notice-images').createSignedUrl(image.path,60)
 if(error)throw Error('Cannot sign notice image')
 const response=await fetch(data.signedUrl)
 if(!response.ok||hash(Buffer.from(await response.arrayBuffer()))!==image.sha256)throw Error('Notice image viewer verification failed')
}
const receipt={project,...saved,verifiedImages,verifiedAt:new Date().toISOString()}
fs.writeFileSync(root+'/receipt.json',JSON.stringify(receipt,null,2)+'\n')
console.log(JSON.stringify(receipt))
