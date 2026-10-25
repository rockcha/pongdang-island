import {loadEnvFile} from 'node:process'
import {readFileSync,writeFileSync,mkdirSync} from 'node:fs'
import {createHash} from 'node:crypto'
loadEnvFile('.env.storage.local')
const project='ewafafphiovbpjwogwzn',mode=process.argv[2]
if(process.env.SUPABASE_URL!==`https://${project}.supabase.co`)throw Error('Unexpected project')
const before=JSON.parse(readFileSync('artifacts/cancel-showcase-preflight.json','utf8')).data[0].preflight
const files=['20261025150337_cancel_harbor_voyages.sql','20261025150432_mythic_relic_showcases.sql']
const dir='supabase/inspection/remote/cancellation-showcase';mkdirSync(dir,{recursive:true})
const quote=s=>"'"+s.replaceAll("'","''")+"'",norm=s=>s.replaceAll('\r\n','\n')
const canonical=v=>JSON.stringify(v,(_,x)=>x&&typeof x==='object'&&!Array.isArray(x)?Object.fromEntries(Object.entries(x).sort(([a],[b])=>a.localeCompare(b))):x)
const md5=s=>createHash('md5').update(norm(s)).digest('hex')
async function api(path,options={}){
 const r=await fetch(`https://api.supabase.com/v1/projects/${project}${path}`,{...options,headers:{Authorization:'Bearer '+process.env.SUPABASE_ACCESS_TOKEN,'Content-Type':'application/json'}})
 if(!r.ok)throw Error('Management HTTP '+r.status+': '+(await r.text()).slice(0,400))
 return r.json()
}
async function query(sql,readOnly=true){return api('/database/query',{method:'POST',body:JSON.stringify({query:sql,read_only:readOnly})})}
const identity=await api('')
if(identity.id!==project||identity.name!=='pongdang-island')throw Error('Project identity mismatch')
const names=[...before.functions.map(f=>f.name),'cancel_harbor_voyage','relic_showcase_catch']
const functionSql=`select n.nspname as schema,p.proname as name,pg_get_functiondef(p.oid) as definition from pg_proc p join pg_namespace n on n.oid=p.pronamespace where n.nspname in ('public','app_private') and p.proname in (${names.map(quote).join(',')})`
if(mode==='deploy'){
 const current=await query(functionSql)
 for(const f of before.functions)if(!current.some(c=>c.schema==='app_private'&&c.name===f.name&&norm(c.definition)===norm(f.definition)))throw Error('Remote drift '+f.name)
 const versions=await query(`select version from supabase_migrations.schema_migrations where version in (${files.map(f=>quote(f.slice(0,14))).join(',')})`)
 if(versions.length)throw Error('Already recorded; use verify')
 const advisors=await api('/advisors/security');writeFileSync(dir+'/advisors-before.json',JSON.stringify(advisors,null,2))
 const statements=['begin;',"set local lock_timeout='5s';","set local statement_timeout='30s';",'lock table public.harbor_voyages in share row exclusive mode;',
 'create temporary table preserved_voyages on commit drop as select id,vessel_snapshot,departed_at,returns_at from public.harbor_voyages where claimed_at is null;']
 for(const f of before.functions)statements.push(`do $$begin if md5(replace(pg_get_functiondef('app_private.${f.name}(${f.name==='publish_fishing_showcase'?'uuid,text':f.name==='finish_fishing'?'uuid,boolean':f.name==='fishing_relic_payload'?'text':f.name==='settle_legacy_harbor'?'text,uuid,text,uuid,integer':f.name==='harbor_action'?'text,uuid,text,uuid,integer,uuid,integer,text,text':''})'::regprocedure),chr(13)||chr(10),chr(10)))<>${quote(md5(f.definition))} then raise exception 'CANCEL_SHOWCASE_FUNCTION_DRIFT';end if;end$$;`)
 for(const file of files){
  const source=norm(readFileSync('supabase/migrations/'+file,'utf8'))
  statements.push(source.split('\n').filter(l=>!/^\s*(begin|commit);\s*$/i.test(l)).join('\n'))
  statements.push(`insert into supabase_migrations.schema_migrations(version,name,statements) values(${quote(file.slice(0,14))},${quote(file.slice(15,-4))},array[${quote(source)}]);`)
 }
 statements.push("do $$begin if exists(select 1 from preserved_voyages b left join public.harbor_voyages a on a.id=b.id where a.id is null or (a.vessel_snapshot,a.departed_at,a.returns_at) is distinct from (b.vessel_snapshot,b.departed_at,b.returns_at)) then raise exception 'EXISTING_VOYAGE_CHANGED';end if;end$$;",'commit;')
 await query(statements.join('\n'),false)
 console.log('Applied two migrations atomically; existing voyages preserved. No past history repaired.')
}
if(mode==='deploy'||mode==='verify'){
 const functions=await query(functionSql),local=JSON.parse(readFileSync('docs/db/local-schema.json','utf8')).structure
 for(const f of functions)if(!local.functions.some(l=>l.name===f.name&&l.schema===f.schema&&norm(l.definition)===norm(f.definition)))throw Error('Post-deploy function mismatch '+f.name)
 const privileges=await query("select has_function_privilege('anon','public.cancel_harbor_voyage(uuid,uuid,boolean)','execute') as cancel_anon,has_function_privilege('authenticated','public.cancel_harbor_voyage(uuid,uuid,boolean)','execute') as cancel_player,has_function_privilege('anon','public.relic_showcase_catch(text)','execute') as relic_anon,has_function_privilege('authenticated','public.relic_showcase_catch(text)','execute') as relic_player,has_table_privilege('authenticated','app_private.cancelled_harbor_voyages','SELECT') as audit_read,has_table_privilege('authenticated','app_private.cancelled_harbor_voyages','INSERT') as audit_write,relrowsecurity as audit_rls from pg_class where oid='app_private.cancelled_harbor_voyages'::regclass")
 const p=privileges[0]
 if(p.cancel_anon||!p.cancel_player||p.relic_anon||!p.relic_player||p.audit_read||p.audit_write||!p.audit_rls)throw Error('Permission mismatch')
 const smokeSql=['begin;',"set local statement_timeout='30s';",...['harbor-cancellation-smoke.sql','mythic-relic-showcase-smoke.sql'].map(f=>readFileSync('tests/fixtures/'+f,'utf8')),'rollback;','select true as rolled_back;'].join('\n')
 const smoke=await query(smokeSql,false)
 if(!smoke.some(r=>r.rolled_back))throw Error('Remote smoke rollback failed')
 const advisors=await api('/advisors/security');writeFileSync(dir+'/advisors-after.json',JSON.stringify(advisors,null,2))
 const significant=v=>(v.lints??[]).filter(l=>['WARN','ERROR'].includes(l.level)).map(l=>l.cache_key??l.name).sort()
 if(canonical(significant(advisors))!==canonical(significant(JSON.parse(readFileSync(dir+'/advisors-before.json','utf8')))))throw Error('Security warnings changed')
 const migrations=await query(`select version,name from supabase_migrations.schema_migrations where version in (${files.map(f=>quote(f.slice(0,14))).join(',')}) order by version`)
 if(migrations.length!==2)throw Error('Missing migration records')
 writeFileSync(dir+'/verification.json',JSON.stringify({project,projectName:identity.name,verifiedAt:new Date().toISOString(),scope:'Cancellation/archive permissions, relevant functions, two migration records and authenticated rollback fixtures for early/late cancellation, retry, foreign/returned rejection and mythic relic sharing. Existing historical numbering differences preserved; no full-schema parity or frontend deployment.',privileges,migrations,functionCount:functions.length,authenticatedRollbackSmoke:true,securityWarningsUnchanged:true},null,2)+'\n')
 console.log('Verified RPCs, private audit, function definitions, new history and authenticated cancellation/relic-sharing rollback tests. Security warnings unchanged.')
}
if(!['deploy','verify'].includes(mode))throw Error('Usage: cancellation-showcase-remote.mjs deploy|verify')
