import fs from 'node:fs'
import {query} from './pharaoh-remote.mjs'
const q=await query("select n.nspname schema,p.proname name,pg_get_functiondef(p.oid) definition from pg_proc p join pg_namespace n on n.oid=p.pronamespace where n.nspname='app_private' and p.proname=any(array['fishing_discovery_candidates','fishing_map_piece_payload','region_map','validate_fishing_map_blueprint','fishing_rod_state','trade_fishing_rod'])")
const local=JSON.parse(fs.readFileSync('docs/db/local-schema.json')).structure.functions
const norm=s=>s.replaceAll('\r\n','\n').trim()
const drift=q.filter(f=>!local.some(l=>l.schema===f.schema&&l.name===f.name&&norm(l.definition)===norm(f.definition))).map(f=>f.name)
fs.writeFileSync('.cache/pharaoh-function-preflight.json',JSON.stringify(q,null,2))
console.log(JSON.stringify({functions:q.map(f=>f.name),drift}))
for(const url of ['https://supabase.com/changelog.md','https://supabase.com/docs/guides/storage/uploads/standard-uploads.md']){const r=await fetch(url),t=await r.text();fs.writeFileSync('.cache/'+(url.includes('changelog')?'supabase-changelog.md':'supabase-storage-upload.md'),t);console.log(url,r.status,t.slice(0,90))}
