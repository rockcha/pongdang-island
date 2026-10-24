import {loadEnvFile} from 'node:process'
import {readFileSync} from 'node:fs'
loadEnvFile('.env.storage.local')
const ref='ewafafphiovbpjwogwzn',operator='e50ad282-fb2a-485c-9124-303d560d05b1'
if(new URL(process.env.SUPABASE_URL).hostname!==ref+'.supabase.co')throw Error('Wrong project')
const quote=s=>"'"+s.replaceAll("'","''")+"'",notice=JSON.parse(readFileSync('assets/notices/20261025-aquarium-panorama/notice.json','utf8'))
async function query(sql,readOnly=true){const r=await fetch(`https://api.supabase.com/v1/projects/${ref}/database/query`,{method:'POST',headers:{Authorization:`Bearer ${process.env.SUPABASE_ACCESS_TOKEN}`,'Content-Type':'application/json'},body:JSON.stringify({query:sql,read_only:readOnly})});if(!r.ok){const e=await r.json();throw Error('Notice SQL HTTP '+r.status+': '+String(e.message??'failed').slice(0,300))}return r.json()}
const [before]=await query(`select exists(select 1 from app_private.notice_operators where user_id=${quote(operator)}) as operator_exists,(select to_jsonb(n) from public.notices n where id=${quote(notice.id)}) as notice,(select pg_get_functiondef('app_private.notice_save(uuid,text,text,text,text[],text,boolean,timestamptz,timestamptz,integer)'::regprocedure)) as save_definition`)
if(!before.operator_exists)throw Error('Expected notice operator is not authorized')
const local=JSON.parse(readFileSync('docs/db/local-schema.json','utf8')).structure.functions.find(f=>f.schema==='app_private'&&f.name==='notice_save')
if(local.definition.replaceAll('\r\n','\n')!==before.save_definition.replaceAll('\r\n','\n'))throw Error('Notice RPC drift')
const mode=process.argv[2]
if(!['draft','publish'].includes(mode))throw Error('Usage: draft|publish')
const status=mode==='publish'?'published':'draft'
if(before.notice?.status==='published'&&mode==='draft')throw Error('Refusing to hide a published notice')
if(before.notice?.status==='published'&&before.notice.title===notice.title&&before.notice.body===notice.body){console.log({id:notice.id,status:'published',alreadyVerified:true});process.exit(0)}
await query(`begin;select set_config('request.jwt.claim.sub',${quote(operator)},true);set local role authenticated;
select public.notice_save(${quote(notice.id)},${quote(notice.category)},${quote(notice.title)},${quote(notice.body)},array[]::text[],${quote(status)},false,null,null,${before.notice?.revision??0});commit;`,false)
const [after]=await query(`select id,title,body,status,category,published_at from public.notices where id=${quote(notice.id)}`)
if(after.status!==status||after.title!==notice.title||after.body!==notice.body)throw Error('Notice verification mismatch')
console.log({project:ref,id:after.id,title:after.title,status:after.status,publishedAt:after.published_at})
