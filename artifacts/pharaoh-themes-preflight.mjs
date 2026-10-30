import fs from 'node:fs'
import {query,project} from './pharaoh-remote.mjs'
const local=JSON.parse(fs.readFileSync('supabase/catalog/catalog.json','utf8')).aquarium_backgrounds,rows=await query('select id,name,price,image_path,tier from public.aquarium_backgrounds order by id')
if(rows.length!==local.length||local.some(s=>!rows.some(r=>Object.entries(s).every(([k,v])=>r[k]===v))))throw Error('Background catalog drift')
const functions=await query("select n.nspname schema,p.proname name,pg_get_functiondef(p.oid) definition from pg_proc p join pg_namespace n on n.oid=p.pronamespace where n.nspname in ('public','app_private') and p.proname in ('aquarium_state','aquarium_background')"),definitions=JSON.parse(fs.readFileSync('docs/db/local-schema.json','utf8')).structure.functions,norm=s=>s.replaceAll('\r\n','\n').trim()
if(functions.length!==4||functions.some(f=>!definitions.some(d=>d.schema===f.schema&&d.name===f.name&&norm(d.definition)===norm(f.definition))))throw Error('Background RPC drift')
fs.writeFileSync('.cache/pharaoh-themes-preflight.json',JSON.stringify({project,captured_at:new Date().toISOString(),backgrounds:rows,functions},null,2)+'\n')
console.log(JSON.stringify({project,backgrounds:rows.length,maxPrice:Math.max(...rows.map(r=>r.price)),rpcDefinitionsMatched:4}))
for(const [url,file] of [['https://supabase.com/changelog.md','.cache/supabase-changelog.md'],['https://supabase.com/docs/guides/storage/uploads/standard-uploads.md','.cache/supabase-storage-upload.md']]){const r=await fetch(url);if(!r.ok)throw Error('Docs unavailable');fs.writeFileSync(file,await r.text())}
