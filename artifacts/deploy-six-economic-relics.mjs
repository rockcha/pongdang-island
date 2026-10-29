import fs from 'node:fs'
import {loadEnvFile} from 'node:process'
import {createHash} from 'node:crypto'
loadEnvFile('.env.storage.local')
const project='ewafafphiovbpjwogwzn'
if(process.env.SUPABASE_URL!==`https://${project}.supabase.co`)throw Error('Wrong project')
const migrations=[['20261029150506','bait_refund_and_savings_relic_effects'],['20261029151020','six_economic_relic_catalog']].map(([version,name])=>({version,name,sql:fs.readFileSync(`supabase/migrations/${version}_${name}.sql`,'utf8').replaceAll('\r\n','\n')}))
const expected={prepare_discovery_cast:'e1e696e2e30bcf62a857c0a3b355237f',finish_fishing:'41f7c8d8c90e5c2a44803721ffa1a058',savings_action:'31c1f49a72bb0d40b9bbe2c309634c97',savings_payload:'99f0555629d7194d5af9e8c0d6d30107',savings_state:'17902c2f828c8f4eb919240cf58bc33a'}
const quote=s=>"'"+s.replaceAll("'","''")+"'",md5=s=>createHash('md5').update(s.replaceAll('\r\n','\n')).digest('hex')
const names=Object.keys(expected).map(quote).join(',')
const functionSql=`select p.proname name,md5(replace(pg_get_functiondef(p.oid),E'\\r\\n',E'\\n')) hash from pg_proc p join pg_namespace n on n.oid=p.pronamespace where n.nspname='app_private' and p.proname in (${names})`
const relicSql='select to_jsonb(r) item from public.fishing_relics r order by id'
const shapeSql="select md5(pg_get_constraintdef(oid)) hash from pg_constraint where conrelid='public.fishing_relics'::regclass and conname='relic_effect_shape'"
async function query(query,read_only=true){
 const r=await fetch(`https://api.supabase.com/v1/projects/${project}/database/query`,{method:'POST',headers:{Authorization:`Bearer ${process.env.SUPABASE_ACCESS_TOKEN}`,'Content-Type':'application/json'},body:JSON.stringify({query,read_only})})
 if(!r.ok)throw Error('Management HTTP '+r.status)
 return r.json()
}
const snapshot=JSON.parse(fs.readFileSync('docs/db/local-schema.json','utf8')).structure
const manifest=JSON.parse(fs.readFileSync('assets/storage-upload/new/20261030-000506/manifest.json','utf8'))
const ids=manifest.items.map(a=>a.id),catalog=JSON.parse(fs.readFileSync('supabase/catalog/catalog.json','utf8')).fishing_relics.filter(r=>ids.includes(r.id))
if(catalog.length!==6)throw Error('Incomplete catalog')
const beforeFunctions=await query(functionSql)
if(beforeFunctions.length!==5||beforeFunctions.some(f=>expected[f.name]!==f.hash))throw Error('Function drift')
const [shape]=await query(shapeSql)
if(shape.hash!=='ee7c4739087adb9e31a53f9169d387fb')throw Error('Effect constraint drift')
const [columns]=await query("select exists(select 1 from information_schema.columns where table_schema='public' and table_name='shell_savings' and column_name='relic_bonus_percent') present")
if(columns.present)throw Error('Snapshot column already exists')
const before=(await query(relicSql)).map(r=>r.item)
if(before.some(r=>ids.includes(r.id)))throw Error('New relic already exists')
const history=await query(`select version from supabase_migrations.schema_migrations where version in (${migrations.map(m=>quote(m.version)).join(',')})`)
if(history.length)throw Error('Migration already applied')
for(const a of manifest.items){
 const bytes=fs.readFileSync('assets/storage-upload/new/20261030-000506/'+a.storage_path),hash=createHash('sha256').update(bytes).digest('hex')
 const response=await fetch(catalog.find(r=>r.id===a.id).thumbnail_path)
 if(!response.ok||createHash('sha256').update(Buffer.from(await response.arrayBuffer())).digest('hex')!==hash)throw Error('Public artwork mismatch')
}
if(process.argv[2]!=='apply'){console.log(JSON.stringify({project,preflight:true,newRelics:6,migrations:migrations.map(m=>m.version)}));process.exit(0)}
const guards=Object.entries(expected).map(([n,h])=>`if (select hash from (${functionSql}) f where name=${quote(n)}) is distinct from ${quote(h)} then raise exception 'FUNCTION_DRIFT';end if;`).join('\n')
const body=migrations.map(m=>m.sql.replace(/^begin;\s*$/mg,'').replace(/^commit;\s*$/mg,'')+`\ninsert into supabase_migrations.schema_migrations(version,name,statements) values(${quote(m.version)},${quote(m.name)},array[${quote(m.sql)}]::text[]);`).join('\n')
await query(`begin;set local statement_timeout='30s';do $$begin ${guards} if (select hash from (${shapeSql}) s) is distinct from 'ee7c4739087adb9e31a53f9169d387fb' then raise exception 'SHAPE_DRIFT';end if;end$$;\n${body}\ncommit;`,false)
const afterFunctions=await query(functionSql)
if(afterFunctions.some(f=>md5(snapshot.functions.find(x=>x.schema==='app_private'&&x.name===f.name).definition)!==f.hash))throw Error('Post-deploy function mismatch')
const after=(await query(relicSql)).map(r=>r.item)
for(const r of catalog){const row=after.find(x=>x.id===r.id);if(!row||Object.entries(r).some(([k,v])=>row[k]!==v))throw Error('Catalog mismatch')}
if(after.length!==before.length+6||before.some(r=>JSON.stringify(r)!==JSON.stringify(after.find(x=>x.id===r.id))))throw Error('Unrelated relic changed')
const [security]=await query("select has_function_privilege('anon','public.savings_action(text,uuid,uuid,integer,integer)','execute') anon_savings,has_function_privilege('anon','public.finish_fishing(uuid,boolean)','execute') anon_finish,has_function_privilege('authenticated','public.savings_action(text,uuid,uuid,integer,integer)','execute') can_save,has_function_privilege('authenticated','public.finish_fishing(uuid,boolean)','execute') can_finish,exists(select 1 from public.shell_savings where relic_bonus_percent<>0) preexisting_boosted")
if(security.anon_savings||security.anon_finish||!security.can_save||!security.can_finish||security.preexisting_boosted)throw Error('Post-deploy compatibility mismatch')
const afterHistory=await query(`select version from supabase_migrations.schema_migrations where version in (${migrations.map(m=>quote(m.version)).join(',')})`)
if(afterHistory.length!==2)throw Error('Missing migration history')
const capturedAt=new Date().toISOString()
console.log(JSON.stringify({project,verified:true,capturedAt,newRelics:catalog.map(({id,effect_kind,effect_value,sell_price})=>({id,effect_kind,effect_value,sell_price})),functions:afterFunctions,security}))
const releasesFile='src/features/regions/species-releases.json',releases=JSON.parse(fs.readFileSync(releasesFile,'utf8'))
if(releases.some(r=>r.speciesIds.some(id=>ids.some(x=>id==='relic-'+x))))throw Error('Release already registered')
releases.push({releasedAt:capturedAt,speciesIds:ids.map(id=>'relic-'+id)})
fs.writeFileSync(releasesFile,JSON.stringify(releases,null,2)+'\n')
