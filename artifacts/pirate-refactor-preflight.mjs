import {loadEnvFile} from 'node:process'
import fs from 'node:fs'
loadEnvFile('.env.storage.local')
const project='ewafafphiovbpjwogwzn',root='assets/storage-upload/new/20261027-090400'
if(process.env.SUPABASE_URL!==`https://${project}.supabase.co`)throw Error('Wrong project')
const items=JSON.parse(fs.readFileSync(root+'/manifest.json','utf8')).items
const q=s=>"'"+s.replaceAll("'","''")+"'"
async function request(suffix,body){const r=await fetch(`https://api.supabase.com/v1/projects/${project}${suffix}`,{method:body?'POST':'GET',headers:{Authorization:`Bearer ${process.env.SUPABASE_ACCESS_TOKEN}`,'Content-Type':'application/json'},...(body?{body:JSON.stringify(body)}:{})});if(!r.ok)throw Error('Management HTTP '+r.status);return r.json()}
const identity=await request('');if(identity.id!==project&&identity.ref!==project)throw Error('Project mismatch')
const [data]=await request('/database/query',{query:`select clock_timestamp() captured_at,(select jsonb_agg(to_jsonb(s) order by id) from public.collectible_species s where id in (${items.map(i=>q(i.id)).join(',')})) species,(select jsonb_agg(jsonb_build_object('species_id',species_id,'n',n)) from (select species_id,count(*) n from public.player_collectibles where species_id in (${items.map(i=>q(i.id)).join(',')}) group by species_id) a) ownership_counts,(select jsonb_agg(version order by version) from supabase_migrations.schema_migrations) migrations;`,read_only:true})
if(data.species.length!==9)throw Error('Missing target species')
for(const row of data.species){const old=items.find(i=>i.id===row.id).previous;for(const k of Object.keys(old))if(String(row[k])!==String(old[k]))throw Error('Remote catalog drift '+row.id+'.'+k)}
const local=fs.readdirSync('supabase/migrations').filter(f=>f.endsWith('.sql')).map(f=>f.split('_')[0])
const drift={localOnly:local.filter(v=>!data.migrations.includes(v)).length,remoteOnly:data.migrations.filter(v=>!local.includes(v)).length}
fs.writeFileSync('artifacts/pirate-refactor-preflight.json',JSON.stringify({project,...data,historyDrift:drift},null,2)+'\n')
console.log(JSON.stringify({project,checkedSpecies:data.species.length,allRowsMatchLocal:true,historyDrift:drift,ownershipCounts:data.ownership_counts}))
