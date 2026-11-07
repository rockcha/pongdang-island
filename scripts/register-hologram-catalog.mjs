import fs from 'node:fs'
import {batch,items,regionId,excludedDraftIds,scenePaths} from './prepare-hologram-assets.mjs'

const read=file=>JSON.parse(fs.readFileSync(file,'utf8'))
const manifest=read(`${batch}/manifest.json`)
const required=items.flatMap(i=>[i.thumbnail_path,i.sprite_sheet_path].filter(Boolean)).concat(scenePaths)
const missing=required.filter(file=>!fs.existsSync(`${batch}/${file}`))
if(missing.length)throw Error(`Complete artwork before catalog registration (${missing.length} missing): ${missing.join(', ')}`)
if(manifest.status!=='verified-for-release')throw Error('Review source alpha, sprite alignment, loops and mobile renderer before catalog registration')
const file='supabase/catalog/catalog.json',catalog=read(file)
// These IDs existed only in this unshipped local draft. No remote/player delete SQL.
for(const id of excludedDraftIds)if(catalog.collectible_species.some(s=>s.id===id&&s.native_region_id!==regionId))throw Error(`Unexpected published scope for excluded draft ${id}`)
catalog.collectible_species=catalog.collectible_species.filter(s=>!excludedDraftIds.includes(s.id))
catalog.collectible_habitats=catalog.collectible_habitats.filter(h=>!excludedDraftIds.includes(h.species_id))
const upsert=(table,row,key='id')=>{const n=catalog[table].findIndex(r=>r[key]===row[key]);if(n<0)catalog[table].push(row);else catalog[table][n]=row}
for(const i of items){
 upsert('collectible_species',{id:i.id,kind:i.kind,name:i.name,description:i.description,swim_y_min:i.swim_y_min===null?null:String(i.swim_y_min),swim_y_max:i.swim_y_max===null?null:String(i.swim_y_max),speed:i.speed,size:i.kind==='fish'?({common:56,rare:76,epic:110,mythic:165})[i.rarity]:i.kind==='trash'?36:i.rarity==='common'?55:i.rarity==='epic'?110:85,rarity:i.rarity,thumbnail_path:i.thumbnail_path,sell_price:i.sell_price,sprite_sheet_path:i.sprite_sheet_path,native_region_id:regionId,movement_type:i.movement_type,flip_with_direction:i.flip_with_direction,travel_direction:i.travel_direction,weather_type:null})
 if(!catalog.collectible_habitats.some(h=>h.species_id===i.id&&h.region_id===regionId))catalog.collectible_habitats.push({species_id:i.id,region_id:regionId})
}
const url='https://ewafafphiovbpjwogwzn.supabase.co/storage/v1/object/public/collectibles/'
upsert('regions',{id:regionId,name:'홀로그램 심해도시',description:'짙은 심해의 유리돔 아래 청록빛 기록과 자홍빛 환영이 흐르는 잠긴 미래도시. 네온 철도를 따라 데이터 생명체를 만나 보세요.',rarity:'epic',sort_order:20,image_path:url+'regions/hologram/overview-v1.png',requires_map_fragment:true})
upsert('fishing_map_blueprints',{region_id:regionId,piece_count:6,thumbnail_path:url+'regions/hologram/map-v1.png',enabled:true,rarity:'common',piece_rarities:['common','common','rare','rare','epic','epic']},'region_id')
upsert('fishing_rods',{id:regionId,name:'홀로그램 회로 낚싯대',price:2800,region_id:regionId,failure_reduction_bp:200,native_bonus_bp:200,wait_reduction_seconds:1})
for(const s of catalog.collectible_species.filter(s=>s.id.startsWith('shared-decor-')&&s.native_region_id===null)){
 if(!catalog.collectible_habitats.some(h=>h.species_id===s.id&&h.region_id===regionId))catalog.collectible_habitats.push({species_id:s.id,region_id:regionId})
}
const compare=(a,b)=>a<b?-1:a>b?1:0
for(const table of ['regions','collectible_species','fishing_rods'])catalog[table].sort((a,b)=>compare(a.id,b.id))
catalog.fishing_map_blueprints.sort((a,b)=>compare(a.region_id,b.region_id))
catalog.collectible_habitats.sort((a,b)=>compare(a.species_id,b.species_id)||compare(a.region_id,b.region_id))
fs.writeFileSync(file,JSON.stringify(catalog,null,2)+'\n')
console.log(JSON.stringify({region:regionId,species:items.length,remoteChanged:false}))
