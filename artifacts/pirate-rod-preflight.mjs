import fs from 'node:fs'
import {loadEnvFile} from 'node:process'
loadEnvFile('.env.storage.local')
const project='ewafafphiovbpjwogwzn'
if(process.env.SUPABASE_URL!==`https://${project}.supabase.co`)throw Error('Wrong project')
async function request(suffix,body){const r=await fetch(`https://api.supabase.com/v1/projects/${project}${suffix}`,{method:body?'POST':'GET',headers:{Authorization:`Bearer ${process.env.SUPABASE_ACCESS_TOKEN}`,'Content-Type':'application/json'},...(body?{body:JSON.stringify(body)}:{})});if(!r.ok)throw Error('Management HTTP '+r.status);return r.json()}
const identity=await request('');if(identity.id!==project&&identity.ref!==project)throw Error('Project mismatch')
const [data]=await request('/database/query',{read_only:true,query:`select clock_timestamp() captured_at,(select jsonb_agg(to_jsonb(r) order by id) from public.fishing_rods r) rods,(select jsonb_agg(to_jsonb(r)) from public.regions r where id in ('plunder','nyamnyam')) regions,(select jsonb_agg(version order by version) from supabase_migrations.schema_migrations) migrations;`})
const local=fs.readdirSync('supabase/migrations').filter(f=>f.endsWith('.sql')).map(f=>f.split('_')[0])
const historyDrift={localOnly:local.filter(v=>!data.migrations.includes(v)).length,remoteOnly:data.migrations.filter(v=>!local.includes(v)).length}
fs.writeFileSync('artifacts/pirate-rod-preflight.json',JSON.stringify({project,...data,historyDrift},null,2)+'\n')
console.log(JSON.stringify({project,targets:data.rods.filter(r=>['plunder','nyamnyam'].includes(r.id)),regionalExample:data.rods.find(r=>r.id==='siren'),regions:data.regions.map(r=>r.id),historyDrift}))
