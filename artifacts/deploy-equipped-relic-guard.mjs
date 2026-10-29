import fs from 'node:fs'
import {loadEnvFile} from 'node:process'
import {createHash} from 'node:crypto'
loadEnvFile('.env.storage.local')
const project='ewafafphiovbpjwogwzn',version='20261029100435',name='block_equipped_relic_crafting'
if(process.env.SUPABASE_URL!==`https://${project}.supabase.co`)throw Error('Wrong project')
const sql=fs.readFileSync(`supabase/migrations/${version}_${name}.sql`,'utf8').replaceAll('\r\n','\n')
const quote=s=>"'"+s.replaceAll("'","''")+"'"
async function query(query,read_only=true){
 const r=await fetch(`https://api.supabase.com/v1/projects/${project}/database/query`,{method:'POST',headers:{Authorization:`Bearer ${process.env.SUPABASE_ACCESS_TOKEN}`,'Content-Type':'application/json'},body:JSON.stringify({query,read_only})})
 if(!r.ok)throw Error('Management HTTP '+r.status)
 return r.json()
}
const stateSql=`select md5(replace(pg_get_functiondef('app_private.craft_relic(text,text,uuid)'::regprocedure),E'\\r\\n',E'\\n')) hash,exists(select 1 from supabase_migrations.schema_migrations where version='${version}') applied;`
const [before]=await query(stateSql)
if(before.applied){console.log(JSON.stringify({project,alreadyApplied:true}));process.exit(0)}
if(before.hash!=='96868bb7ef17ef169d0426215bd076cb')throw Error('Craft function drift; inspect first')
console.log(JSON.stringify({project,mode:process.argv[2]??'check',matchingFunction:true,migration:version}))
if(process.argv[2]!=='apply')process.exit(0)
await query(`begin;set local statement_timeout='20s';do $$begin if (select md5(replace(pg_get_functiondef('app_private.craft_relic(text,text,uuid)'::regprocedure),E'\\r\\n',E'\\n'))) is distinct from '96868bb7ef17ef169d0426215bd076cb' then raise exception 'CRAFT_FUNCTION_DRIFT';end if;end$$;\n${sql}\ninsert into supabase_migrations.schema_migrations(version,name,statements) values('${version}','${name}',array[${quote(sql)}]::text[]);commit;`,false)
const [after]=await query(stateSql)
const s=JSON.parse(fs.readFileSync('docs/db/local-schema.json','utf8'))
const f=s.structure.functions.find(f=>f.schema==='app_private'&&f.name==='craft_relic')
const expected=createHash('md5').update(f.definition.replaceAll('\r\n','\n')).digest('hex')
if(!after.applied||after.hash!==expected)throw Error('Post-apply hash mismatch')
fs.writeFileSync('artifacts/equipped-relic-guard-deployment.json',JSON.stringify({project,migration:version,capturedAt:new Date().toISOString(),...after,scope:'Only the craft RPC was changed; full remote structure and history equivalence remain unverified.'},null,2)+'\n')
console.log(JSON.stringify({verified:after}))
