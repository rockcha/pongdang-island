import fs from 'node:fs'
import {query,project} from './pharaoh-remote.mjs'
const data={project,captured_at:new Date().toISOString(),species:await query("select id,sprite_sheet_path from public.collectible_species where native_region_id='pharaoh' and rarity='mythic' order by id"),regions:await query("select id,image_path from public.regions where id='pharaoh'"),blueprints:await query("select region_id,thumbnail_path from public.fishing_map_blueprints where region_id='pharaoh'")}
if(data.species.length!==4||data.regions.length!==1||data.blueprints.length!==1)throw Error('Unexpected Pharaoh catalog state')
fs.writeFileSync('.cache/pharaoh-compatible-before.json',JSON.stringify(data,null,2)+'\n')
console.log(JSON.stringify(data))
