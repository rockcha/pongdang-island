import fs from 'node:fs'
import {createHash} from 'node:crypto'
import {query,project} from './pharaoh-remote.mjs'
const id='pharaoh-gold-wing-horus',local=JSON.parse(fs.readFileSync('supabase/catalog/catalog.json','utf8')).collectible_species.find(s=>s.id===id)
const rows=await query("select id,kind,name,description,swim_y_min,swim_y_max,speed,size,rarity,thumbnail_path,sell_price,sprite_sheet_path,native_region_id,movement_type,flip_with_direction,travel_direction from public.collectible_species where id='pharaoh-gold-wing-horus'")
if(rows.length!==1||Object.entries(local).some(([k,v])=>String(v)!==String(rows[0][k])))throw Error('Horus catalog drift; inspect before changing')
const r=await fetch(`https://${project}.supabase.co/storage/v1/object/public/collectibles/fish/mythic/${id}_swim8_v1_sprite.png`),bytes=Buffer.from(await r.arrayBuffer()),hash=b=>createHash('sha256').update(b).digest('hex')
if(!r.ok||hash(bytes)!==hash(fs.readFileSync(`public/aquarium/swim/${id}_swim8_v1_sprite.png`)))throw Error('Current public source differs from inspected sheet')
fs.writeFileSync('.cache/horus-preflight.json',JSON.stringify({project,captured_at:new Date().toISOString(),species:rows[0],source_sha256:hash(bytes)},null,2)+'\n')
console.log(JSON.stringify({project,id,path:rows[0].sprite_sheet_path,sourceMatches:true}))
const docs=await fetch('https://supabase.com/changelog.md');if(!docs.ok)throw Error('Cannot refresh Supabase changelog');fs.writeFileSync('.cache/supabase-changelog.md',await docs.text())
