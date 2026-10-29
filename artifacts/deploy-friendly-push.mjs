import fs from 'node:fs'
import {loadEnvFile} from 'node:process'
import {createHash} from 'node:crypto'
loadEnvFile('.env.storage.local')
const project='ewafafphiovbpjwogwzn',version='20261029104016',name='friendly_push_notifications'
if(process.env.SUPABASE_URL!==`https://${project}.supabase.co`)throw Error('Wrong project')
const sql=fs.readFileSync(`supabase/migrations/${version}_${name}.sql`,'utf8').replaceAll('\r\n','\n')
const expected={web_push_device:'2a369a07bfb1c04f6dea9f5950d75cce',claim_web_push:'55d52acd18851d20b84b352e6ca44195'}
const quote=s=>"'"+s.replaceAll("'","''")+"'"
async function query(query,read_only=true){
 const r=await fetch(`https://api.supabase.com/v1/projects/${project}/database/query`,{method:'POST',headers:{Authorization:`Bearer ${process.env.SUPABASE_ACCESS_TOKEN}`,'Content-Type':'application/json'},body:JSON.stringify({query,read_only})})
 if(!r.ok)throw Error('Management HTTP '+r.status)
 return r.json()
}
const stateSql=`select p.proname name,md5(replace(pg_get_functiondef(p.oid),E'\\r\\n',E'\\n')) hash from pg_proc p join pg_namespace n on n.oid=p.pronamespace where n.nspname='app_private' and p.proname in('web_push_device','claim_web_push','push_notification_payload','web_push_active_notifications');`
const [history]=await query(`select exists(select 1 from supabase_migrations.schema_migrations where version='${version}') applied;`)
if(history.applied){console.log(JSON.stringify({project,alreadyApplied:true}));process.exit(0)}
const before=await query(stateSql)
if(before.length!==2||before.some(r=>expected[r.name]!==r.hash))throw Error('Push schema drift; inspect first')
console.log(JSON.stringify({project,mode:process.argv[2]??'check',matchingFunctions:2,migration:version}))
if(process.argv[2]!=='apply')process.exit(0)
let guard=''
for(const [fn,hash] of Object.entries(expected))guard+=`if (select md5(replace(pg_get_functiondef(p.oid),E'\\r\\n',E'\\n')) from pg_proc p join pg_namespace n on n.oid=p.pronamespace where n.nspname='app_private' and p.proname=${quote(fn)}) is distinct from ${quote(hash)} then raise exception 'PUSH_FUNCTION_DRIFT';end if;\n`
await query(`begin;set local statement_timeout='30s';do $$begin ${guard} end$$;\n${sql}\ninsert into supabase_migrations.schema_migrations(version,name,statements) values('${version}','${name}',array[${quote(sql)}]::text[]);commit;`,false)
const after=await query(stateSql)
const s=JSON.parse(fs.readFileSync('docs/db/local-schema.json','utf8'))
for(const row of after){const f=s.structure.functions.find(f=>f.schema==='app_private'&&f.name===row.name);if(!f||createHash('md5').update(f.definition.replaceAll('\r\n','\n')).digest('hex')!==row.hash)throw Error('Post-apply definition mismatch')}
fs.writeFileSync('artifacts/friendly-push-deployment.json',JSON.stringify({project,migration:version,capturedAt:new Date().toISOString(),functions:after,scope:'Only this migration deployed. Full remote structure/history and actual phone delivery remain unverified.'},null,2)+'\n')
console.log(JSON.stringify({verifiedFunctions:after.length}))
