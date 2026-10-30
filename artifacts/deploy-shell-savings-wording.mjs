import fs from 'node:fs'
import {loadEnvFile} from 'node:process'
loadEnvFile('.env.storage.local')
const project='ewafafphiovbpjwogwzn',version='20261029163141',name='rename_shell_savings_relic_descriptions'
if(process.env.SUPABASE_URL!==`https://${project}.supabase.co`)throw Error('Wrong project')
const quote=s=>"'"+s.replaceAll("'","''")+"'"
const rows=JSON.parse(fs.readFileSync('supabase/catalog/catalog.json','utf8')).fishing_relics.filter(r=>r.effect_kind==='savings_interest_bonus_percent')
async function query(query,read_only=true){
 const r=await fetch(`https://api.supabase.com/v1/projects/${project}/database/query`,{method:'POST',headers:{Authorization:`Bearer ${process.env.SUPABASE_ACCESS_TOKEN}`,'Content-Type':'application/json'},body:JSON.stringify({query,read_only})})
 if(!r.ok)throw Error('Management HTTP '+r.status)
 return r.json()
}
const read=`select to_jsonb(r) item from public.fishing_relics r where id in (${rows.map(r=>quote(r.id)).join(',')}) order by id`
const before=(await query(read)).map(r=>r.item)
if(rows.length!==3||before.length!==3||rows.some(row=>{const actual=before.find(r=>r.id===row.id);return Object.entries(row).some(([k,v])=>actual[k]!== (k==='description'?`만기 이자 +${row.effect_value}%`:v))}))throw Error('Catalog wording drift')
if(process.argv[2]!=='apply'){console.log(JSON.stringify({project,preflight:true,count:rows.length}));process.exit(0)}
const sql=fs.readFileSync(`supabase/migrations/${version}_${name}.sql`,'utf8').replaceAll('\r\n','\n')
const [history]=await query(`select exists(select 1 from supabase_migrations.schema_migrations where version='${version}') applied`)
if(history.applied)throw Error('Already applied')
const body=sql.replace(/^begin;\s*$/mg,'').replace(/^commit;\s*$/mg,'')
await query(`begin;set local statement_timeout='30s';${body}\ninsert into supabase_migrations.schema_migrations(version,name,statements) values('${version}','${name}',array[${quote(sql)}]::text[]);commit;`,false)
const after=(await query(read)).map(r=>r.item)
if(rows.some(row=>{const actual=after.find(r=>r.id===row.id);return Object.entries(row).some(([k,v])=>actual[k]!==v)}))throw Error('Post-deploy wording mismatch')
console.log(JSON.stringify({project,verified:true,descriptions:after.map(r=>({id:r.id,description:r.description}))}))
