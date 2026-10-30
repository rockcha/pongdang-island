import fs from 'node:fs'
import {query,project} from './pharaoh-remote.mjs'
const local=JSON.parse(fs.readFileSync('supabase/catalog/catalog.json','utf8')).regions.find(r=>r.id==='pharaoh')
const rows=await query("select * from public.regions where id='pharaoh'")
if(rows.length!==1||Object.entries(local).some(([k,v])=>String(v)!==String(rows[0][k])))throw Error('Region catalog drift; inspect before changes')
fs.writeFileSync('.cache/pharaoh-overview-preflight.json',JSON.stringify({project,captured_at:new Date().toISOString(),region:rows[0]},null,2)+'\n')
console.log(JSON.stringify({project,id:rows[0].id,image:rows[0].image_path,localMatches:true}))
for(const [url,file] of [['https://supabase.com/changelog.md','.cache/supabase-changelog.md'],['https://supabase.com/docs/guides/storage/uploads/standard-uploads.md','.cache/supabase-storage-upload.md']]){
 const r=await fetch(url);if(!r.ok)throw Error('Documentation HTTP '+r.status);fs.writeFileSync(file,await r.text())
}
