import {loadEnvFile} from 'node:process'
import {readFileSync,writeFileSync,mkdirSync} from 'node:fs'
import {createHash} from 'node:crypto'
loadEnvFile('.env.storage.local')
const project='ewafafphiovbpjwogwzn',file='20261025184854_dreamabyss_ten_creatures.sql'
const batch='assets/storage-upload/new/20261026-033245',dir='supabase/inspection/remote/dreamabyss-creatures'
const quote=s=>"'"+s.replaceAll("'","''")+"'",norm=s=>s.replaceAll('\r\n','\n'),hash=b=>createHash('sha256').update(b).digest('hex')
if(new URL(process.env.SUPABASE_URL).hostname!==project+'.supabase.co')throw Error('Project mismatch')
async function api(path,options={}){const r=await fetch('https://api.supabase.com/v1/projects/'+project+path,{...options,headers:{Authorization:'Bearer '+process.env.SUPABASE_ACCESS_TOKEN,'Content-Type':'application/json'}});if(!r.ok)throw Error('Management API '+r.status+': '+(await r.text()).slice(0,250));return r.json()}
const query=(sql,readOnly=true)=>api('/database/query',{method:'POST',body:JSON.stringify({query:sql,read_only:readOnly})})
const identity=await api('');if(identity.id!==project||identity.name!=='pongdang-island')throw Error('Project identity mismatch')
const catalog=JSON.parse(readFileSync('supabase/catalog/catalog.json','utf8')),manifest=JSON.parse(readFileSync(batch+'/manifest.json','utf8')),ids=manifest.items.map(i=>i.id),list=ids.map(quote).join(',')
if(ids.length!==10||new Set(ids).size!==10)throw Error('Unexpected species scope')
const files=manifest.items.flatMap(i=>[i.thumbnail_path,i.sprite_sheet_path,...(i.catalog_sprite_sheet_path?[i.catalog_sprite_sheet_path]:[])])
const imageHashes=await Promise.all(files.map(async path=>{const local=readFileSync(batch+'/'+path),r=await fetch(process.env.SUPABASE_URL+'/storage/v1/object/public/collectibles/'+path);if(!r.ok||hash(Buffer.from(await r.arrayBuffer()))!==hash(local))throw Error('Public image mismatch: '+path);return {path,sha256:hash(local),bytes:local.length}}))
manifest.files=imageHashes;writeFileSync(batch+'/manifest.json',JSON.stringify(manifest,null,2)+'\n')
if((await query("select id from public.regions where id='dreamabyss'")).length!==1)throw Error('Dream Abyss region missing')
const existingNative=()=>query(`select to_jsonb(s) row from public.collectible_species s where native_region_id='dreamabyss' and id not in (${list}) order by id`)
const before=await existingNative(),source=norm(readFileSync('supabase/migrations/'+file,'utf8'))
const history=await query(`select statements from supabase_migrations.schema_migrations where version=${quote(file.slice(0,14))}`)
if(history.length){if(norm(history[0].statements[0])!==source)throw Error('Recorded migration differs')}
else{
 if((await query(`select id from public.collectible_species where id in (${list})`)).length)throw Error('New ID already exists')
 const body=source.split('\n').filter(line=>!/^\s*(begin|commit);\s*$/i.test(line)).join('\n')
 await query(`begin;set local lock_timeout='3s';set local statement_timeout='30s';${body}
 insert into supabase_migrations.schema_migrations(version,name,statements) values(${quote(file.slice(0,14))},'dreamabyss_ten_creatures',array[${quote(source)}]);commit;`,false)
}
const rows=await query(`select to_jsonb(s) row,(select jsonb_agg(h.region_id order by h.region_id) from public.collectible_habitats h where h.species_id=s.id) habitats from public.collectible_species s where id in (${list}) order by id`)
if(rows.length!==10)throw Error('Missing deployed species')
for(const {row,habitats} of rows){
 const expected=catalog.collectible_species.find(s=>s.id===row.id)
 for(const [key,value] of Object.entries(expected))if(!(['swim_y_min','swim_y_max','speed'].includes(key)?Number(value)===Number(row[key]):value===row[key]))throw Error('Catalog mismatch: '+row.id+'.'+key)
 if(JSON.stringify(habitats)!=='["dreamabyss"]')throw Error('Habitat mismatch: '+row.id)
}
if(JSON.stringify(before)!==JSON.stringify(await existingNative()))throw Error('Existing native catalog changed')
const recorded=await query(`select statements from supabase_migrations.schema_migrations where version=${quote(file.slice(0,14))}`)
if(recorded.length!==1||norm(recorded[0].statements[0])!==source)throw Error('Migration recording mismatch')
const releasesFile='src/features/regions/species-releases.json',releases=JSON.parse(readFileSync(releasesFile,'utf8')),missing=ids.filter(id=>!releases.some(r=>r.speciesIds.includes(id)))
if(missing.length){releases.push({releasedAt:new Date().toISOString(),speciesIds:missing});writeFileSync(releasesFile,JSON.stringify(releases,null,2)+'\n')}
const capturedAt=new Date().toISOString()
mkdirSync(dir,{recursive:true});writeFileSync(dir+'/verification.json',JSON.stringify({project,capturedAt,migrationHash:hash(source),scope:['ten new catalog rows and native habitats','existing Dream Abyss catalog unchanged','21 public PNG byte hashes','new migration source/version recorded'],fullSchemaParity:false,existingNativeCount:before.length,rows,imageHashes},null,2)+'\n')
console.log(JSON.stringify({status:'PASS',project,capturedAt,species:rows.length,images:imageHashes.length,existingNativeUnchanged:before.length,frontendDeployed:false}))
