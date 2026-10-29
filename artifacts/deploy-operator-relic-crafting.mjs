import fs from 'node:fs'
import {loadEnvFile} from 'node:process'
import {createHash} from 'node:crypto'
loadEnvFile('.env.storage.local')
const project='ewafafphiovbpjwogwzn'
const path='supabase/migrations/20261029094944_operator_relic_crafting.sql'
const version='20261029094944',name='operator_relic_crafting'
if(process.env.SUPABASE_URL!==`https://${project}.supabase.co`)throw Error('Project mismatch')
const sql=fs.readFileSync(path,'utf8').replaceAll('\r\n','\n')
const quote=s=>"'"+s.replaceAll("'","''")+"'"
const expected={auto_claim_due_production:'d27cf42ab5e56d81bedf3bf7fe60f893',auto_claim_production:'a7b476dfee748f47448280f5fc827833',equip_relic:'8653627aafa6e38058f9fa1721231981',relic_bonus:'49b052c91a6fbeec22df53ac2f83d784',relic_state:'12bcc6ec61eab0a311256f2df9d1068a'}
async function request(path,body){
 const response=await fetch(`https://api.supabase.com/v1/projects/${project}${path}`,{method:body?'POST':'GET',headers:{Authorization:`Bearer ${process.env.SUPABASE_ACCESS_TOKEN}`,'Content-Type':'application/json'},...(body?{body:JSON.stringify(body)}:{})})
 if(!response.ok)throw Error('Management HTTP '+response.status)
 return response.json()
}
const query=(query,read_only=true)=>request('/database/query',{query,read_only})
const identity=await request('');if(identity.id!==project&&identity.ref!==project)throw Error('Project identity mismatch')
const [prior]=await query(`select exists(select 1 from supabase_migrations.schema_migrations where version='${version}') applied,to_regclass('app_private.crafted_relics') present;`)
if(prior.applied){console.log(JSON.stringify({project,alreadyApplied:true}));process.exit(0)}
if(prior.present)throw Error('Crafting exists without expected migration; inspect drift')
const rows=await query(`select p.proname name,md5(replace(pg_get_functiondef(p.oid),E'\\r\\n',E'\\n')) hash from pg_proc p join pg_namespace n on n.oid=p.pronamespace where n.nspname='app_private' and p.proname in(${Object.keys(expected).map(quote).join(',')});`)
if(rows.length!==5||rows.some(r=>expected[r.name]!==r.hash))throw Error('Function drift; do not overwrite')
console.log(JSON.stringify({project,mode:process.argv[2]??'check',matchedFunctions:rows.length,migration:version}))
if(process.argv[2]!=='apply')process.exit(0)
let guard=''
for(const [fn,hash] of Object.entries(expected))guard+=`if (select md5(replace(pg_get_functiondef(p.oid),E'\\r\\n',E'\\n')) from pg_proc p join pg_namespace n on n.oid=p.pronamespace where n.nspname='app_private' and p.proname=${quote(fn)}) is distinct from ${quote(hash)} then raise exception 'RELIC_FUNCTION_DRIFT';end if;\n`
await query(`begin;set local statement_timeout='30s';select pg_advisory_xact_lock(hashtext('operator_relic_crafting'));do $guard$ begin ${guard} end $guard$;\n${sql}\ninsert into supabase_migrations.schema_migrations(version,name,statements) values('${version}','${name}',array[${quote(sql)}]::text[]);commit;`,false)
const [check]=await query(`select clock_timestamp() captured_at,exists(select 1 from supabase_migrations.schema_migrations where version='${version}') applied,to_regclass('app_private.crafted_relics') table_name,has_function_privilege('anon','public.craft_relic(text,text,uuid)','EXECUTE') anon_allowed,has_function_privilege('authenticated','public.craft_relic(text,text,uuid)','EXECUTE') authenticated_allowed;`)
if(!check.applied||!check.table_name||check.anon_allowed||!check.authenticated_allowed)throw Error('Post-deployment verification failed')
fs.writeFileSync('artifacts/operator-relic-crafting-deployment.json',JSON.stringify({project,migration:version,sqlHash:createHash('sha256').update(sql).digest('hex'),...check,scope:'Five pre-existing functions matched before apply. Only this migration was deployed. Full remote schema and history equivalence remain unverified.'},null,2)+'\n')
console.log(JSON.stringify({verified:check}))
