import fs from 'node:fs'
import {createHash} from 'node:crypto'
import {query,project} from './pharaoh-remote.mjs'
const b='assets/storage-upload/new/20261030-044000',version='20261029203958',name='pharaoh_compatible_art_paths',hash=b=>createHash('sha256').update(b).digest('hex'),q=s=>"'"+s.replaceAll("'","''")+"'"
const c=JSON.parse(fs.readFileSync('supabase/catalog/catalog.json','utf8')),m=JSON.parse(fs.readFileSync(b+'/manifest.json','utf8'))
const verified=[]
for(const s of c.collectible_species.filter(s=>s.native_region_id==='pharaoh'&&s.rarity==='mythic')){
 const key=s.sprite_sheet_path,bytes=fs.readFileSync('.cache/pharaoh-compatible-upload/'+key),r=await fetch(`https://${project}.supabase.co/storage/v1/object/public/collectibles/${key}`)
 if(!r.ok||hash(Buffer.from(await r.arrayBuffer()))!==hash(bytes))throw Error('Compatibility bytes differ '+key)
 fs.writeFileSync(b+'/'+key,bytes)
 const a=m.assets.find(a=>a.path===key);Object.assign(a,{sha256:hash(bytes),uploaded:true,uploaded_project:project,storage_path:key});verified.push({path:key,sha256:hash(bytes),bytes:bytes.length})
}
const [{applied}]=await query(`select exists(select 1 from supabase_migrations.schema_migrations where version='${version}') applied`)
if(!applied){const before=JSON.parse(fs.readFileSync('.cache/pharaoh-compatible-before.json'));const now=await query("select id,sprite_sheet_path from public.collectible_species where native_region_id='pharaoh' and rarity='mythic' order by id");if(JSON.stringify(now)!==JSON.stringify(before.species))throw Error('Mythic paths changed after preflight')}
if(process.argv[2]==='apply'&&!applied){const sql=fs.readFileSync(`supabase/migrations/${version}_${name}.sql`,'utf8').replaceAll('\r\n','\n');await query('begin;'+sql.replace(/^begin;\s*$/mg,'').replace(/^commit;\s*$/mg,'')+`\ninsert into supabase_migrations.schema_migrations(version,name,statements) values('${version}','${name}',array[${q(sql)}]::text[]);commit;`,false)}
const rows=await query("select id,sprite_sheet_path from public.collectible_species where native_region_id='pharaoh' and rarity='mythic' order by id")
const region=(await query("select r.image_path,b.thumbnail_path from public.regions r join public.fishing_map_blueprints b on b.region_id=r.id where r.id='pharaoh'"))[0]
const ready=rows.every(r=>r.sprite_sheet_path===c.collectible_species.find(s=>s.id===r.id).sprite_sheet_path)&&region.image_path===c.regions.find(r=>r.id==='pharaoh').image_path&&region.thumbnail_path===c.fishing_map_blueprints.find(r=>r.region_id==='pharaoh').thumbnail_path
if(process.argv[2]==='apply'&&!ready)throw Error('Compatibility catalog verification failed')
fs.writeFileSync(b+'/compatibility-storage-verification.json',JSON.stringify({project,verified_at:new Date().toISOString(),files:verified},null,2)+'\n')
m.compatibility_catalog_registered=ready;m.compatibility_note='DB paths provide 2x2 basic poses for previous clients; new client resolves same species to local eight-pose action assets.';fs.writeFileSync(b+'/manifest.json',JSON.stringify(m,null,2)+'\n')
console.log(JSON.stringify({project,ready,compatibleImages:verified.length,publicRegionArt:5,frontendDeployment:'not performed'}))
