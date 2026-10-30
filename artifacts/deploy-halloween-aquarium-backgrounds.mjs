import fs from 'node:fs'
import {loadEnvFile} from 'node:process'
import {createHash} from 'node:crypto'
loadEnvFile('.env.storage.local')
const project='ewafafphiovbpjwogwzn',version='20261029185234',name='add_three_halloween_aquarium_backgrounds'
if(process.env.SUPABASE_URL!==`https://${project}.supabase.co`)throw Error('Wrong project')
const batch='assets/storage-upload/new/20261030-034926',manifest=JSON.parse(fs.readFileSync(batch+'/manifest.json','utf8'))
const catalog=JSON.parse(fs.readFileSync('supabase/catalog/catalog.json','utf8')).aquarium_backgrounds
const expected=manifest.files.map(file=>({id:file.theme_id,name:file.name,price:file.price,image_path:file.storage_path,tier:'special'}))
const quote=value=>"'"+value.replaceAll("'","''")+"'"
const ids=expected.map(row=>quote(row.id)).join(',')
const hash=bytes=>createHash('sha256').update(bytes).digest('hex')
async function query(query,read_only=true){
 const r=await fetch(`https://api.supabase.com/v1/projects/${project}/database/query`,{method:'POST',headers:{Authorization:`Bearer ${process.env.SUPABASE_ACCESS_TOKEN}`,'Content-Type':'application/json'},body:JSON.stringify({query,read_only})})
 if(!r.ok)throw Error('Management HTTP '+r.status)
 return r.json()
}
const read="select id,name,price,image_path,tier from public.aquarium_backgrounds order by id"
const before=await query(read),old=before.filter(row=>!expected.some(e=>e.id===row.id))
const unrelated=catalog.filter(row=>!expected.some(e=>e.id===row.id))
if(expected.length!==3||old.length!==unrelated.length||unrelated.some(row=>!old.some(actual=>Object.entries(row).every(([key,value])=>actual[key]===value))))throw Error('Existing background catalog drift')
const functions=await query("select n.nspname schema,p.proname name,pg_get_functiondef(p.oid) definition from pg_proc p join pg_namespace n on n.oid=p.pronamespace where n.nspname in ('public','app_private') and p.proname in ('aquarium_state','aquarium_background')")
const definitions=JSON.parse(fs.readFileSync('docs/db/local-schema.json','utf8')).structure.functions
const normalize=s=>s.replaceAll('\r\n','\n').trim()
if(functions.length!==4||functions.some(f=>!definitions.some(d=>d.schema===f.schema&&d.name===f.name&&normalize(d.definition)===normalize(f.definition))))throw Error('Background RPC drift')
for(const file of manifest.files){
 const local=fs.readFileSync(batch+'/'+file.local_path)
 if(!file.uploaded||file.uploaded_project!==project||hash(local)!==file.sha256)throw Error('Unverified local image')
 const r=await fetch(`https://${project}.supabase.co/storage/v1/object/public/aquarium-backgrounds/${file.storage_path}`)
 if(!r.ok||hash(Buffer.from(await r.arrayBuffer()))!==file.sha256)throw Error('Unverified public image')
}
const [{applied}]=await query(`select exists(select 1 from supabase_migrations.schema_migrations where version='${version}') applied`)
const existing=before.filter(row=>expected.some(e=>e.id===row.id))
if(!applied&&existing.length)throw Error('Unexpected existing Halloween themes')
if(process.argv[2]==='apply'&&!applied){
 const sql=fs.readFileSync(`supabase/migrations/${version}_${name}.sql`,'utf8').replaceAll('\r\n','\n')
 const body=sql.replace(/^begin;\s*$/mg,'').replace(/^commit;\s*$/mg,'')
 await query(`begin;set local statement_timeout='30s';${body}\ninsert into supabase_migrations.schema_migrations(version,name,statements) values('${version}','${name}',array[${quote(sql)}]::text[]);commit;`,false)
}
const after=await query(read)
const published=expected.every(row=>after.some(actual=>Object.entries(row).every(([key,value])=>actual[key]===value)))
if((process.argv[2]==='apply'||applied)&&!published)throw Error('Post-deploy catalog mismatch')
if(published){
 await query(`begin read only;set local role authenticated;do $verify$ begin if (select count(*) from public.aquarium_backgrounds where id in (${ids}))<>3 then raise exception 'Authenticated catalog read failed';end if;end $verify$;rollback;`,false)
 Object.assign(manifest,{status:'registered',uploaded:true,catalog_registered:true,registered_project:project,registered_at:manifest.registered_at??new Date().toISOString(),migration:version+'_'+name+'.sql'})
 fs.writeFileSync(batch+'/manifest.json',JSON.stringify(manifest,null,2)+'\n')
}
console.log(JSON.stringify({project,phase:process.argv[2]??'preflight',registered:published,catalogCount:after.length,existingBackgroundsUnchanged:old.every(row=>after.some(actual=>Object.entries(row).every(([key,value])=>actual[key]===value))),themes:published?after.filter(row=>expected.some(e=>e.id===row.id)):expected,publicImagesVerified:3,authenticatedReadVerified:published}))
