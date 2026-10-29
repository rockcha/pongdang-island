import fs from 'node:fs'
import {loadEnvFile} from 'node:process'
import {createHash} from 'node:crypto'
loadEnvFile('.env.storage.local')
const project='ewafafphiovbpjwogwzn',version='20261029124728',name='quest_flea_and_pongi_whack_progress'
if(process.env.SUPABASE_URL!==`https://${project}.supabase.co`)throw Error('Wrong project')
const sql=fs.readFileSync(`supabase/migrations/${version}_${name}.sql`,'utf8').replaceAll('\r\n','\n')
const quote=s=>"'"+s.replaceAll("'","''")+"'"
async function query(query,read_only=true){
 const r=await fetch(`https://api.supabase.com/v1/projects/${project}/database/query`,{method:'POST',headers:{Authorization:`Bearer ${process.env.SUPABASE_ACCESS_TOKEN}`,'Content-Type':'application/json'},body:JSON.stringify({query,read_only})})
 if(!r.ok)throw Error('Management HTTP '+r.status)
 return r.json()
}
const stateSql="select md5(replace(pg_get_functiondef('app_private.base_quest_period(text,timestamp with time zone)'::regprocedure),E'\\r\\n',E'\\n')) hash"
const expected='99a0436cbe5c0882b06e9bb582bb7f38'
const [before]=await query(stateSql)
if(before.hash!==expected)throw Error('Quest function drift')
const [history]=await query(`select exists(select 1 from supabase_migrations.schema_migrations where version='${version}') applied`)
if(history.applied)throw Error('Migration already applied')
if(process.argv[2]!=='apply'){console.log(JSON.stringify({project,matchingFunction:true,migration:version}));process.exit(0)}
await query(`begin;set local statement_timeout='30s';do $$begin if (select hash from (${stateSql}) s) is distinct from '${expected}' then raise exception 'QUEST_DRIFT';end if;end$$;\n${sql}\ninsert into supabase_migrations.schema_migrations(version,name,statements) values('${version}','${name}',array[${quote(sql)}]::text[]);commit;`,false)
const [after]=await query(stateSql)
const s=JSON.parse(fs.readFileSync('docs/db/local-schema.json','utf8'))
const f=s.structure.functions.find(f=>f.schema==='app_private'&&f.name==='base_quest_period')
if(createHash('md5').update(f.definition.replaceAll('\r\n','\n')).digest('hex')!==after.hash)throw Error('Definition mismatch')
console.log(JSON.stringify({project,migration:version,verified:true,capturedAt:new Date().toISOString()}))
