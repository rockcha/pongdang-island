import {readFileSync,writeFileSync,existsSync} from 'node:fs'
import {items,batch} from './prepare-galaxy-assets.mjs'
import {themes,scenes} from './galaxy-scene-specs.mjs'
const required=[...items.flatMap(i=>[i.thumbnail_path,i.sprite_sheet_path].filter(Boolean)),...scenes.map(s=>s.path)]
const missing=required.filter(p=>!existsSync(`${batch}/${p}`))
if(missing.length)throw Error(`Artwork incomplete (${missing.length}): ${missing.join(', ')}`)
const manifest=JSON.parse(readFileSync(`${batch}/manifest.json`,'utf8'))
if(manifest.status!=='verified-for-release')throw Error('Complete raw/final sprite registration and renderer review before catalog registration')
const file='supabase/catalog/catalog.json',catalog=JSON.parse(readFileSync(file,'utf8'))
const upsert=(table,row,key='id')=>{const n=catalog[table].findIndex(r=>r[key]===row[key]);if(n<0)catalog[table].push(row);else catalog[table][n]=row}
for(const i of items){
 const fixed=i.movement_type==='fixed'
 upsert('collectible_species',{id:i.id,kind:i.kind,name:i.name,description:i.description,swim_y_min:i.swim_y_min===null?null:String(i.swim_y_min),swim_y_max:i.swim_y_max===null?null:String(i.swim_y_max),speed:i.speed,size:i.kind==='fish'?({common:56,rare:76,epic:110,mythic:165})[i.rarity]:i.kind==='trash'?36:i.rarity==='common'?55:85,rarity:i.rarity,thumbnail_path:i.thumbnail_path,sell_price:i.sell_price,sprite_sheet_path:i.sprite_sheet_path,native_region_id:'galaxy',movement_type:i.movement_type,flip_with_direction:i.flip_with_direction,travel_direction:i.travel_direction,weather_type:null})
 if(!catalog.collectible_habitats.some(h=>h.species_id===i.id&&h.region_id==='galaxy'))catalog.collectible_habitats.push({species_id:i.id,region_id:'galaxy'})
}
const publicUrl='https://ewafafphiovbpjwogwzn.supabase.co/storage/v1/object/public/collectibles/'
upsert('regions',{id:'galaxy',name:'은하수의 끝자락',description:'검은 우주와 은빛 물결이 만나는 고요한 끝자락. 달빛 나루에서 행성과 별의 이야기를 품은 생명들을 만나 보세요.',rarity:'epic',sort_order:19,image_path:publicUrl+'regions/galaxy/overview-v1.png',requires_map_fragment:true})
upsert('fishing_map_blueprints',{region_id:'galaxy',piece_count:6,thumbnail_path:publicUrl+'regions/galaxy/map-v1.png',enabled:true,rarity:'rare',piece_rarities:['rare','rare','rare','epic','epic','epic']},'region_id')
upsert('fishing_rods',{id:'galaxy',name:'은하 궤도 낚싯대',price:2800,region_id:'galaxy',failure_reduction_bp:200,native_bonus_bp:200,wait_reduction_seconds:1})
for(const t of themes)upsert('aquarium_backgrounds',{id:t.id,name:t.name,price:t.price,image_path:`${t.id}-panorama-v1.png`,tier:t.tier})
const compare=(a,b)=>a<b?-1:a>b?1:0
for(const table of ['regions','collectible_species','fishing_rods','aquarium_backgrounds'])catalog[table].sort((a,b)=>compare(a.id,b.id))
catalog.fishing_map_blueprints.sort((a,b)=>compare(a.region_id,b.region_id))
catalog.collectible_habitats.sort((a,b)=>compare(a.species_id,b.species_id)||compare(a.region_id,b.region_id))
writeFileSync(file,JSON.stringify(catalog,null,2)+'\n')
console.log(JSON.stringify({region:'galaxy',species:items.length,themes:themes.length}))
