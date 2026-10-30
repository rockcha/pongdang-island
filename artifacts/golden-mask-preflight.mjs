import fs from 'node:fs'
import {query,project} from './pharaoh-remote.mjs'
const local=JSON.parse(fs.readFileSync('supabase/catalog/catalog.json','utf8')).collectible_species.find(s=>s.id==='pharaoh-solar-scarab'),rows=await query("select * from public.collectible_species where id='pharaoh-solar-scarab'")
if(rows.length!==1||Object.entries(local).some(([k,v])=>String(v)!==String(rows[0][k])))throw Error('Catalog drift')
fs.writeFileSync('.cache/golden-mask-preflight.json',JSON.stringify({project,captured_at:new Date().toISOString(),species:rows[0]},null,2)+'\n')
console.log(JSON.stringify({project,id:local.id,name:local.name,sell_price:local.sell_price,movement:local.movement_type}))
for(const [url,file] of [['https://supabase.com/changelog.md','.cache/supabase-changelog.md'],['https://supabase.com/docs/guides/storage/uploads/standard-uploads.md','.cache/supabase-storage-upload.md']]){const r=await fetch(url);if(!r.ok)throw Error('Docs unavailable');fs.writeFileSync(file,await r.text())}
