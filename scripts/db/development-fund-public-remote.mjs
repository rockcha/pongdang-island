import {loadEnvFile} from 'node:process'
import {readFileSync,writeFileSync} from 'node:fs'
import {createHash} from 'node:crypto'
loadEnvFile('.env.storage.local')
const project='ewafafphiovbpjwogwzn',file='20261026022202_development_fund_public_profiles.sql',dir='supabase/inspection/remote/development-fund'
const quote=s=>"'"+s.replaceAll("'","''")+"'",norm=s=>s.replaceAll('\r\n','\n')
if(new URL(process.env.SUPABASE_URL).hostname!==project+'.supabase.co')throw Error('Project mismatch')
async function api(path,options={}){const r=await fetch('https://api.supabase.com/v1/projects/'+project+path,{...options,headers:{Authorization:'Bearer '+process.env.SUPABASE_ACCESS_TOKEN,'Content-Type':'application/json'}});if(!r.ok)throw Error('API '+r.status+': '+(await r.text()).slice(0,180));return r.json()}
const query=(query,read_only=true)=>api('/database/query',{method:'POST',body:JSON.stringify({query,read_only})})
const identity=await api('');if(identity.id!==project||identity.name!=='pongdang-island')throw Error('Identity mismatch')
const source=norm(readFileSync('supabase/migrations/'+file,'utf8')),version=file.slice(0,14)
const records=await query(`select statements from supabase_migrations.schema_migrations where version=${quote(version)}`)
const before=await api('/advisors/security')
if(records.length){if(norm(records[0].statements[0])!==source)throw Error('Recorded source mismatch')}
else{
 const preflight=await query("select md5(pg_get_functiondef('app_private.development_fund_submit(uuid,text,integer,timestamptz,text,boolean)'::regprocedure)) hash")
 if(preflight[0].hash!=='aa8c6289040e7b22bc1f3d18c2255b5d')throw Error('Submit dependency drift')
 const body=source.split('\n').filter(l=>!/^\s*(begin|commit);\s*$/i.test(l)).join('\n')
 await query(`begin;set local lock_timeout='3s';set local statement_timeout='30s';${body}\ninsert into supabase_migrations.schema_migrations(version,name,statements) values(${quote(version)},${quote(file.slice(15,-4))},array[${quote(source)}]);commit;`,false)
}
const functions=await query("select pg_get_functiondef(p.oid) definition,p.prosecdef definer,has_function_privilege('anon',p.oid,'EXECUTE') anon,has_function_privilege('authenticated',p.oid,'EXECUTE') player from pg_proc p where p.oid='app_private.development_fund_submit(uuid,text,integer,timestamptz,text,boolean)'::regprocedure")
const expected=JSON.parse(readFileSync('docs/db/local-schema.json','utf8')).structure.functions.find(x=>x.schema==='app_private'&&x.name==='development_fund_submit')
if(functions.length!==1||norm(functions[0].definition)!==norm(expected.definition)||functions[0].anon||!functions[0].player||!functions[0].definer)throw Error('Definition/privilege mismatch')
await query("begin;set local statement_timeout='30s';\n"+readFileSync('tests/fixtures/development-fund-smoke.sql','utf8')+'\nrollback;select true rolled_back;',false)
const after=await api('/advisors/security'),keys=r=>r.lints.filter(x=>['WARN','ERROR'].includes(x.level)).map(x=>x.name).sort()
if(JSON.stringify(keys(before))!==JSON.stringify(keys(after)))throw Error('Security warnings changed')
const capturedAt=new Date().toISOString()
writeFileSync(dir+'/public-policy-verification.json',JSON.stringify({project,capturedAt,migration:file,sha256:createHash('sha256').update(source).digest('hex'),scope:'Submit definition, execute privileges and synthetic public-profile/pending/approval/retry/privacy fixture',functions,syntheticRollback:true,fullSchemaParity:false,frontendDeployed:false,securityWarningsUnchanged:true},null,2)+'\n')
console.log(JSON.stringify({status:'PASS',project,capturedAt,syntheticRollback:true,frontendDeployed:false}))
