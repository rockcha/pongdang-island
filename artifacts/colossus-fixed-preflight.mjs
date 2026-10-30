import fs from 'node:fs'
import {query,project} from './pharaoh-remote.mjs'
const local=JSON.parse(fs.readFileSync('supabase/catalog/catalog.json','utf8')).collectible_species.find(s=>s.id==='pharaoh-obelisk-colossus'),rows=await query("select * from public.collectible_species where id='pharaoh-obelisk-colossus'")
if(rows.length!==1||Object.entries(local).some(([k,v])=>String(v)!==String(rows[0][k])))throw Error('Colossus catalog drift')
fs.writeFileSync('.cache/colossus-fixed-preflight.json',JSON.stringify({project,captured_at:new Date().toISOString(),species:rows[0]},null,2)+'\n')
console.log(JSON.stringify({project,id:local.id,movement:local.movement_type,y:[local.swim_y_min,local.swim_y_max],speed:local.speed}))
