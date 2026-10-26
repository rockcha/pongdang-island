import {readFileSync,writeFileSync,mkdirSync} from 'node:fs'
import {execFileSync} from 'node:child_process'
import {createHash} from 'node:crypto'
import {loadEnvFile} from 'node:process'
loadEnvFile('.env.storage.local')
const project='ewafafphiovbpjwogwzn',file='20261025170335_exchange_comments_oldest_first.sql',dir='supabase/inspection/remote/exchange-comments-order'
if(new URL(process.env.SUPABASE_URL).hostname!==project+'.supabase.co')throw Error('Project mismatch')
const norm=s=>s.replaceAll('\r\n','\n'),quote=s=>"'"+s.replaceAll("'","''")+"'"
async function api(path,options={}){const r=await fetch('https://api.supabase.com/v1/projects/'+project+path,{...options,headers:{Authorization:'Bearer '+process.env.SUPABASE_ACCESS_TOKEN,'Content-Type':'application/json'}});if(!r.ok)throw Error('HTTP '+r.status+': '+(await r.text()).slice(0,250));return r.json()}
const query=(sql,readOnly=true)=>api('/database/query',{method:'POST',body:JSON.stringify({query:sql,read_only:readOnly})})
const identity=await api('');if(identity.id!==project||identity.name!=='pongdang-island')throw Error('Identity mismatch')
const funcSql="select n.nspname as schema,p.proname as name,pg_get_functiondef(p.oid) as definition,p.proacl::text as acl from pg_proc p join pg_namespace n on n.oid=p.pronamespace where n.nspname in ('public','app_private') and p.proname='exchange_listing_detail'"
const current=await query(funcSql),source=norm(readFileSync('supabase/migrations/'+file,'utf8'))
const old=JSON.parse(execFileSync('git',['-c','safe.directory=C:/Users/user/Desktop/pongdang-island','show','HEAD:docs/db/local-schema.json'],{encoding:'utf8',maxBuffer:10000000})).structure
for(const f of current)if(!old.functions.some(l=>l.schema===f.schema&&l.name===f.name&&norm(l.definition)===norm(f.definition)))throw Error('Function drift; inspect before deploying')
if(current.length!==2)throw Error('Missing wrapper/implementation')
mkdirSync(dir,{recursive:true});writeFileSync(dir+'/before.json',JSON.stringify({project,capturedAt:new Date().toISOString(),functions:current},null,2))
const beforeAdvisors=await api('/advisors/security')
const implementation=current.find(f=>f.schema==='app_private'),hash=createHash('md5').update(norm(implementation.definition)).digest('hex')
await query(`begin;set local lock_timeout='3s';set local statement_timeout='30s';
do $$begin if md5(replace(pg_get_functiondef('app_private.exchange_listing_detail(uuid,integer)'::regprocedure),chr(13)||chr(10),chr(10)))<>${quote(hash)} then raise exception 'EXCHANGE_DETAIL_DRIFT';end if;end$$;
${source}
insert into supabase_migrations.schema_migrations(version,name,statements) values(${quote(file.slice(0,14))},${quote(file.slice(15,-4))},array[${quote(source)}]);commit;`,false)
const after=await query(funcSql),local=JSON.parse(readFileSync('docs/db/local-schema.json','utf8')).structure
for(const f of after)if(!local.functions.some(l=>l.schema===f.schema&&l.name===f.name&&norm(l.definition)===norm(f.definition))||f.acl!==current.find(c=>c.schema===f.schema).acl)throw Error('Final definition/permission mismatch')
await query('begin;\n'+readFileSync('tests/fixtures/exchange-comments-order-smoke.sql','utf8')+'\nrollback;select true as rolled_back;',false)
const warnings=data=>(data.lints??[]).filter(x=>['WARN','ERROR'].includes(x.level)).map(x=>x.cache_key??x.name).sort()
const afterAdvisors=await api('/advisors/security');if(JSON.stringify(warnings(beforeAdvisors))!==JSON.stringify(warnings(afterAdvisors)))throw Error('Security warnings changed')
writeFileSync(dir+'/verification.json',JSON.stringify({project,verifiedAt:new Date().toISOString(),migration:file,scope:'Exchange detail wrapper/implementation and unchanged ACL; 35 synthetic comments across two pages, timestamp ties and anonymous denial checked in a rollback transaction. Existing history differences preserved; no full schema parity check.',securityWarningsUnchanged:true},null,2))
console.log('Applied one migration; verified oldest-first pagination/ties with 35 rolled-back test comments and unchanged permissions/security warnings.')
