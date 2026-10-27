import {loadEnvFile} from 'node:process'
import fs from 'node:fs'
loadEnvFile('.env.storage.local')
const project='ewafafphiovbpjwogwzn',{root}=JSON.parse(fs.readFileSync('artifacts/shared-wonders-root.json','utf8'))
if(process.env.SUPABASE_URL!==`https://${project}.supabase.co`)throw Error('Wrong project')
const m=JSON.parse(fs.readFileSync(root+'/manifest.json','utf8')),q=s=>"'"+String(s).replaceAll("'","''")+"'"
if(m.items.length!==7||m.items.some(i=>i.rarity!=='common'||i.kind!=='fish'))throw Error('Common-only scope violated')
const ids=m.items.map(i=>q(i.id)).join(','),names=m.items.map(i=>q(i.name)).join(',')
const paths=['supabase/migrations/20261027004622_shared_ocean_wonders_catalog.sql','supabase/migrations/20261027010530_shared_colorful_reef_fish.sql']
const migrations=paths.map(file=>{const base=file.split('/').at(-1);return {file,version:base.split('_')[0],name:base.slice(15,-4),sql:fs.readFileSync(file,'utf8').replaceAll('\r\n','\n')}})
async function request(suffix,body){const r=await fetch(`https://api.supabase.com/v1/projects/${project}${suffix}`,{method:body?'POST':'GET',headers:{Authorization:`Bearer ${process.env.SUPABASE_ACCESS_TOKEN}`,'Content-Type':'application/json'},...(body?{body:JSON.stringify(body)}:{})});if(!r.ok)throw Error('Management HTTP '+r.status);return r.json()}
const query=(query,readOnly=true)=>request('/database/query',{query,read_only:readOnly})
const identity=await request('');if(identity.id!==project&&identity.ref!==project)throw Error('Project mismatch')
const capture=`select clock_timestamp() captured_at,(select jsonb_agg(to_jsonb(s) order by id) from public.collectible_species s where id in (${ids}) or name in (${names})) species,(select count(*) from public.collectible_habitats where species_id in (${ids})) habitats,(select jsonb_agg(id order by id) from public.regions) regions,(select jsonb_agg(version order by version) from supabase_migrations.schema_migrations where version in (${migrations.map(i=>q(i.version)).join(',')})) versions;`
const [before]=await query(capture)
const regions=JSON.parse(fs.readFileSync('supabase/catalog/catalog.json','utf8')).regions.map(r=>r.id).sort()
if(JSON.stringify(before.regions)!==JSON.stringify(regions))throw Error('Remote/local region drift')
const already=before.versions?.length===migrations.length
if(!already&&(before.species?.length||before.versions?.length||before.habitats))throw Error('Target collision or partial migration history; inspect before applying')
console.log(JSON.stringify({project,mode:process.argv[2]??'check',alreadyApplied:already,existingSpecies:before.species?.length??0,regions:regions.length}))
if(process.argv[2]!=='apply')process.exit(0)
const storage=JSON.parse(fs.readFileSync(root+'/storage-verification.json','utf8'))
if(storage.project!==project||storage.count!==14)throw Error('Missing fourteen verified public image assets')
if(!already){
 let sql=`begin;\nset local statement_timeout='25s';\nlock table public.collectible_species in share row exclusive mode;\ndo $guard$ begin if exists(select 1 from public.collectible_species where id in (${ids}) or name in (${names})) then raise exception 'COMMON_CATALOG_CHANGED';end if;end $guard$;\n`
 for(const migration of migrations){
  sql+=migration.sql.replace(/^begin;\s*$/gm,'').replace(/^commit;\s*$/gm,'')+'\n'
  sql+=`insert into supabase_migrations.schema_migrations(version,name,statements) values(${q(migration.version)},${q(migration.name)},array[${q(migration.sql)}]::text[]);\n`
 }
 await query(sql+'commit;',false)
}
const [after]=await query(capture)
if(after.species?.length!==7||after.habitats!==7*regions.length||after.versions?.length!==2)throw Error('Post-apply scope failed')
const keys=Object.keys(JSON.parse(fs.readFileSync('supabase/catalog/catalog.json','utf8')).collectible_species[0])
for(const row of after.species){const expected=m.items.find(i=>i.id===row.id);for(const key of keys)if(String(row[key])!==String(expected[key]))throw Error('Post-apply mismatch '+row.id+'.'+key);if(row.is_native!==false)throw Error('Unexpected native bonus')}
const deferredIds=(m.deferredSpeciesIds??(m.deferredItems??[]).map(i=>i.id)).map(q).join(',')
const [deferred]=await query(`select count(*)::int n from public.collectible_species where id in (${deferredIds});`)
if(deferred.n!==0)throw Error('Deferred species unexpectedly registered')
fs.writeFileSync('artifacts/shared-common-deployment.json',JSON.stringify({project,verifiedAt:after.captured_at,migrations:migrations.map(i=>i.version),scope:'Seven new common species and all fourteen current regional habitats only. No player writes or migration history repairs. Full remote/local history equivalence remains unverified.',species:after.species,habitats:after.habitats,deferredSpeciesAbsent:true},null,2)+'\n')
console.log(JSON.stringify({verified:after.species.map(s=>({name:s.name,price:s.sell_price})),habitats:after.habitats,deferredSpeciesAbsent:true}))
