import {loadEnvFile} from 'node:process'
import {readFileSync,writeFileSync,mkdirSync} from 'node:fs'
import {createHash} from 'node:crypto'
loadEnvFile('.env.storage.local')
const project='ewafafphiovbpjwogwzn',url=`https://${project}.supabase.co`
if(process.env.SUPABASE_URL!==url||!process.env.SUPABASE_ACCESS_TOKEN)throw Error('Project or management credentials unavailable')
const root='assets/storage-upload/new/20261025-235100'
const manifest=JSON.parse(readFileSync(root+'/manifest.json','utf8'))
const ids=manifest.entries.map(e=>e.id)
const files=['20261025144807_voyage_duration_relic_effect.sql','20261025144831_add_ancient_navigation_relics.sql']
const reportRoot='supabase/inspection/remote/navigation-relics'
mkdirSync(reportRoot,{recursive:true})
const quote=s=>"'"+s.replaceAll("'","''")+"'"
const normalize=s=>s.replaceAll('\r\n','\n')
const hash=s=>createHash('sha256').update(s).digest('hex')
const canonical=v=>JSON.stringify(v,(_,x)=>x&&typeof x==='object'&&!Array.isArray(x)?Object.fromEntries(Object.entries(x).sort(([a],[b])=>a.localeCompare(b))):x)
async function request(path,options={}){
 const r=await fetch('https://api.supabase.com/v1/projects/'+project+path,{...options,headers:{Authorization:'Bearer '+process.env.SUPABASE_ACCESS_TOKEN,'Content-Type':'application/json',...options.headers}})
 if(!r.ok)throw Error('Management HTTP '+r.status+': '+(await r.text()).slice(0,400))
 return r.json()
}
async function query(sql,readOnly=true){return request('/database/query',{method:'POST',body:JSON.stringify({query:sql,read_only:readOnly})})}
const functionQuery="select p.proname as name,pg_get_functiondef(p.oid) as definition from pg_proc p join pg_namespace n on n.oid=p.pronamespace where n.nspname='app_private' and p.proname in ('harbor_state','snapshot_harbor_catch_rule','harbor_action','equip_relic','relic_bonus') order by p.proname"
async function images(upload=false){
 const verified=[]
 for(const e of manifest.entries){
  const bytes=readFileSync(root+'/'+e.storage_path)
  if(hash(bytes)!==e.sha256)throw Error('Local image changed '+e.id)
  if(upload){
   const key=process.env.SUPABASE_SECRET_KEY||process.env.SUPABASE_SERVICE_ROLE_KEY
   if(!key)throw Error('Storage credential missing')
   const r=await fetch(`${url}/storage/v1/object/collectibles/${e.storage_path}`,{method:'POST',headers:{apikey:key,Authorization:'Bearer '+key,'Content-Type':'image/png','Cache-Control':'max-age=31536000','x-upsert':'false'},body:bytes})
   if(!r.ok&&r.status!==409){const message=await r.text();if(!message.includes('Duplicate'))throw Error('Image upload failed '+e.id+': '+r.status)}
  }
  const r=await fetch(`${url}/storage/v1/object/public/collectibles/${e.storage_path}`)
  if(!r.ok||hash(Buffer.from(await r.arrayBuffer()))!==e.sha256)throw Error('Public image mismatch '+e.id)
  verified.push({id:e.id,storagePath:e.storage_path,sha256:e.sha256})
 }
 return verified
}
const mode=process.argv[2]
const identity=await request('')
if(identity.id!==project||identity.name!=='pongdang-island')throw Error('Unexpected remote project identity')
if(mode==='upload'){console.log(await images(true));process.exit(0)}
if(mode==='deploy'){
 await images()
 const before=JSON.parse(readFileSync('artifacts/voyage-relic-preflight.json','utf8')).data[0].preflight
 const current=await query(functionQuery)
 if(current.some(f=>!before.functions.some(b=>b.name===f.name&&normalize(b.definition)===normalize(f.definition))))throw Error('Function drift since preflight')
 const existing=(await query('select to_jsonb(r) as relic from public.fishing_relics r order by id')).map(x=>x.relic)
 if(canonical(existing)!==canonical(before.relics))throw Error('Relic catalog drift since preflight')
 const history=await query(`select version from supabase_migrations.schema_migrations where version in (${files.map(f=>quote(f.slice(0,14))).join(',')})`)
 if(history.length)throw Error('New migration already recorded; run verify')
 const advisors=await request('/advisors/security')
 writeFileSync(reportRoot+'/advisors-before.json',JSON.stringify(advisors,null,2))
 const sql=['begin;',"set local lock_timeout='5s';","set local statement_timeout='30s';",'lock table public.harbor_voyages in share row exclusive mode;',
  'create temporary table navigation_preserved on commit drop as select id,vessel_snapshot,departed_at,returns_at from public.harbor_voyages where claimed_at is null;']
 for(const file of files){
  const source=normalize(readFileSync('supabase/migrations/'+file,'utf8'))
  sql.push(source.split('\n').filter(l=>!/^\s*(begin|commit);\s*$/i.test(l)).join('\n'))
  sql.push(`insert into supabase_migrations.schema_migrations(version,name,statements) values(${quote(file.slice(0,14))},${quote(file.slice(15,-4))},array[${quote(source)}]);`)
 }
 sql.push("do $$begin if exists(select 1 from navigation_preserved b left join public.harbor_voyages a on a.id=b.id where a.id is null or (a.vessel_snapshot,a.departed_at,a.returns_at) is distinct from (b.vessel_snapshot,b.departed_at,b.returns_at)) then raise exception 'EXISTING_VOYAGE_CHANGED';end if;end$$;",'commit;')
 await query(sql.join('\n'),false)
 console.log('Applied only the two new migrations atomically; prior voyage snapshots and return times preserved.')
}
if(mode==='deploy'||mode==='verify'){
 const catalog=JSON.parse(readFileSync('supabase/catalog/catalog.json','utf8')).fishing_relics.filter(r=>ids.includes(r.id)).sort((a,b)=>a.id.localeCompare(b.id))
 const rows=(await query(`select to_jsonb(r) as relic from public.fishing_relics r where id in (${ids.map(quote).join(',')}) order by id`)).map(x=>x.relic)
 if(canonical(rows)!==canonical(catalog))throw Error('New relic catalog mismatch')
 const functions=await query(functionQuery),local=JSON.parse(readFileSync('docs/db/local-schema.json','utf8')).structure
 for(const f of functions)if(!local.functions.some(l=>l.schema==='app_private'&&l.name===f.name&&normalize(l.definition)===normalize(f.definition)))throw Error('Final function mismatch '+f.name)
 const grants=(await query("select has_function_privilege('anon','public.harbor_action(text,uuid,text,uuid,integer,uuid,integer,text,text)','execute') as anon,has_function_privilege('authenticated','public.harbor_action(text,uuid,text,uuid,integer,uuid,integer,text,text)','execute') as authenticated,has_function_privilege('authenticated','app_private.snapshot_harbor_catch_rule()','execute') as trigger_direct"))[0]
 if(grants.anon||!grants.authenticated||grants.trigger_direct)throw Error('Unexpected execute grants')
 const migrations=await query(`select version,name from supabase_migrations.schema_migrations where version in (${files.map(f=>quote(f.slice(0,14))).join(',')}) order by version`)
 if(migrations.length!==2)throw Error('Missing new migration history')
 const smoke=await query('begin;\n'+readFileSync('tests/fixtures/harbor-duration-relic-smoke.sql','utf8')+'\nrollback;\nselect true as rolled_back;',false)
 if(!smoke.some(x=>x.rolled_back))throw Error('Remote rollback smoke failed')
 const advisors=await request('/advisors/security')
 writeFileSync(reportRoot+'/advisors-after.json',JSON.stringify(advisors,null,2))
 const warnings=x=>(x.lints??[]).filter(l=>l.level==='WARN'||l.level==='ERROR').map(l=>l.cache_key??l.name).sort()
 const previous=JSON.parse(readFileSync(reportRoot+'/advisors-before.json','utf8'))
 if(canonical(warnings(previous))!==canonical(warnings(advisors)))throw Error('Security advisor warnings changed')
 const imagesVerified=await images()
 writeFileSync(reportRoot+'/verification.json',JSON.stringify({project,projectName:identity.name,verifiedAt:new Date().toISOString(),scope:'Three new relic rows, five relevant functions, RPC grants, two migration records, three public PNG hashes and rolled-back authenticated departure tests. Historical migration numbering differs; no history repair, full-schema parity check or frontend deployment performed.',migrations,grants,images:imagesVerified,rollbackSmoke:true},null,2)+'\n')
 console.log('Verified three relics, five functions, grants, two migration records, all image hashes and authenticated rollback tests; advisor warnings unchanged.')
}
if(!['upload','deploy','verify'].includes(mode))throw Error('Usage: navigation-relics-remote.mjs upload|deploy|verify')
