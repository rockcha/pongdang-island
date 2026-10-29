import fs from 'node:fs'
import {loadEnvFile} from 'node:process'
import {createHash} from 'node:crypto'
loadEnvFile('.env.storage.local')
const project='ewafafphiovbpjwogwzn',version='20261029144537',name='crafted_relic_showcase'
if(process.env.SUPABASE_URL!==`https://${project}.supabase.co`)throw Error('Wrong project')
const sql=fs.readFileSync(`supabase/migrations/${version}_${name}.sql`,'utf8').replaceAll('\r\n','\n')
const expected={publish_fishing_showcase:'1af7316a2efad36800387becbf76e474',relic_showcase_catch:'df3abd437a0ba20895f6bc0e4c52d9ec'}
const quote=s=>"'"+s.replaceAll("'","''")+"'"
async function query(query,read_only=true){
 const r=await fetch(`https://api.supabase.com/v1/projects/${project}/database/query`,{method:'POST',headers:{Authorization:`Bearer ${process.env.SUPABASE_ACCESS_TOKEN}`,'Content-Type':'application/json'},body:JSON.stringify({query,read_only})})
 if(!r.ok)throw Error('Management HTTP '+r.status)
 return r.json()
}
const functionsSql="select p.proname name,md5(replace(pg_get_functiondef(p.oid),E'\\r\\n',E'\\n')) hash from pg_proc p join pg_namespace n on n.oid=p.pronamespace where n.nspname='app_private' and p.proname in ('publish_fishing_showcase','relic_showcase_catch','crafted_relic_showcase')"
const before=await query(functionsSql)
if(before.length!==2||before.some(f=>expected[f.name]!==f.hash))throw Error('Function drift')
const [constraint]=await query("select pg_get_constraintdef(oid) definition from pg_constraint where conrelid='public.fishing_showcase_posts'::regclass and conname='fishing_showcase_posts_rarity_check'")
if(constraint?.definition!=="CHECK ((rarity = ANY (ARRAY['epic'::game_rarity, 'mythic'::game_rarity])))")throw Error('Constraint drift')
const [history]=await query(`select exists(select 1 from supabase_migrations.schema_migrations where version='${version}') applied`)
if(history.applied)throw Error('Already applied')
if(process.argv[2]!=='apply'){console.log(JSON.stringify({project,migration:version,preflight:true}));process.exit(0)}
const guards=Object.entries(expected).map(([n,h])=>`if (select hash from (${functionsSql}) f where name=${quote(n)}) is distinct from ${quote(h)} then raise exception 'FUNCTION_DRIFT';end if;`).join('\n')
await query(`begin;set local statement_timeout='30s';do $$begin ${guards} end$$;\n${sql}\ninsert into supabase_migrations.schema_migrations(version,name,statements) values('${version}','${name}',array[${quote(sql)}]::text[]);commit;`,false)
const after=await query(functionsSql),snapshot=JSON.parse(fs.readFileSync('docs/db/local-schema.json','utf8')).structure
for(const f of after){const local=snapshot.functions.find(x=>x.schema==='app_private'&&x.name===f.name);if(!local||createHash('md5').update(local.definition.replaceAll('\r\n','\n')).digest('hex')!==f.hash)throw Error('Post-deploy definition mismatch')}
const [security]=await query(`select exists(select 1 from supabase_migrations.schema_migrations where version='${version}') applied,
 has_function_privilege('authenticated','public.relic_showcase_catch(text)','execute') can_preview,
 has_function_privilege('authenticated','public.publish_fishing_showcase(uuid,text)','execute') can_publish,
 has_function_privilege('anon','public.publish_fishing_showcase(uuid,text)','execute') anon_publish,
 has_function_privilege('authenticated','app_private.crafted_relic_showcase(text)','execute') direct_helper,
 (select pg_get_constraintdef(oid) from pg_constraint where conrelid='public.fishing_showcase_posts'::regclass and conname='fishing_showcase_posts_rarity_check') rarity_constraint`)
if(!security.applied||!security.can_preview||!security.can_publish||security.anon_publish||security.direct_helper||!security.rarity_constraint.includes('crafted'))throw Error('Post-deploy security mismatch')
console.log(JSON.stringify({project,migration:version,verified:true,capturedAt:new Date().toISOString(),functions:after,security}))
