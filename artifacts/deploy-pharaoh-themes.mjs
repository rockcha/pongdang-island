import fs from 'node:fs'
import {createHash} from 'node:crypto'
import {query,project} from './pharaoh-remote.mjs'
const batch='assets/storage-upload/new/20261030-105924',version='20261030020318',name='premium_pharaoh_aquarium_themes',prior=JSON.parse(fs.readFileSync('.cache/pharaoh-themes-preflight.json','utf8')),m=JSON.parse(fs.readFileSync(batch+'/manifest.json','utf8')),catalog=JSON.parse(fs.readFileSync('supabase/catalog/catalog.json','utf8')).aquarium_backgrounds,sql=fs.readFileSync(`supabase/migrations/${version}_${name}.sql`,'utf8').replaceAll('\r\n','\n'),quote=s=>"'"+s.replaceAll("'","''")+"'",norm=s=>s.replaceAll('\r\n','\n').trim(),hash=b=>createHash('sha256').update(b).digest('hex')
const expected=m.files.map(f=>({id:f.theme_id,name:f.name,price:f.price,image_path:f.storage_path,tier:'special'})),ids=expected.map(r=>quote(r.id)).join(','),read='select id,name,price,image_path,tier from public.aquarium_backgrounds order by id'
if(prior.project!==project||expected.length!==2||expected.some(e=>!catalog.some(c=>Object.entries(e).every(([k,v])=>c[k]===v))))throw Error('Unexpected project/catalog')
const before=await query(read),old=before.filter(r=>!expected.some(e=>e.id===r.id))
if(old.length!==prior.backgrounds.length||prior.backgrounds.some(s=>!old.some(r=>Object.entries(s).every(([k,v])=>r[k]===v))))throw Error('Background drift since preflight')
const functions=await query("select n.nspname schema,p.proname name,pg_get_functiondef(p.oid) definition from pg_proc p join pg_namespace n on n.oid=p.pronamespace where n.nspname in ('public','app_private') and p.proname in ('aquarium_state','aquarium_background')")
if(functions.length!==4||functions.some(f=>!prior.functions.some(p=>p.schema===f.schema&&p.name===f.name&&norm(p.definition)===norm(f.definition))))throw Error('RPC drift')
const verified=[]
for(const f of m.files){
 const local=fs.readFileSync(batch+'/'+f.local_path),url=`https://${project}.supabase.co/storage/v1/object/public/aquarium-backgrounds/${f.storage_path}`,r=await fetch(url)
 if(!f.uploaded||f.uploaded_project!==project||hash(local)!==f.sha256||!r.ok||hash(Buffer.from(await r.arrayBuffer()))!==f.sha256)throw Error('Public image mismatch')
 verified.push({path:f.storage_path,sha256:f.sha256,bytes:local.length})
}
const history=await query(`select statements from supabase_migrations.schema_migrations where version='${version}'`)
if(history.length&&!history[0].statements.some(s=>norm(s)===norm(sql)))throw Error('Migration history differs')
if(!history.length&&before.some(r=>expected.some(e=>e.id===r.id)))throw Error('Unexpected pre-existing theme')
if(process.argv[2]==='apply'&&!history.length)await query('begin;'+sql.replace(/^begin;\s*$/mg,'').replace(/^commit;\s*$/mg,'')+`\ninsert into supabase_migrations.schema_migrations(version,name,statements) values('${version}','${name}',array[${quote(sql)}]::text[]);commit;`,false)
const after=await query(read),registered=expected.every(e=>after.some(r=>Object.entries(e).every(([k,v])=>r[k]===v))),unchanged=old.every(s=>after.some(r=>Object.entries(s).every(([k,v])=>r[k]===v)))
if(!unchanged||process.argv[2]==='apply'&&!registered)throw Error('Post-deploy mismatch')
if(registered)await query(`begin read only;set local role authenticated;do $verify$ begin if (select count(*) from public.aquarium_backgrounds where id in (${ids}))<>2 then raise exception 'Theme catalog read failed';end if;end $verify$;rollback;`,false)
Object.assign(m,{status:registered?'registered':'images-uploaded',catalog_registered:registered,registered_project:project,registered_at:m.registered_at??(registered?new Date().toISOString():null),frontend_deployed:false})
fs.writeFileSync(batch+'/manifest.json',JSON.stringify(m,null,2)+'\n');fs.writeFileSync(batch+'/storage-verification.json',JSON.stringify({project,verified_at:new Date().toISOString(),files:verified},null,2)+'\n')
console.log(JSON.stringify({project,registered,existingBackgroundsUnchanged:unchanged,catalogCount:after.length,publicImagesVerified:verified.length,themes:expected,frontendDeployed:false}))
