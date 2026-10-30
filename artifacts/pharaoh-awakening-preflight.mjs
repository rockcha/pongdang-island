import fs from 'node:fs'
import {query,project} from './pharaoh-remote.mjs'
const catalog=JSON.parse(fs.readFileSync('supabase/catalog/catalog.json','utf8')),local=catalog.collectible_species.filter(s=>s.native_region_id==='pharaoh'&&s.rarity==='mythic')
const rows=await query("select * from public.collectible_species where native_region_id='pharaoh' and rarity='mythic' order by id")
if(rows.length!==4||local.some(s=>{const r=rows.find(r=>r.id===s.id);return !r||Object.entries(s).some(([k,v])=>String(v)!==String(r[k]))}))throw Error('Mythic catalog drift')
fs.writeFileSync('.cache/pharaoh-awakening-preflight.json',JSON.stringify({project,captured_at:new Date().toISOString(),species:rows},null,2)+'\n')
console.log(JSON.stringify({project,matched:rows.length,movement:rows.map(s=>({id:s.id,movement:s.movement_type,y:[s.swim_y_min,s.swim_y_max]}))}))
