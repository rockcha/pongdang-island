import {readFileSync,writeFileSync} from 'node:fs'
import {homedir} from 'node:os'
import {loadEnvFile} from 'node:process'
loadEnvFile('.env.storage.local')
const ref=new URL(process.env.SUPABASE_URL).hostname.split('.')[0]
const token=process.env.SUPABASE_ACCESS_TOKEN||readFileSync(homedir()+'/.supabase/access-token','utf8').trim()
export async function query(query,readOnly=true){const r=await fetch(`https://api.supabase.com/v1/projects/${ref}/database/query`,{method:'POST',headers:{Authorization:`Bearer ${token}`,'Content-Type':'application/json'},body:JSON.stringify({query,read_only:readOnly})});if(!r.ok)throw Error('Management SQL unavailable: HTTP '+r.status+' '+(await r.text()).slice(0,350));return r.json()}
if(process.argv[2]==='preflight'){
const data=await query(`select current_setting('server_version') as server_version,
 (select coalesce(jsonb_agg(jsonb_build_object('name',p.proname,'definition',pg_get_functiondef(p.oid))),'[]') from pg_proc p join pg_namespace n on n.oid=p.pronamespace where n.nspname='app_private' and p.proname in ('pick_regional_collectible','regional_bait_odds','prepare_fishing','finish_fishing')) as functions,
 (select jsonb_agg(jsonb_build_object('column',column_name,'type',data_type)) from information_schema.columns where table_schema='public' and table_name='collectible_species') as columns,
 (select jsonb_agg(to_jsonb(r)) from public.regions r) as regions,
 (select jsonb_agg(jsonb_build_object('name',c.conname,'definition',pg_get_constraintdef(c.oid))) from pg_constraint c where c.conrelid='public.collectible_species'::regclass) as constraints`)
writeFileSync('artifacts/scrapisle-remote-preflight.json',JSON.stringify({capturedAt:new Date().toISOString(),projectRef:ref,data},null,2)+'\n');console.log('Read-only preflight saved for target project; schema not changed.')
}
if(process.argv[2]==='apply'){
 const {batch}=JSON.parse(readFileSync('artifacts/scrapisle-plan.json','utf8')),proof=JSON.parse(readFileSync(batch+'/upload-verification.json','utf8'))
 if(!proof.files.length)throw Error('Upload verification required')
 await query(readFileSync('artifacts/scrapisle-install.sql','utf8'),false)
 const data=await query("select (select count(*) from public.collectible_species where native_region_id='scrapisle') species_count,(select count(*) from public.collectible_habitats where region_id='scrapisle') habitat_count,(select row_to_json(r) from public.regions r where id='scrapisle') region,(select row_to_json(m) from public.region_maps m where region_id='scrapisle') map,(select row_to_json(r) from public.fishing_rods r where id='scrapisle') rod")
 if(Number(data[0].species_count)!==26||Number(data[0].habitat_count)!==26)throw Error('Remote row count mismatch')
 writeFileSync(batch+'/remote-registration.json',JSON.stringify({verifiedAt:new Date().toISOString(),projectRef:ref,data,scope:'This task SQL and catalog rows only; migration history not changed.'},null,2)+'\n');console.log('SQL applied and verified: region, map, rod,26 native species,26 habitats.')
}
