import fs from 'node:fs'
import {loadEnvFile} from 'node:process'
loadEnvFile('.env.storage.local')
const project='ewafafphiovbpjwogwzn',version='20261029130449',name='extend_halloween_through_november_8'
if(process.env.SUPABASE_URL!==`https://${project}.supabase.co`)throw Error('Wrong project')
const sql=fs.readFileSync(`supabase/migrations/${version}_${name}.sql`,'utf8').replaceAll('\r\n','\n')
const quote=s=>"'"+s.replaceAll("'","''")+"'"
async function query(query,read_only=true){
 const r=await fetch(`https://api.supabase.com/v1/projects/${project}/database/query`,{method:'POST',headers:{Authorization:`Bearer ${process.env.SUPABASE_ACCESS_TOKEN}`,'Content-Type':'application/json'},body:JSON.stringify({query,read_only})})
 if(!r.ok)throw Error('Management HTTP '+r.status)
 return r.json()
}
const checkSql="select id,species_prefix,starts_at,ends_at from app_private.collectible_event_windows where id='halloween_2026'"
const [before]=await query(checkSql)
if(!before||before.species_prefix!=='halloween-'||Date.parse(before.starts_at)!==Date.parse('2026-10-24T00:00:00+09:00')||Date.parse(before.ends_at)!==Date.parse('2026-11-01T00:00:00+09:00'))throw Error('Event window drift')
if(process.argv[2]!=='apply'){console.log({project,migration:version,before});process.exit(0)}
await query(`begin;set local statement_timeout='30s';\n${sql}\ninsert into supabase_migrations.schema_migrations(version,name,statements) values('${version}','${name}',array[${quote(sql)}]::text[]);commit;`,false)
const [after]=await query(checkSql)
if(Date.parse(after.ends_at)!==Date.parse('2026-11-09T00:00:00+09:00')||after.starts_at!==before.starts_at||after.species_prefix!==before.species_prefix)throw Error('Event verification failed')
console.log({project,migration:version,verified:true,after})
