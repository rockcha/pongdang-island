import fs from 'node:fs'
import {createHash} from 'node:crypto'
import {query,project} from './pharaoh-remote.mjs'
const batch='assets/storage-upload/new/20261030-100353',version='20261030010441',name='pharaoh_separate_region_overview'
const prior=JSON.parse(fs.readFileSync('.cache/pharaoh-overview-preflight.json','utf8')),expected=JSON.parse(fs.readFileSync('supabase/catalog/catalog.json','utf8')).regions.find(r=>r.id==='pharaoh')
if(prior.project!==project)throw Error('Wrong project')
const sql=fs.readFileSync(`supabase/migrations/${version}_${name}.sql`,'utf8').replaceAll('\r\n','\n'),m=JSON.parse(fs.readFileSync(batch+'/manifest.json','utf8'))
const hash=b=>createHash('sha256').update(b).digest('hex'),quote=s=>"'"+s.replaceAll("'","''")+"'",norm=s=>s.replaceAll('\r\n','\n').trim()
for(const a of m.assets){const r=await fetch(a.public_storage_url);if(!r.ok||hash(Buffer.from(await r.arrayBuffer()))!==a.sha256)throw Error('Public image mismatch '+a.path)}
const history=await query(`select statements from supabase_migrations.schema_migrations where version='${version}'`)
if(history.length&&!history[0].statements.some(s=>norm(s)===norm(sql)))throw Error('Migration history differs')
if(!history.length){const rows=await query("select * from public.regions where id='pharaoh'");if(rows.length!==1||Object.entries(prior.region).some(([k,v])=>String(v)!==String(rows[0][k])))throw Error('Region changed since preflight')}
if(process.argv[2]==='apply'&&!history.length)await query('begin;'+sql.replace(/^begin;\s*$/mg,'').replace(/^commit;\s*$/mg,'')+`\ninsert into supabase_migrations.schema_migrations(version,name,statements) values('${version}','${name}',array[${quote(sql)}]::text[]);commit;`,false)
const rows=await query("select * from public.regions where id='pharaoh'"),registered=rows.length===1&&Object.entries(expected).every(([k,v])=>String(v)===String(rows[0][k]))
if(process.argv[2]==='apply'&&!registered)throw Error('Region post-deploy mismatch')
if(registered)await query(`begin read only;set local role authenticated;do $verify$ begin if not exists(select 1 from public.regions where id='pharaoh' and image_path=${quote(expected.image_path)}) then raise exception 'Region overview read failed';end if;end $verify$;rollback;`,false)
Object.assign(m,{catalog_registered:registered,registered_project:project,registered_at:m.registered_at??(registered?new Date().toISOString():null),frontend_deployed:false})
fs.writeFileSync(batch+'/manifest.json',JSON.stringify(m,null,2)+'\n')
console.log(JSON.stringify({project,registered,image_path:rows[0]?.image_path,frontendDeployed:false}))
