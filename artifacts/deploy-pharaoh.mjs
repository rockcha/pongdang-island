import fs from 'node:fs'
import {createHash} from 'node:crypto'
import {query,project} from './pharaoh-remote.mjs'
const batch='assets/storage-upload/new/20261030-044000'
const catalog=JSON.parse(fs.readFileSync('supabase/catalog/catalog.json','utf8'))
const expected=catalog.collectible_species.filter(s=>s.native_region_id==='pharaoh')
const versions=[['20261029195739','per_piece_map_rarities'],['20261029200331','pharaoh_golden_sea_catalog']]
const quote=s=>"'"+s.replaceAll("'","''")+"'",norm=s=>s.replaceAll('\r\n','\n').trim(),hash=b=>createHash('sha256').update(b).digest('hex')
const [{rows:history}]=await query("select coalesce(jsonb_agg(jsonb_build_object('version',version,'statements',statements)),'[]') rows from supabase_migrations.schema_migrations where version in ('20261029195739','20261029200331')")
if(history.length!==0&&history.length!==2)throw Error('Partial migration state; inspect before continuing')
const applied=history.length===2
if(applied)for(const [version,name] of versions){const sql=fs.readFileSync(`supabase/migrations/${version}_${name}.sql`,'utf8');if(!history.find(h=>h.version===version)?.statements.some(s=>norm(s)===norm(sql)))throw Error('Migration history SQL differs')}
const before=await query("select id,name,description,rarity,sort_order,image_path,requires_map_fragment from public.regions order by id")
const prior=JSON.parse(fs.readFileSync('.cache/pharaoh-function-preflight.json','utf8'))
if(!applied){
 const current=await query("select n.nspname schema,p.proname name,pg_get_functiondef(p.oid) definition from pg_proc p join pg_namespace n on n.oid=p.pronamespace where n.nspname='app_private' and p.proname in ('fishing_discovery_candidates','fishing_map_piece_payload','region_map')")
 if(current.length!==3||current.some(f=>!prior.some(p=>p.schema===f.schema&&p.name===f.name&&norm(p.definition)===norm(f.definition))))throw Error('Map functions changed after preflight')
 const [{n}]=await query("select count(*)::int n from public.collectible_species where id like 'pharaoh-%' or native_region_id='pharaoh'")
 if(n||before.some(r=>r.id==='pharaoh'))throw Error('Pharaoh already exists without migration history')
}
const storage=JSON.parse(fs.readFileSync(batch+'/storage-verification.json','utf8'))
if(storage.project!==project||storage.count!==93||storage.files.some(f=>hash(fs.readFileSync(batch+'/'+f.path))!==f.sha256))throw Error('Missing final public image verification')
const raw=JSON.parse(fs.readFileSync(batch+'/raw-sprite-audit.json','utf8'))
if(raw.assets.length!==30||raw.assets.some(a=>!a.valid))throw Error('Unsafe original sprites')
for(const n of [4,8])if(JSON.parse(fs.readFileSync(batch+`/final-registered-${n}.json`,'utf8').replace(/^\uFEFF/,'' )).some(s=>s.frames.some(f=>f.dx||f.dy||f.rmse>60)))throw Error('Unsettled sprite anchor')
if(process.argv[2]==='apply'&&!applied){
 const sqls=versions.map(([v,n])=>({version:v,name:n,sql:fs.readFileSync(`supabase/migrations/${v}_${n}.sql`,'utf8').replaceAll('\r\n','\n')}))
 await query('begin;set local statement_timeout=\'45s\';\n'+sqls.map(s=>s.sql.replace(/^begin;\s*$/mg,'').replace(/^commit;\s*$/mg,'')+`\ninsert into supabase_migrations.schema_migrations(version,name,statements) values(${quote(s.version)},${quote(s.name)},array[${quote(s.sql)}]::text[]);`).join('\n')+'\ncommit;',false)
}
const rows=await query("select id,kind,name,description,swim_y_min,swim_y_max,speed,size,rarity,thumbnail_path,sell_price,sprite_sheet_path,native_region_id,movement_type,flip_with_direction,travel_direction from public.collectible_species where native_region_id='pharaoh' order by id")
const registered=rows.length===59&&expected.every(e=>rows.some(r=>Object.entries(e).every(([k,v])=>String(v)===String(r[k]))))
if(process.argv[2]==='apply'&&!registered)throw Error('Remote species verification failed')
let blueprint=null
if(registered){
 blueprint=(await query("select region_id,piece_count,rarity,piece_rarities,enabled,thumbnail_path from public.fishing_map_blueprints where region_id='pharaoh'"))[0]
 if(blueprint.piece_count!==4||JSON.stringify(blueprint.piece_rarities)!=='["rare","rare","epic","epic"]'||!blueprint.enabled)throw Error('Map setup mismatch')
 const [{n}]=await query("select count(*)::int n from public.collectible_habitats where region_id='pharaoh'");if(n!==59)throw Error('Missing habitats')
 const rod=(await query("select id,price,region_id,failure_reduction_bp,native_bonus_bp,wait_reduction_seconds from public.fishing_rods where id='pharaoh'"))[0]
 if(rod.price!==1800||rod.region_id!=='pharaoh')throw Error('Rod mismatch')
 await query("begin read only;set local role authenticated;do $verify$ begin if (select count(*) from public.collectible_species where native_region_id='pharaoh')<>59 then raise exception 'Catalog read failed';end if;end $verify$;rollback;",false)
 const m=JSON.parse(fs.readFileSync(batch+'/manifest.json','utf8'));Object.assign(m,{status:'db-registered-frontend-local',catalog_registered:true,registered_project:project,registered_at:m.registered_at??new Date().toISOString(),frontend_deployed:false});fs.writeFileSync(batch+'/manifest.json',JSON.stringify(m,null,2)+'\n')
 const releasesPath='src/features/regions/species-releases.json',releases=JSON.parse(fs.readFileSync(releasesPath,'utf8'));if(!releases.some(r=>r.speciesIds.some(id=>id.startsWith('pharaoh-')))){releases.unshift({releasedAt:m.registered_at,speciesIds:expected.map(i=>i.id)});fs.writeFileSync(releasesPath,JSON.stringify(releases,null,2)+'\n')}
}
const after=await query("select id,name,description,rarity,sort_order,image_path,requires_map_fragment from public.regions order by id")
if(before.filter(r=>r.id!=='pharaoh').some(r=>!after.some(a=>JSON.stringify(a)===JSON.stringify(r))))throw Error('Existing region changed')
console.log(JSON.stringify({project,phase:process.argv[2]??'preflight',registered,species:rows.length,blueprint,existingRegionsUnchanged:true,frontendDeployment:'local only'}))
