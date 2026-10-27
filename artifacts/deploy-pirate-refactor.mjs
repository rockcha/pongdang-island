import {loadEnvFile} from 'node:process'
import fs from 'node:fs'
loadEnvFile('.env.storage.local')
const project='ewafafphiovbpjwogwzn',root='assets/storage-upload/new/20261027-090400'
if(process.env.SUPABASE_URL!==`https://${project}.supabase.co`)throw Error('Wrong project')
const meta=JSON.parse(fs.readFileSync('artifacts/pirate-refactor-migration.json','utf8'))
const basename=meta.file.split('/').at(-1),version=basename.split('_')[0],name=basename.slice(15,-4)
const sql=fs.readFileSync(meta.file,'utf8').replaceAll('\r\n','\n')
const m=JSON.parse(fs.readFileSync(root+'/manifest.json','utf8')),q=s=>"'"+String(s).replaceAll("'","''")+"'"
const ids=m.items.map(i=>q(i.id)).join(',')
async function request(suffix,body){const r=await fetch(`https://api.supabase.com/v1/projects/${project}${suffix}`,{method:body?'POST':'GET',headers:{Authorization:`Bearer ${process.env.SUPABASE_ACCESS_TOKEN}`,'Content-Type':'application/json'},...(body?{body:JSON.stringify(body)}:{})});if(!r.ok)throw Error('Management HTTP '+r.status);return r.json()}
const query=(query,readOnly=true)=>request('/database/query',{query,read_only:readOnly})
const identity=await request('');if(identity.id!==project&&identity.ref!==project)throw Error('Project mismatch')
const capture=`select clock_timestamp() captured_at,(select jsonb_agg(to_jsonb(s) order by id) from public.collectible_species s where id in (${ids})) species,(select count(*) from public.player_collectibles where species_id in (${ids})) owners,(select count(*) from public.collectible_habitats where species_id in (${ids}) and region_id='plunder') habitats,(select name from supabase_migrations.schema_migrations where version=${q(version)}) migration;`
const [before]=await query(capture)
if(before.species.length!==9||before.habitats!==9)throw Error('Unexpected target scope')
if(before.migration&&before.migration!==name)throw Error('Migration conflict')
for(const row of before.species){const item=m.items.find(i=>i.id===row.id),expected=before.migration?item:item.previous;for(const key of Object.keys(item.previous))if(String(row[key])!==String(expected[key]))throw Error('Relevant remote drift '+row.id+'.'+key)}
console.log(JSON.stringify({project,mode:process.argv[2]??'check',matchedRows:9,migrationRecorded:!!before.migration,ownedSpecimens:before.owners}))
if(process.argv[2]!=='apply')process.exit(0)
const storage=JSON.parse(fs.readFileSync(root+'/storage-verification.json','utf8'))
if(storage.project!==project||storage.count!==18)throw Error('Missing public image verification')
if(!before.migration){
 const guard=`do $guard$ begin if (select jsonb_agg(to_jsonb(s) order by id) from public.collectible_species s where id in (${ids})) is distinct from ${q(JSON.stringify(before.species))}::jsonb then raise exception 'PIRATE_CATALOG_CHANGED';end if;end $guard$;`
 const transaction=sql.replace('begin;',`begin;\nset local statement_timeout='25s';\nlock table public.collectible_species in share row exclusive mode;\n${guard}`).replace(/commit;\s*$/,'')
 await query(transaction+`\ninsert into supabase_migrations.schema_migrations(version,name,statements) values(${q(version)},${q(name)},array[${q(sql)}]::text[]);\ncommit;`,false)
}
const [after]=await query(capture)
if(after.species.length!==9||after.habitats!==9||after.owners<before.owners||after.migration!==name)throw Error('Post-apply scope/ownership verification failed')
for(const row of after.species){const expected=m.items.find(i=>i.id===row.id);for(const key of Object.keys(expected.previous))if(String(row[key])!==String(expected[key]))throw Error('Post-apply row mismatch '+row.id+'.'+key)}
fs.writeFileSync('artifacts/pirate-refactor-deployment.json',JSON.stringify({project,migration:version,verifiedAt:after.captured_at,scope:'Nine existing species and their native habitats only. Stable species IDs and prices preserved; no player writes. Existing full migration-history drift remains unmodified.',ownedBefore:before.owners,ownedAfter:after.owners,rows:after.species,habitats:after.habitats},null,2)+'\n')
console.log(JSON.stringify({project,verifiedSpecies:9,names:after.species.map(s=>s.name),ownedBefore:before.owners,ownedAfter:after.owners}))
