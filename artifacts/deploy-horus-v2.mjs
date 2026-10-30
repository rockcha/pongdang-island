import fs from 'node:fs'
import {createHash} from 'node:crypto'
import {query,project} from './pharaoh-remote.mjs'
const batch='assets/storage-upload/new/20261030-094918',id='pharaoh-gold-wing-horus',version='20261030005146',name='horus_stable_sprite_alignment'
const hash=b=>createHash('sha256').update(b).digest('hex'),quote=s=>"'"+s.replaceAll("'","''")+"'",norm=s=>s.replaceAll('\r\n','\n').trim()
const prior=JSON.parse(fs.readFileSync('.cache/horus-preflight.json','utf8')),expected=JSON.parse(fs.readFileSync('supabase/catalog/catalog.json','utf8')).collectible_species.find(s=>s.id===id)
if(prior.project!==project)throw Error('Wrong preflight project')
const sql=fs.readFileSync(`supabase/migrations/${version}_${name}.sql`,'utf8').replaceAll('\r\n','\n'),m=JSON.parse(fs.readFileSync(batch+'/manifest.json','utf8'))
const verified=[]
for(const a of m.assets){
 const bytes=fs.readFileSync('.cache/horus-upload/'+a.path),r=await fetch(`https://${project}.supabase.co/storage/v1/object/public/collectibles/${a.path}`)
 if(!r.ok||hash(Buffer.from(await r.arrayBuffer()))!==hash(bytes))throw Error('Public image differs '+a.path)
 fs.writeFileSync(a.target,bytes);if(a.path.includes('swim8'))fs.copyFileSync(a.target,`public/aquarium/swim/${id}_swim8_v2_sprite.png`)
 Object.assign(a,{sha256:hash(bytes),uploaded:true,uploaded_project:project});verified.push({path:a.path,sha256:a.sha256,bytes:bytes.length})
}
const read="select id,kind,name,description,swim_y_min,swim_y_max,speed,size,rarity,thumbnail_path,sell_price,sprite_sheet_path,native_region_id,movement_type,flip_with_direction,travel_direction from public.collectible_species where id='pharaoh-gold-wing-horus'"
const history=await query(`select statements from supabase_migrations.schema_migrations where version='${version}'`)
if(history.length&&!history[0].statements.some(s=>norm(s)===norm(sql)))throw Error('Migration history differs')
if(!history.length){const rows=await query(read);if(rows.length!==1||Object.entries(prior.species).some(([k,v])=>String(v)!==String(rows[0][k])))throw Error('Catalog changed since preflight')}
if(process.argv[2]==='apply'&&!history.length){await query('begin;'+sql.replace(/^begin;\s*$/mg,'').replace(/^commit;\s*$/mg,'')+`\ninsert into supabase_migrations.schema_migrations(version,name,statements) values('${version}','${name}',array[${quote(sql)}]::text[]);commit;`,false)}
const rows=await query(read),registered=rows.length===1&&Object.entries(expected).every(([k,v])=>String(v)===String(rows[0][k]))
if(process.argv[2]==='apply'&&!registered)throw Error('Post-deploy mismatch')
if(registered)await query(`begin read only;set local role authenticated;do $verify$ begin if not exists(select 1 from public.collectible_species where id='${id}' and sprite_sheet_path=${quote(expected.sprite_sheet_path)}) then raise exception 'Horus catalog read failed';end if;end $verify$;rollback;`,false)
Object.assign(m,{uploaded:true,catalog_registered:registered,registered_project:project,registered_at:m.registered_at??(registered?new Date().toISOString():null),frontend_deployed:false,status:registered?'registered-frontend-local':'images-uploaded'})
fs.writeFileSync(batch+'/manifest.json',JSON.stringify(m,null,2)+'\n');fs.writeFileSync(batch+'/storage-verification.json',JSON.stringify({project,verified_at:new Date().toISOString(),files:verified},null,2)+'\n')
console.log(JSON.stringify({project,registered,path:rows[0]?.sprite_sheet_path,verifiedImages:verified.length,frontendDeployed:false}))
