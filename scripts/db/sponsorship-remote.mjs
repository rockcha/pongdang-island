import {loadEnvFile} from 'node:process'
import {readFileSync,writeFileSync} from 'node:fs'
import {createHash} from 'node:crypto'
loadEnvFile('.env.storage.local')
const project='ewafafphiovbpjwogwzn',file='20261025163207_sponsorship_center.sql',dir='supabase/inspection/remote/sponsorship',mode=process.argv[2]
if(new URL(process.env.SUPABASE_URL).hostname!==project+'.supabase.co')throw Error('Project mismatch')
const quote=s=>"'"+s.replaceAll("'","''")+"'",norm=s=>s.replaceAll('\r\n','\n')
async function api(path,options={}){const r=await fetch('https://api.supabase.com/v1/projects/'+project+path,{...options,headers:{Authorization:'Bearer '+process.env.SUPABASE_ACCESS_TOKEN,'Content-Type':'application/json'}});if(!r.ok)throw Error('Management HTTP '+r.status+': '+(await r.text()).slice(0,300));return r.json()}
const query=(sql,readOnly=true)=>api('/database/query',{method:'POST',body:JSON.stringify({query:sql,read_only:readOnly})})
const identity=await api('');if(identity.id!==project||identity.name!=='pongdang-island')throw Error('Identity mismatch')
const before=JSON.parse(readFileSync(dir+'/preflight.json','utf8'));if(before.project!==project||before.existing!==null)throw Error('Invalid preflight')
const local=JSON.parse(readFileSync('docs/db/local-schema.json','utf8')).structure
const functionSql="select n.nspname as schema,p.proname as name,pg_get_function_identity_arguments(p.oid) as arguments,pg_get_functiondef(p.oid) as definition from pg_proc p join pg_namespace n on n.oid=p.pronamespace where (n.nspname in ('public','app_private') and p.proname like 'sponsorship_%') or (n.nspname='app_private' and p.proname in ('get_gold_wallet','sync_player_profile'))"
const warnings=data=>(data.lints??[]).filter(x=>['WARN','ERROR'].includes(x.level)).map(x=>x.cache_key??x.name).sort()
if(mode==='deploy'){
 const current=await query(functionSql)
 for(const f of before.functions)if(!current.some(c=>c.schema===f.schema&&c.name===f.name&&c.arguments===f.arguments&&norm(c.definition)===norm(f.definition)))throw Error('Dependency drift: '+f.name)
 const advisors=await api('/advisors/security');writeFileSync(dir+'/advisors-before.json',JSON.stringify(advisors,null,2))
 const source=norm(readFileSync('supabase/migrations/'+file,'utf8'))
 const sql=['begin;',"set local lock_timeout='3s';","set local statement_timeout='30s';"]
 for(const f of before.functions){const hash=createHash('md5').update(norm(f.definition)).digest('hex');sql.push(`do $$begin if not exists(select 1 from pg_proc p join pg_namespace n on n.oid=p.pronamespace where n.nspname='app_private' and p.proname=${quote(f.name)} and pg_get_function_identity_arguments(p.oid)=${quote(f.arguments)} and md5(replace(pg_get_functiondef(p.oid),chr(13)||chr(10),chr(10)))=${quote(hash)}) then raise exception 'SPONSORSHIP_DEPENDENCY_DRIFT';end if;end$$;`)}
 sql.push(source,`insert into supabase_migrations.schema_migrations(version,name,statements) values(${quote(file.slice(0,14))},${quote(file.slice(15,-4))},array[${quote(source)}]);`,'commit;')
 await query(sql.join('\n'),false);console.log('Applied only the new sponsorship migration; existing schema/history preserved.')
}
if(mode==='deploy'||mode==='verify'){
 const functions=await query(functionSql)
 if(functions.filter(f=>f.name.startsWith('sponsorship_')).length!==11)throw Error('Missing sponsorship functions')
 for(const f of functions)if(!local.functions.some(l=>l.schema===f.schema&&l.name===f.name&&l.arguments===f.arguments&&norm(l.definition)===norm(f.definition)))throw Error('Function mismatch: '+f.name)
 const privileges=await query("select n.nspname as schema,p.proname as name,has_function_privilege('anon',p.oid,'EXECUTE') as anon,has_function_privilege('authenticated',p.oid,'EXECUTE') as player,p.prosecdef as definer from pg_proc p join pg_namespace n on n.oid=p.pronamespace where n.nspname in ('public','app_private') and p.proname like 'sponsorship_%'")
 if(privileges.some(p=>p.anon||(p.name==='sponsorship_payload'?p.player:!p.player)||(p.schema==='public'&&p.definer)))throw Error('RPC permissions mismatch')
 const tables=await query("select c.relname as name,c.relrowsecurity as rls,has_table_privilege('authenticated',c.oid,'SELECT') as player_read,has_table_privilege('authenticated',c.oid,'INSERT,UPDATE,DELETE') as player_write,has_table_privilege('anon',c.oid,'SELECT,INSERT,UPDATE,DELETE') as anon_access from pg_class c join pg_namespace n on n.oid=c.relnamespace where n.nspname='app_private' and c.relname in ('sponsorships','sponsorship_claims')")
 if(tables.length!==2||tables.some(t=>!t.rls||t.player_read||t.player_write||t.anon_access))throw Error('Private tables exposed')
 const result=await query('begin;\n'+readFileSync('tests/fixtures/sponsorship-smoke.sql','utf8')+'\nrollback;select true as rolled_back;',false)
 if(!result.some(x=>x.rolled_back))throw Error('Remote smoke rollback missing')
 const advisors=await api('/advisors/security');writeFileSync(dir+'/advisors-after.json',JSON.stringify(advisors,null,2))
 if(JSON.stringify(warnings(advisors))!==JSON.stringify(warnings(JSON.parse(readFileSync(dir+'/advisors-before.json','utf8')))))throw Error('Security warnings changed')
 const history=await query(`select version,name from supabase_migrations.schema_migrations where version=${quote(file.slice(0,14))}`)
 if(history.length!==1)throw Error('Migration record missing')
 writeFileSync(dir+'/verification.json',JSON.stringify({project,verifiedAt:new Date().toISOString(),scope:'New sponsorship functions/private tables, wallet/profile dependencies, execution permissions, equal escrow payouts, retries, last-slot closure, cancellation/refund, wallet cap and unauthorized failures using synthetic accounts rolled back. No full schema parity, independent-session concurrency/load test or frontend deployment.',privileges,tables,history,authenticatedRollbackSmoke:true,securityWarningsUnchanged:true},null,2)+'\n')
 console.log('Verified escrow/payout/refund/retry/last-slot/auth rollback smoke, RPC/table permissions, security warnings and migration record.')
}
if(!['deploy','verify'].includes(mode))throw Error('Usage: sponsorship-remote.mjs deploy|verify')
