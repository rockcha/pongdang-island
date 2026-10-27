import fs from 'node:fs'
import {loadEnvFile} from 'node:process'
loadEnvFile('.env.storage.local')
const project='ewafafphiovbpjwogwzn',{root}=JSON.parse(fs.readFileSync('artifacts/pirate-rod-root.json','utf8'))
if(process.env.SUPABASE_URL!==`https://${project}.supabase.co`)throw Error('Wrong project')
const file='supabase/migrations/20261027013420_plunder_rod_and_theme_rod_prices.sql',base=file.split('/').at(-1),version=base.split('_')[0],name=base.slice(15,-4),sql=fs.readFileSync(file,'utf8').replaceAll('\r\n','\n')
const expected=JSON.parse(fs.readFileSync('supabase/catalog/catalog.json','utf8')).fishing_rods.filter(r=>['plunder','nyamnyam'].includes(r.id)),q=s=>"'"+String(s).replaceAll("'","''")+"'"
async function request(suffix,body){const r=await fetch(`https://api.supabase.com/v1/projects/${project}${suffix}`,{method:body?'POST':'GET',headers:{Authorization:`Bearer ${process.env.SUPABASE_ACCESS_TOKEN}`,'Content-Type':'application/json'},...(body?{body:JSON.stringify(body)}:{})});if(!r.ok)throw Error('Management HTTP '+r.status);return r.json()}
const query=(query,readOnly=true)=>request('/database/query',{query,read_only:readOnly})
const identity=await request('');if(identity.id!==project&&identity.ref!==project)throw Error('Project mismatch')
const capture=`select clock_timestamp() captured_at,(select jsonb_agg(to_jsonb(r) order by id) from public.fishing_rods r where id in ('plunder','nyamnyam')) rods,(select name from supabase_migrations.schema_migrations where version=${q(version)}) migration;`
const [before]=await query(capture),preflight=JSON.parse(fs.readFileSync('artifacts/pirate-rod-preflight.json','utf8'))
if(preflight.project!==project)throw Error('Missing project-verified preflight')
const previous=preflight.rods.filter(r=>['plunder','nyamnyam'].includes(r.id)).sort((a,b)=>a.id.localeCompare(b.id))
if(!before.migration&&JSON.stringify(before.rods)!==JSON.stringify(previous))throw Error('Relevant rod catalog changed since preflight')
console.log(JSON.stringify({project,mode:process.argv[2]??'check',targets:before.rods,alreadyApplied:!!before.migration}))
if(process.argv[2]!=='apply')process.exit(0)
const storage=JSON.parse(fs.readFileSync(root+'/storage-verification.json','utf8'))
if(storage.project!==project||storage.count!==4)throw Error('Four public rod images must be verified first')
if(!before.migration){
 const guard=`do $guard$ begin if (select jsonb_agg(to_jsonb(r) order by id) from public.fishing_rods r where id in ('plunder','nyamnyam')) is distinct from ${q(JSON.stringify(before.rods))}::jsonb then raise exception 'ROD_CATALOG_CHANGED';end if;end $guard$;`
 const transaction=sql.replace('begin;',`begin;\nset local statement_timeout='25s';\nlock table public.fishing_rods in share row exclusive mode;\n${guard}`).replace(/commit;\s*$/,'')
 await query(transaction+`\ninsert into supabase_migrations.schema_migrations(version,name,statements) values(${q(version)},${q(name)},array[${q(sql)}]::text[]);\ncommit;`,false)
}
const [after]=await query(capture)
if(after.migration!==name||after.rods.length!==2)throw Error('Post-apply scope mismatch')
for(const row of after.rods){const e=expected.find(r=>r.id===row.id);for(const key of Object.keys(e))if(String(row[key])!==String(e[key]))throw Error('Post-apply mismatch '+row.id+'.'+key)}
fs.writeFileSync('artifacts/pirate-rod-deployment.json',JSON.stringify({project,migration:version,verifiedAt:after.captured_at,scope:'Two rod catalog rows only: add pirate rod and change existing food-sea rod price. No ownership, loadout, wallet or other player data writes. Existing migration history drift remains unmodified; full remote/local structure equivalence is unverified.',rows:after.rods},null,2)+'\n')
console.log('Verified pirate and nyamnyam rods at 1500 each')
