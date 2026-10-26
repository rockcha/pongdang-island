import {loadEnvFile} from 'node:process'
import {readFileSync,writeFileSync} from 'node:fs'
import {createHash} from 'node:crypto'
loadEnvFile('.env.storage.local')
const project='ewafafphiovbpjwogwzn',file='20261026022943_development_fund_counts_and_cheers.sql',dir='supabase/inspection/remote/development-fund'
const norm=s=>s.replaceAll('\r\n','\n'),quote=s=>"'"+s.replaceAll("'","''")+"'"
if(new URL(process.env.SUPABASE_URL).hostname!==project+'.supabase.co')throw Error('Project mismatch')
async function api(path,options={}){const r=await fetch('https://api.supabase.com/v1/projects/'+project+path,{...options,headers:{Authorization:'Bearer '+process.env.SUPABASE_ACCESS_TOKEN,'Content-Type':'application/json'}});if(!r.ok)throw Error('API '+r.status+': '+(await r.text()).slice(0,200));return r.json()}
const query=(query,read_only=true)=>api('/database/query',{method:'POST',body:JSON.stringify({query,read_only})})
const identity=await api('');if(identity.id!==project||identity.name!=='pongdang-island')throw Error('Identity mismatch')
const source=norm(readFileSync('supabase/migrations/'+file,'utf8')),version=file.slice(0,14),expected=JSON.parse(readFileSync('docs/db/local-schema.json','utf8')).structure
const recorded=await query(`select statements from supabase_migrations.schema_migrations where version=${quote(version)}`),before=await api('/advisors/security')
if(recorded.length){if(norm(recorded[0].statements[0])!==source)throw Error('Migration source mismatch')}
else{
 const preflight=await query("select md5(pg_get_functiondef('app_private.development_fund_state(integer)'::regprocedure)) hash,to_regclass('app_private.island_fund_cheers') cheers")
 if(preflight[0].hash!=='9a28a7cdaaef337a23ba3c56ad61e95e'||preflight[0].cheers)throw Error('Remote state drift')
 const dependencies=await query("select n.nspname schema,p.proname name,pg_get_functiondef(p.oid) definition from pg_proc p join pg_namespace n on n.oid=p.pronamespace where n.nspname='app_private' and p.proname='notice_is_operator'")
 if(dependencies.length!==1||norm(dependencies[0].definition)!==norm(expected.functions.find(x=>x.schema==='app_private'&&x.name==='notice_is_operator').definition))throw Error('Operator drift')
 writeFileSync(dir+'/minimal-preflight.json',JSON.stringify({project,capturedAt:new Date().toISOString(),scope:'Fund state hash, operator definition and new table absence; no player rows',preflight,dependencies},null,2)+'\n')
 const body=source.split('\n').filter(l=>!/^\s*(begin|commit);\s*$/i.test(l)).join('\n')
 await query(`begin;set local lock_timeout='3s';set local statement_timeout='30s';${body}\ninsert into supabase_migrations.schema_migrations(version,name,statements) values(${quote(version)},${quote(file.slice(15,-4))},array[${quote(source)}]);commit;`,false)
}
const functions=await query("select n.nspname schema,p.proname name,pg_get_functiondef(p.oid) definition,p.prosecdef definer,has_function_privilege('anon',p.oid,'EXECUTE') anon,has_function_privilege('authenticated',p.oid,'EXECUTE') player from pg_proc p join pg_namespace n on n.oid=p.pronamespace where (n.nspname in('app_private','public') and p.proname in('development_fund_cheers','development_fund_cheer')) or(n.nspname='app_private' and p.proname='development_fund_state')")
if(functions.length!==5)throw Error('Missing functions')
for(const f of functions){const local=expected.functions.find(x=>x.schema===f.schema&&x.name===f.name);if(!local||norm(local.definition)!==norm(f.definition)||f.anon||!f.player||f.definer!==(f.schema==='app_private'))throw Error('Function mismatch '+f.name)}
const security=await query("select c.relrowsecurity rls,has_table_privilege('authenticated',c.oid,'SELECT,INSERT,UPDATE,DELETE') player,has_table_privilege('anon',c.oid,'SELECT,INSERT,UPDATE,DELETE') anon from pg_class c where c.oid='app_private.island_fund_cheers'::regclass")
if(!security[0]?.rls||security[0].player||security[0].anon)throw Error('Cheer table access mismatch')
for(const fixture of ['development-fund-smoke.sql','development-fund-cheers-smoke.sql'])await query("begin;set local statement_timeout='30s';\n"+readFileSync('tests/fixtures/'+fixture,'utf8')+'\nrollback;select true rolled_back;',false)
const after=await api('/advisors/security'),keys=r=>r.lints.filter(x=>['WARN','ERROR'].includes(x.level)).map(x=>x.name).sort()
if(JSON.stringify(keys(before))!==JSON.stringify(keys(after)))throw Error('New security warnings')
const capturedAt=new Date().toISOString()
writeFileSync(dir+'/minimal-verification.json',JSON.stringify({project,capturedAt,migration:file,sha256:createHash('sha256').update(source).digest('hex'),scope:'Five exact function definitions/ACL, cheer RLS, donation and independent cheer fixtures rolled back',functions,security,syntheticRollback:true,securityWarningsUnchanged:true,fullSchemaParity:false,frontendDeployed:false},null,2)+'\n')
console.log(JSON.stringify({status:'PASS',project,capturedAt,syntheticRollback:true,frontendDeployed:false}))
