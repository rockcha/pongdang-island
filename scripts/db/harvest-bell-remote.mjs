import {loadEnvFile} from 'node:process'
import {readFileSync,writeFileSync,mkdirSync,existsSync} from 'node:fs'
import {createHash} from 'node:crypto'
loadEnvFile('.env.storage.local')
const project='ewafafphiovbpjwogwzn',dir='supabase/inspection/remote/harvest-bell',batch='assets/storage-upload/new/20261026-103604'
const files=['20261026013805_sleepless_harvest_bell_auto_claim.sql','20261026014036_sleepless_harvest_bell_catalog.sql','20261026015533_harvest_bell_nonblocking_expiry_guard.sql']
const priorHashes={bait_production_state:'6265e5dd2e160922289dbcc9e7edc2a8c5dbd7d489f48d51b1b32d0a0ccc95b2',production_state:'abe8fda1a964e1756a58cfa93cc4bf72e9d10cb1f8c72f04cc6d6045357e9d3d'}
const quote=s=>"'"+s.replaceAll("'","''")+"'",norm=s=>s.replaceAll('\r\n','\n'),hash=b=>createHash('sha256').update(b).digest('hex')
if(new URL(process.env.SUPABASE_URL).hostname!==project+'.supabase.co')throw Error('Project mismatch')
async function api(path,options={}){const r=await fetch('https://api.supabase.com/v1/projects/'+project+path,{...options,headers:{Authorization:'Bearer '+process.env.SUPABASE_ACCESS_TOKEN,'Content-Type':'application/json'}});if(!r.ok)throw Error('Management API '+r.status+': '+(await r.text()).slice(0,250));return r.json()}
const query=(sql,readOnly=true)=>api('/database/query',{method:'POST',body:JSON.stringify({query:sql,read_only:readOnly})})
const identity=await api('');if(identity.id!==project||identity.name!=='pongdang-island')throw Error('Project identity mismatch')
const expected=JSON.parse(readFileSync('docs/db/local-schema.json','utf8')).structure
const manifest=JSON.parse(readFileSync(batch+'/manifest.json','utf8'))
const image=await fetch(process.env.SUPABASE_URL+'/storage/v1/object/public/collectibles/'+manifest.storage_path),bytes=readFileSync(batch+'/'+manifest.storage_path)
if(!image.ok||hash(Buffer.from(await image.arrayBuffer()))!==hash(bytes))throw Error('Public image byte mismatch')
manifest.sha256=hash(bytes);writeFileSync(batch+'/manifest.json',JSON.stringify(manifest,null,2)+'\n')
const before=existsSync(dir+'/advisors-before.json')?JSON.parse(readFileSync(dir+'/advisors-before.json','utf8')):await api('/advisors/security'),warningKeys=r=>r.lints.filter(l=>['WARN','ERROR'].includes(l.level)).map(l=>l.name).sort()
mkdirSync(dir,{recursive:true});writeFileSync(dir+'/advisors-before.json',JSON.stringify(before,null,2)+'\n')
const list=['auto_claim_production','auto_claim_due_production','settle_production_auto_claim_loadout','production_state','bait_production_state']
const functionSql=names=>`select n.nspname schema,p.proname name,pg_get_functiondef(p.oid) definition,p.prosecdef definer,p.proconfig config,has_function_privilege('anon',p.oid,'EXECUTE') anon,has_function_privilege('authenticated',p.oid,'EXECUTE') player from pg_proc p join pg_namespace n on n.oid=p.pronamespace where n.nspname='app_private' and p.proname in (${names.map(quote).join(',')}) order by p.proname`
for(const [index,file] of files.entries()){
 const source=norm(readFileSync('supabase/migrations/'+file,'utf8')),version=file.slice(0,14),recorded=await query(`select statements from supabase_migrations.schema_migrations where version=${quote(version)}`)
 if(recorded.length){if(norm(recorded[0].statements[0])!==source)throw Error('Recorded migration source differs: '+file);continue}
 if(index===0){
  if((await query("select to_regclass('app_private.production_auto_claims') existing"))[0].existing)throw Error('Unrecorded automatic claim schema already exists')
  const dependencies=await query(functionSql([...Object.keys(priorHashes),'equip_relic','notify_due_production_sites','notify_due_bait_production_sites','relic_bonus']))
  if(dependencies.length!==6)throw Error('Dependency scope mismatch')
  for(const f of dependencies){const expectedHash=priorHashes[f.name]??hash(norm(expected.functions.find(l=>l.schema===f.schema&&l.name===f.name).definition));if(hash(norm(f.definition))!==expectedHash)throw Error('Remote dependency drift: '+f.name)}
  const metadata=await query("select table_schema,table_name,column_name,data_type from information_schema.columns where (table_schema='app_private' and table_name in('production_sites','bait_production_sites','player_relic_loadouts')) or(table_schema='public' and table_name='notifications') order by table_schema,table_name,ordinal_position")
  const constraints=await query("select conname,pg_get_constraintdef(oid) definition from pg_constraint where conrelid='public.fishing_relics'::regclass")
  writeFileSync(dir+'/preflight.json',JSON.stringify({project,capturedAt:new Date().toISOString(),scope:'Six function dependencies, relevant columns, relic constraints and existing catalog; no player rows',dependencies,metadata,constraints},null,2)+'\n')
 }else if(index===1){
  if((await query("select id from public.fishing_relics where id='sleepless-harvest-bell'")).length)throw Error('Unrecorded relic already exists')
 }else{
  const prior=(await query("select md5(pg_get_functiondef('app_private.auto_claim_production(uuid)'::regprocedure)) hash"))[0]
  if(prior.hash!=='5490ba9e3eb6dbf841d314c485725f48')throw Error('Automatic claim helper drift before expiry guard')
 }
 const body=source.split('\n').filter(l=>!/^\s*(begin|commit);\s*$/i.test(l)).join('\n')
 await query(`begin;set local lock_timeout='3s';set local statement_timeout='30s';${body}
 insert into supabase_migrations.schema_migrations(version,name,statements) values(${quote(version)},${quote(file.slice(15,-4))},array[${quote(source)}]);commit;`,false)
}
const functions=await query(functionSql(list))
if(functions.length!==5)throw Error('Missing automatic collection functions')
for(const f of functions){const local=expected.functions.find(l=>l.schema===f.schema&&l.name===f.name),existingPlayerAPI=['production_state','bait_production_state'].includes(f.name);if(!local||norm(local.definition)!==norm(f.definition)||f.anon||f.player!==existingPlayerAPI||!f.definer)throw Error('Function definition/access mismatch: '+f.name)}
const rows=await query("select * from public.fishing_relics where id='sleepless-harvest-bell'")
const catalog=JSON.parse(readFileSync('supabase/catalog/catalog.json','utf8')).fishing_relics.find(r=>r.id==='sleepless-harvest-bell')
if(rows.length!==1)throw Error('Missing relic')
for(const [key,value] of Object.entries(catalog))if(key==='effect_value'?Number(value)!==Number(rows[0][key]):value!==rows[0][key])throw Error('Relic catalog mismatch: '+key)
const security=(await query("select c.relrowsecurity rls,has_table_privilege('authenticated',c.oid,'SELECT,INSERT,UPDATE,DELETE') player,has_table_privilege('anon',c.oid,'SELECT,INSERT,UPDATE,DELETE') anon,has_column_privilege('authenticated','public.notifications','production_auto_claim','UPDATE') forge_notification from pg_class c where c.oid='app_private.production_auto_claims'::regclass"))[0]
if(!security.rls||security.player||security.anon||security.forge_notification)throw Error('Automatic claim permissions mismatch')
const job=await query("select jobid,jobname,schedule,command,active from cron.job where jobname='production-auto-claim'")
if(job.length!==1||!job[0].active||job[0].schedule!=='* * * * *'||job[0].command!=='select app_private.auto_claim_due_production();')throw Error('Offline auto claim cron is missing')
// This fixture invokes only its synthetic owner, never the global worker.
await query('begin;set local statement_timeout=\'30s\';\n'+readFileSync('tests/fixtures/harvest-bell-smoke.sql','utf8')+'\nrollback;select true rolled_back;',false)
const after=await api('/advisors/security')
if(JSON.stringify(warningKeys(before))!==JSON.stringify(warningKeys(after)))throw Error('New security warning/error after deployment')
const capturedAt=new Date().toISOString()
writeFileSync(dir+'/verification.json',JSON.stringify({project,capturedAt,scope:['three CLI migrations','five function definitions/permissions','new relic catalog','private receipt RLS','server-only notification marker','minute cron schedule','synthetic owner-only settlement/equip/expiry/retry/account isolation rolled back','public image byte hash'],fullSchemaParity:false,independentSessionConcurrencyTest:false,frontendDeployed:false,migrations:files.map(file=>({file,sha256:hash(norm(readFileSync('supabase/migrations/'+file,'utf8')))})),functions,security,job,catalog:rows[0],imageHash:manifest.sha256,syntheticRollback:true,securityWarningsUnchanged:true},null,2)+'\n')
console.log(JSON.stringify({status:'PASS',project,capturedAt,relic:rows[0].name,cron:job[0].jobname,syntheticRollback:true,imageHash:manifest.sha256,frontendDeployed:false}))
