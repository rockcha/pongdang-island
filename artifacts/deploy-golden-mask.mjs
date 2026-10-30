import fs from 'node:fs'
import {createHash} from 'node:crypto'
import {query,project} from './pharaoh-remote.mjs'
const batch='assets/storage-upload/new/20261030-104151',version='20261030014836',name='pharaoh_scarab_to_golden_mask',id='pharaoh-solar-scarab',hash=b=>createHash('sha256').update(b).digest('hex'),quote=s=>"'"+s.replaceAll("'","''")+"'",norm=s=>s.replaceAll('\r\n','\n').trim()
const prior=JSON.parse(fs.readFileSync('.cache/golden-mask-preflight.json','utf8')),expected=JSON.parse(fs.readFileSync('supabase/catalog/catalog.json','utf8')).collectible_species.find(s=>s.id===id),m=JSON.parse(fs.readFileSync(batch+'/manifest.json','utf8')),sql=fs.readFileSync(`supabase/migrations/${version}_${name}.sql`,'utf8').replaceAll('\r\n','\n')
if(prior.project!==project||expected.sell_price!==prior.species.sell_price)throw Error('Wrong project or changed price')
const verified=[]
for(const a of m.assets.filter(a=>['thumbnail','swim8','compat'].includes(a.role))){
 const bytes=fs.readFileSync('.cache/golden-mask-upload/'+a.path),url=`https://${project}.supabase.co/storage/v1/object/public/collectibles/${a.path}`,r=await fetch(url)
 if(!r.ok||hash(Buffer.from(await r.arrayBuffer()))!==hash(bytes))throw Error('Public image mismatch '+a.path)
 fs.writeFileSync(a.target,bytes);if(a.role==='swim8')fs.copyFileSync(a.target,'public/aquarium/swim/'+a.path.split('/').at(-1))
 Object.assign(a,{sha256:hash(bytes),uploaded:true,public_storage_url:url});verified.push({path:a.path,sha256:a.sha256,bytes:bytes.length})
}
const read="select * from public.collectible_species where id='pharaoh-solar-scarab'",history=await query(`select statements from supabase_migrations.schema_migrations where version='${version}'`)
if(history.length&&!history[0].statements.some(s=>norm(s)===norm(sql)))throw Error('Migration history differs')
if(!history.length){const rows=await query(read);if(rows.length!==1||Object.entries(prior.species).some(([k,v])=>String(v)!==String(rows[0][k])))throw Error('Target changed since preflight')}
if(process.argv[2]==='apply'&&!history.length)await query('begin;'+sql.replace(/^begin;\s*$/mg,'').replace(/^commit;\s*$/mg,'')+`\ninsert into supabase_migrations.schema_migrations(version,name,statements) values('${version}','${name}',array[${quote(sql)}]::text[]);commit;`,false)
const rows=await query(read),registered=rows.length===1&&Object.entries(expected).every(([k,v])=>String(v)===String(rows[0][k]))
if(process.argv[2]==='apply'&&!registered)throw Error('Post-deploy mismatch')
if(registered)await query(`begin read only;set local role authenticated;do $verify$ begin if not exists(select 1 from public.collectible_species where id='${id}' and name=${quote(expected.name)} and sell_price=${expected.sell_price} and sprite_sheet_path=${quote(expected.sprite_sheet_path)}) then raise exception 'Golden mask catalog read failed';end if;end $verify$;rollback;`,false)
Object.assign(m,{uploaded_project:project,catalog_registered:registered,registered_at:m.registered_at??(registered?new Date().toISOString():null),frontend_deployed:false,status:registered?'registered-frontend-local':'images-uploaded'})
fs.writeFileSync(batch+'/manifest.json',JSON.stringify(m,null,2)+'\n');fs.writeFileSync(batch+'/storage-verification.json',JSON.stringify({project,verified_at:new Date().toISOString(),files:verified},null,2)+'\n')
console.log(JSON.stringify({project,verifiedImages:verified.length,registered,id,name:rows[0]?.name,sell_price:rows[0]?.sell_price,movement:rows[0]?.movement_type,frontendDeployed:false}))
