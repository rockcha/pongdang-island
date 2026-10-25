import {loadEnvFile} from 'node:process'
import {readFileSync,writeFileSync,mkdirSync} from 'node:fs'
import {createHash} from 'node:crypto'
loadEnvFile('.env.storage.local')
const project='ewafafphiovbpjwogwzn',file='20261025151918_atomic_bulk_bait_purchase.sql',mode=process.argv[2]
if(process.env.SUPABASE_URL!==`https://${project}.supabase.co`)throw Error('Unexpected project')
const before=JSON.parse(readFileSync('artifacts/bulk-bait-preflight.json','utf8')).data[0].preflight
const dir='supabase/inspection/remote/bulk-bait';mkdirSync(dir,{recursive:true})
const quote=s=>"'"+s.replaceAll("'","''")+"'",norm=s=>s.replaceAll('\r\n','\n')
async function api(path,options={}){
 const r=await fetch(`https://api.supabase.com/v1/projects/${project}${path}`,{...options,headers:{Authorization:'Bearer '+process.env.SUPABASE_ACCESS_TOKEN,'Content-Type':'application/json'}})
 if(!r.ok)throw Error('Management HTTP '+r.status+': '+(await r.text()).slice(0,400))
 return r.json()
}
async function query(sql,readOnly=true){return api('/database/query',{method:'POST',body:JSON.stringify({query:sql,read_only:readOnly})})}
const identity=await api('')
if(identity.id!==project||identity.name!=='pongdang-island')throw Error('Project identity mismatch')
const functionSql="select n.nspname as schema,p.proname as name,pg_get_functiondef(p.oid) as definition from pg_proc p join pg_namespace n on n.oid=p.pronamespace where n.nspname in ('public','app_private') and p.proname in ('buy_fishing_bait','relic_bonus','get_gold_wallet','buy_fishing_bait_bulk')"
if(mode==='deploy'){
 const current=await query(functionSql)
 for(const f of before.functions)if(!current.some(c=>c.schema==='app_private'&&c.name===f.name&&norm(c.definition)===norm(f.definition)))throw Error('Preflight function drift '+f.name)
 const exists=await query(`select version from supabase_migrations.schema_migrations where version=${quote(file.slice(0,14))}`)
 if(exists.length)throw Error('Migration already recorded; run verify')
 const advisors=await api('/advisors/security');writeFileSync(dir+'/advisors-before.json',JSON.stringify(advisors,null,2))
 const source=norm(readFileSync('supabase/migrations/'+file,'utf8'))
 const sql=['begin;',"set local lock_timeout='5s';","set local statement_timeout='30s';"]
 for(const f of before.functions){
  const md5=createHash('md5').update(norm(f.definition)).digest('hex')
  sql.push(`do $$begin if not exists(select 1 from pg_proc p join pg_namespace n on n.oid=p.pronamespace where n.nspname='app_private' and p.proname=${quote(f.name)} and pg_get_function_identity_arguments(p.oid)=${quote(f.arguments)} and md5(replace(pg_get_functiondef(p.oid),chr(13)||chr(10),chr(10)))=${quote(md5)}) then raise exception 'BULK_BAIT_FUNCTION_DRIFT';end if;end$$;`)
 }
 sql.push(source.split('\n').filter(l=>!/^\s*(begin|commit);\s*$/i.test(l)).join('\n'))
 sql.push(`insert into supabase_migrations.schema_migrations(version,name,statements) values(${quote(file.slice(0,14))},${quote(file.slice(15,-4))},array[${quote(source)}]);`,'commit;')
 await query(sql.join('\n'),false)
 console.log('Applied only the new atomic bulk-purchase migration; old single-purchase RPCs preserved.')
}
if(mode==='deploy'||mode==='verify'){
 const functions=await query(functionSql),local=JSON.parse(readFileSync('docs/db/local-schema.json','utf8')).structure
 for(const f of functions)if(!local.functions.some(l=>l.schema===f.schema&&l.name===f.name&&norm(l.definition)===norm(f.definition)))throw Error('Final function mismatch '+f.name)
 const permissions=(await query("select has_function_privilege('anon','public.buy_fishing_bait_bulk(text,integer,uuid,integer)','execute') as anon,has_function_privilege('authenticated','public.buy_fishing_bait_bulk(text,integer,uuid,integer)','execute') as player,has_table_privilege('authenticated','app_private.bait_purchase_operations','SELECT') as read,has_table_privilege('authenticated','app_private.bait_purchase_operations','INSERT') as write,relrowsecurity as rls from pg_class where oid='app_private.bait_purchase_operations'::regclass"))[0]
 if(permissions.anon||!permissions.player||permissions.read||permissions.write||!permissions.rls)throw Error('Permission mismatch')
 const result=await query('begin;\n'+readFileSync('tests/fixtures/bulk-bait-purchase-smoke.sql','utf8')+'\nrollback;\nselect true as rolled_back;',false)
 if(!result.some(r=>r.rolled_back))throw Error('Remote smoke did not roll back')
 const advisors=await api('/advisors/security');writeFileSync(dir+'/advisors-after.json',JSON.stringify(advisors,null,2))
 const warnings=x=>(x.lints??[]).filter(l=>['WARN','ERROR'].includes(l.level)).map(l=>l.cache_key??l.name).sort()
 if(JSON.stringify(warnings(advisors))!==JSON.stringify(warnings(JSON.parse(readFileSync(dir+'/advisors-before.json','utf8')))))throw Error('Security warnings changed')
 const migrations=await query(`select version,name from supabase_migrations.schema_migrations where version=${quote(file.slice(0,14))}`)
 if(migrations.length!==1)throw Error('Missing new migration history')
 writeFileSync(dir+'/verification.json',JSON.stringify({project,projectName:identity.name,verifiedAt:new Date().toISOString(),scope:'New bulk purchase RPC, existing purchase dependencies, private receipt permissions, one migration record and authenticated rollback tests. No full remote-schema parity or frontend deployment.',permissions,migrations,functionCount:functions.length,authenticatedRollbackSmoke:true,securityWarningsUnchanged:true},null,2)+'\n')
 console.log('Verified bulk RPC, old dependencies, receipt security, one migration and authenticated total/discount/retry/failure rollback tests; security warnings unchanged.')
}
if(!['deploy','verify'].includes(mode))throw Error('Usage: bulk-bait-remote.mjs deploy|verify')
