import {loadEnvFile} from 'node:process'
import {readFileSync,writeFileSync,mkdirSync,existsSync} from 'node:fs'
import {createHash} from 'node:crypto'
loadEnvFile('.env.storage.local')
const project='ewafafphiovbpjwogwzn',dir='supabase/inspection/remote/development-fund'
const file='20261026020123_island_development_fund.sql',version=file.slice(0,14)
const norm=s=>s.replaceAll('\r\n','\n'),hash=s=>createHash('sha256').update(s).digest('hex'),quote=s=>"'"+s.replaceAll("'","''")+"'"
if(new URL(process.env.SUPABASE_URL).hostname!==project+'.supabase.co')throw Error('Project mismatch')
async function api(path,options={}){const r=await fetch('https://api.supabase.com/v1/projects/'+project+path,{...options,headers:{Authorization:'Bearer '+process.env.SUPABASE_ACCESS_TOKEN,'Content-Type':'application/json'}});if(!r.ok)throw Error('Management API '+r.status+': '+(await r.text()).slice(0,250));return r.json()}
const query=(sql,readOnly=true)=>api('/database/query',{method:'POST',body:JSON.stringify({query:sql,read_only:readOnly})})
const identity=await api('');if(identity.id!==project||identity.name!=='pongdang-island')throw Error('Project identity mismatch')
const expected=JSON.parse(readFileSync('docs/db/local-schema.json','utf8')).structure
const source=norm(readFileSync('supabase/migrations/'+file,'utf8'))
const names=['development_fund_state','development_fund_reports','development_fund_submit','development_fund_review','development_fund_report_payload']
const functionSql=`select n.nspname schema,p.proname name,pg_get_functiondef(p.oid) definition,p.prosecdef definer,has_function_privilege('anon',p.oid,'EXECUTE') anon,has_function_privilege('authenticated',p.oid,'EXECUTE') player from pg_proc p join pg_namespace n on n.oid=p.pronamespace where n.nspname in('public','app_private') and p.proname in (${names.map(quote).join(',')}) order by n.nspname,p.proname`
const recorded=await query(`select statements from supabase_migrations.schema_migrations where version=${quote(version)}`)
if(recorded.length&&norm(recorded[0].statements[0])!==source)throw Error('Recorded migration source differs')
mkdirSync(dir,{recursive:true})
const before=existsSync(dir+'/advisors-before.json')?JSON.parse(readFileSync(dir+'/advisors-before.json','utf8')):await api('/advisors/security')
writeFileSync(dir+'/advisors-before.json',JSON.stringify(before,null,2)+'\n')
if(!recorded.length){
 const dependencies=await query("select n.nspname schema,p.proname name,pg_get_functiondef(p.oid) definition from pg_proc p join pg_namespace n on n.oid=p.pronamespace where n.nspname in('app_private','public') and p.proname='notice_is_operator'")
 for(const f of dependencies){const local=expected.functions.find(x=>x.schema===f.schema&&x.name===f.name);if(!local||norm(local.definition)!==norm(f.definition))throw Error('Operator dependency drift')}
 if(dependencies.length!==2)throw Error('Operator dependencies missing')
 if((await query(functionSql)).length)throw Error('Unrecorded fund functions already exist')
 const tables=await query("select to_regclass('app_private.island_fund_reports') reports,to_regclass('app_private.island_fund_reviews') reviews")
 if(tables[0].reports||tables[0].reviews)throw Error('Unrecorded fund tables already exist')
 const metadata=await query("select table_schema,table_name,column_name,data_type from information_schema.columns where table_schema='public' and table_name in('player_profiles','notifications') order by table_name,ordinal_position")
 for(const [table,columns] of Object.entries({player_profiles:['id','nickname','avatar_path'],notifications:['recipient_id','category','kind','title','body']}))for(const col of columns)if(!metadata.find(x=>x.table_name===table&&x.column_name===col))throw Error('Missing dependency column '+table+'.'+col)
 writeFileSync(dir+'/preflight.json',JSON.stringify({project,capturedAt:new Date().toISOString(),scope:'Operator function definitions, profile/notification metadata and absence of new objects; no player rows',dependencies,metadata,tables},null,2)+'\n')
 // Only this new CLI migration is applied. Existing history/baseline is untouched.
 const body=source.split('\n').filter(l=>!/^\s*(begin|commit);\s*$/i.test(l)).join('\n')
 await query(`begin;set local lock_timeout='3s';set local statement_timeout='30s';${body}\ninsert into supabase_migrations.schema_migrations(version,name,statements) values(${quote(version)},${quote(file.slice(15,-4))},array[${quote(source)}]);commit;`,false)
}
const functions=await query(functionSql)
if(functions.length!==9)throw Error('Fund function scope mismatch')
for(const f of functions){const local=expected.functions.find(x=>x.schema===f.schema&&x.name===f.name),internal=f.name==='development_fund_report_payload';if(!local||norm(local.definition)!==norm(f.definition)||f.anon||f.player===internal||f.definer!==(f.schema==='app_private'&&!internal))throw Error('Function definition/permission mismatch '+f.schema+'.'+f.name)}
const security=await query("select c.relname name,c.relrowsecurity rls,has_table_privilege('authenticated',c.oid,'SELECT,INSERT,UPDATE,DELETE') player,has_table_privilege('anon',c.oid,'SELECT,INSERT,UPDATE,DELETE') anon from pg_class c where c.oid in('app_private.island_fund_reports'::regclass,'app_private.island_fund_reviews'::regclass)")
if(security.length!==2||security.some(x=>!x.rls||x.player||x.anon))throw Error('Fund table access mismatch')
const indexes=await query("select indexname,indexdef from pg_indexes where schemaname='app_private' and tablename in('island_fund_reports','island_fund_reviews') order by indexname")
if(!indexes.some(x=>x.indexdef.includes('UNIQUE')&&x.indexdef.includes('bank_reference')))throw Error('Missing bank deduplication index')
await query("begin;set local statement_timeout='30s';\n"+readFileSync('tests/fixtures/development-fund-smoke.sql','utf8')+'\nrollback;select true rolled_back;',false)
const after=await api('/advisors/security'),keys=r=>r.lints.filter(l=>['WARN','ERROR'].includes(l.level)).map(l=>l.name).sort()
writeFileSync(dir+'/advisors-after.json',JSON.stringify(after,null,2)+'\n')
if(JSON.stringify(keys(before))!==JSON.stringify(keys(after)))throw Error('New security warning/error')
const capturedAt=new Date().toISOString()
writeFileSync(dir+'/verification.json',JSON.stringify({project,capturedAt,scope:['one CLI migration','nine exact function definitions and privileges','two private RLS tables','bank reference unique index','synthetic pending/operator approval/actual amount/retry/privacy/reopen fixture rolled back'],migration:{file,sha256:hash(source)},fullSchemaParity:false,frontendDeployed:false,independentSessionConcurrencyTest:false,functions,security,indexes,syntheticRollback:true,securityWarningsUnchanged:true},null,2)+'\n')
console.log(JSON.stringify({status:'PASS',project,capturedAt,migration:file,functions:functions.length,syntheticRollback:true,frontendDeployed:false}))
