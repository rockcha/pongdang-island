import {loadEnvFile} from 'node:process'
import {readFileSync,writeFileSync,mkdirSync} from 'node:fs'
import {createHash} from 'node:crypto'
loadEnvFile('.env.storage.local')
const project='ewafafphiovbpjwogwzn',file='20261025182323_three_common_industrial_trash.sql'
const ids=['discarded-battery','broken-generator','rusty-cogwheel'],batch='assets/storage-upload/new/20261026-032115',dir='supabase/inspection/remote/industrial-trash'
const quote=s=>"'"+s.replaceAll("'","''")+"'",norm=s=>s.replaceAll('\r\n','\n'),hash=b=>createHash('sha256').update(b).digest('hex')
if(new URL(process.env.SUPABASE_URL).hostname!==project+'.supabase.co')throw Error('Project mismatch')
async function api(path,options={}){const r=await fetch('https://api.supabase.com/v1/projects/'+project+path,{...options,headers:{Authorization:'Bearer '+process.env.SUPABASE_ACCESS_TOKEN,'Content-Type':'application/json'}});if(!r.ok)throw Error('Management API '+r.status+': '+(await r.text()).slice(0,250));return r.json()}
const query=(sql,readOnly=true)=>api('/database/query',{method:'POST',body:JSON.stringify({query:sql,read_only:readOnly})})
const identity=await api('');if(identity.id!==project||identity.name!=='pongdang-island')throw Error('Project identity mismatch')
const catalog=JSON.parse(readFileSync('supabase/catalog/catalog.json','utf8')),manifest=JSON.parse(readFileSync(batch+'/manifest.json','utf8'))
for(const item of manifest.items){
 const local=readFileSync(batch+'/'+item.storagePath),r=await fetch(process.env.SUPABASE_URL+'/storage/v1/object/public/collectibles/'+item.storagePath)
 if(!r.ok||hash(Buffer.from(await r.arrayBuffer()))!==hash(local))throw Error('Public image mismatch: '+item.id)
 item.sha256=hash(local)
}
writeFileSync(batch+'/manifest.json',JSON.stringify(manifest,null,2)+'\n')
const remoteRegions=(await query('select id from public.regions order by id')).map(r=>r.id)
if(JSON.stringify(remoteRegions)!==JSON.stringify(catalog.regions.map(r=>r.id).sort()))throw Error('Region scope differs')
const source=norm(readFileSync('supabase/migrations/'+file,'utf8')),list=ids.map(quote).join(',')
const history=await query(`select statements from supabase_migrations.schema_migrations where version=${quote(file.slice(0,14))}`)
if(history.length){if(norm(history[0].statements[0])!==source)throw Error('Recorded migration differs')}
else{
 if((await query(`select id from public.collectible_species where id in (${list})`)).length)throw Error('New ID already exists')
 const body=source.split('\n').filter(line=>!/^\s*(begin|commit);\s*$/i.test(line)).join('\n')
 await query(`begin;set local lock_timeout='3s';set local statement_timeout='30s';${body}
 insert into supabase_migrations.schema_migrations(version,name,statements) values(${quote(file.slice(0,14))},'three_common_industrial_trash',array[${quote(source)}]);commit;`,false)
}
const rows=await query(`select to_jsonb(s) row from public.collectible_species s where id in (${list}) order by id`)
if(rows.length!==3)throw Error('Missing deployed species')
for(const {row} of rows){
 const expected=catalog.collectible_species.find(s=>s.id===row.id)
 for(const [key,value] of Object.entries(expected)){
  const equal=['swim_y_min','swim_y_max','speed'].includes(key)?Number(value)===Number(row[key]):value===row[key]
  if(!equal)throw Error('Catalog mismatch: '+row.id+'.'+key)
 }
 const habitats=(await query(`select region_id from public.collectible_habitats where species_id=${quote(row.id)} order by region_id`)).map(r=>r.region_id)
 if(JSON.stringify(habitats)!==JSON.stringify(remoteRegions))throw Error('Habitat mismatch: '+row.id)
}
const releasesFile='src/features/regions/species-releases.json',releases=JSON.parse(readFileSync(releasesFile,'utf8'))
const missing=ids.filter(id=>!releases.some(r=>r.speciesIds.includes(id)))
if(missing.length){releases.push({releasedAt:new Date().toISOString(),speciesIds:missing});writeFileSync(releasesFile,JSON.stringify(releases,null,2)+'\n')}
mkdirSync(dir,{recursive:true});writeFileSync(dir+'/verification.json',JSON.stringify({project,capturedAt:new Date().toISOString(),migrationHash:hash(source),scope:['three new catalog rows','all current regions','public PNG byte equality'],fullSchemaParity:false,rows,imageHashes:manifest.items.map(i=>({id:i.id,sha256:i.sha256}))},null,2))
console.log('PASS: 3 common 3-gold trash items deployed; fixed movement, all habitats and public image hashes verified. Release timestamps recorded; no player data read.')
