import {loadEnvFile} from 'node:process'
import {readFileSync,writeFileSync} from 'node:fs'
import {createHash} from 'node:crypto'
loadEnvFile('.env.storage.local')
const project='ewafafphiovbpjwogwzn',file='20261025161251_reduce_background_query_contention.sql'
const dir='supabase/inspection/remote/latency',mode=process.argv[2]
if(new URL(process.env.SUPABASE_URL).hostname!==project+'.supabase.co')throw Error('Project mismatch')
const norm=s=>s.replaceAll('\r\n','\n'),quote=s=>"'"+s.replaceAll("'","''")+"'"
async function api(path,options={}){
 const response=await fetch('https://api.supabase.com/v1/projects/'+project+path,{...options,headers:{Authorization:'Bearer '+process.env.SUPABASE_ACCESS_TOKEN,'Content-Type':'application/json'}})
 if(!response.ok)throw Error('Management HTTP '+response.status)
 return response.json()
}
const query=(sql,readOnly=true)=>api('/database/query',{method:'POST',body:JSON.stringify({query:sql,read_only:readOnly})})
const identity=await api('')
if(identity.id!==project||identity.name!=='pongdang-island')throw Error('Project identity mismatch')
const local=JSON.parse(readFileSync('docs/db/local-schema.json','utf8')).structure
const before=JSON.parse(readFileSync(dir+'/preflight.json','utf8'))
if(before.project!==project)throw Error('Preflight project mismatch')
const warningKeys=data=>(data.lints??[]).filter(x=>['WARN','ERROR'].includes(x.level)).map(x=>x.cache_key??x.name).sort()
if(mode==='deploy'){
 const current=await query("select n.nspname as schema,p.proname as name,pg_get_function_identity_arguments(p.oid) as arguments,pg_get_functiondef(p.oid) as definition from pg_proc p join pg_namespace n on n.oid=p.pronamespace where n.nspname='app_private' and p.proname in ('sync_titles','process_title_queue','sync_player_titles','title_metrics','rare_title_metrics','challenge_title_metrics','everyday_title_metrics','relic_title_metrics')")
 for(const f of before.functions)if(!current.some(c=>c.schema===f.schema&&c.name===f.name&&c.arguments===f.arguments&&norm(c.definition)===norm(f.definition)))throw Error('Function drift: '+f.name)
 const source=norm(readFileSync('supabase/migrations/'+file,'utf8'))
 const advisors=await api('/advisors/security');writeFileSync(dir+'/advisors-before.json',JSON.stringify(advisors,null,2))
 const sql=['begin;',"set local lock_timeout='3s';","set local statement_timeout='30s';"]
 for(const f of before.functions){
  const hash=createHash('md5').update(norm(f.definition)).digest('hex')
  sql.push(`do $$begin if not exists(select 1 from pg_proc p join pg_namespace n on n.oid=p.pronamespace where n.nspname='app_private' and p.proname=${quote(f.name)} and pg_get_function_identity_arguments(p.oid)=${quote(f.arguments)} and md5(replace(pg_get_functiondef(p.oid),chr(13)||chr(10),chr(10)))=${quote(hash)}) then raise exception 'BACKGROUND_FUNCTION_DRIFT';end if;end$$;`)
 }
 sql.push(source,`insert into supabase_migrations.schema_migrations(version,name,statements) values(${quote(file.slice(0,14))},${quote(file.slice(15,-4))},array[${quote(source)}]);`,'commit;')
 await query(sql.join('\n'),false)
 console.log('Applied only the background query migration; historical migrations unchanged.')
}
if(mode==='deploy'||mode==='verify'){
 const functions=await query("select n.nspname as schema,p.proname as name,pg_get_functiondef(p.oid) as definition from pg_proc p join pg_namespace n on n.oid=p.pronamespace where (n.nspname='app_private' and p.proname in ('sync_titles','process_title_queue')) or (n.nspname='public' and p.proname='new_content_state')")
 if(functions.length!==3)throw Error('Missing functions')
 for(const f of functions)if(!local.functions.some(l=>l.schema===f.schema&&l.name===f.name&&norm(l.definition)===norm(f.definition)))throw Error('Final function mismatch: '+f.name)
 const permissions=(await query("select has_function_privilege('anon','public.new_content_state()','execute') as anon,has_function_privilege('authenticated','public.new_content_state()','execute') as player,has_function_privilege('anon','public.sync_titles()','execute') as anon_titles,has_function_privilege('authenticated','public.sync_titles()','execute') as player_titles,has_function_privilege('authenticated','app_private.process_title_queue()','execute') as player_worker"))[0]
 if(permissions.anon||!permissions.player||permissions.anon_titles||!permissions.player_titles||permissions.player_worker)throw Error('Permission mismatch')
 const smoke=await query('begin;\n'+readFileSync('tests/fixtures/background-content-smoke.sql','utf8')+'\nrollback;select true as rolled_back;',false)
 if(!smoke.some(x=>x.rolled_back))throw Error('Smoke rollback missing')
 const advisors=await api('/advisors/security');writeFileSync(dir+'/advisors-after.json',JSON.stringify(advisors,null,2))
 if(JSON.stringify(warningKeys(advisors))!==JSON.stringify(warningKeys(JSON.parse(readFileSync(dir+'/advisors-before.json','utf8')))))throw Error('Security warnings changed')
 const history=await query(`select version,name from supabase_migrations.schema_migrations where version=${quote(file.slice(0,14))}`)
 if(history.length!==1)throw Error('Migration record missing')
 writeFileSync(dir+'/verification.json',JSON.stringify({project,verifiedAt:new Date().toISOString(),scope:'Three changed functions, execution privileges, authenticated timestamp/RLS/own-post smoke rolled back, security advisor warnings and one migration record. No full schema parity, concurrency load test or frontend deployment.',permissions,history,authenticatedRollbackSmoke:true,securityWarningsUnchanged:true},null,2)+'\n')
 console.log('Verified functions, permissions, timestamp/RLS smoke rollback, security warnings and migration record.')
}
if(!['deploy','verify'].includes(mode))throw Error('Usage: background-query-remote.mjs deploy|verify')
