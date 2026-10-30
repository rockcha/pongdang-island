import fs from 'node:fs'
import {items} from './prepare-pharaoh-assets.mjs'
const p='supabase/catalog/catalog.json',c=JSON.parse(fs.readFileSync(p,'utf8'))
function upsert(table,row,key='id'){const n=c[table].findIndex(r=>r[key]===row[key]);if(n<0)c[table].push(row);else c[table][n]=row}
const special={
 'pharaoh-solar-scarab':'뜨거운 태양을 굴리며 황금해의 새벽을 여는 신성한 스카라베예요.',
 'pharaoh-gatekeeper-anubis':'금빛 지팡이를 든 아누비스가 잠든 왕릉의 문을 지켜요.',
 'pharaoh-obelisk-colossus':'모래 속에서 깨어난 거신이에요. 어깨 위 오벨리스크에 태양의 힘이 깃들었어요.',
 'pharaoh-gold-wing-horus':'황금 날개를 펼친 호루스가 눈부신 황금해를 굽어봐요.',
 'pharaoh-papyrus-seahorse':'파피루스 잎을 닮은 지느러미와 말린 꼬리를 살랑이는 작은 해마예요.',
 'pharaoh-mummy-eel':'오랜 잠에서 깨어나 석관 밖으로 고개를 내민 미라장어예요.',
}
for(const i of items){
  const description=special[i.id]??(i.kind==='trash'?`황금해의 모래 속에 남은 ${i.name}. 오래된 왕국의 흔적이 배어 있어요.`:i.kind==='decoration'?`황금해의 왕국을 닮은 ${i.name}. 따뜻한 모래빛과 금빛 장식이 어우러져요.`:`황금해에 사는 ${i.name}. ${i.movement_type==='crawl'?'금빛 모래바닥을 천천히 걸어 다녀요.':i.movement_type==='fixed'?'따뜻한 모래 위에서 조용히 쉬어요.':'햇살이 스며든 금빛 물결을 따라 움직여요.'}`)
 upsert('collectible_species',{id:i.id,kind:i.kind,name:i.name,description,swim_y_min:i.swim_y_min===null?null:String(i.swim_y_min),swim_y_max:i.swim_y_max===null?null:String(i.swim_y_max),speed:String(i.speed),size:i.kind==='trash'?36:i.kind==='decoration'?i.rarity==='epic'?125:i.rarity==='rare'?80:55:i.size,rarity:i.rarity,thumbnail_path:i.thumbnail_path,sell_price:i.sell_price,sprite_sheet_path:i.rarity==='mythic'?'fish/mythic/'+i.id+'_compat_v1_sprite.png':i.sprite_sheet_path,native_region_id:'pharaoh',movement_type:i.movement_type,flip_with_direction:i.flip_with_direction,travel_direction:i.travel_direction})
 if(!c.collectible_habitats.some(h=>h.species_id===i.id&&h.region_id==='pharaoh'))c.collectible_habitats.push({species_id:i.id,region_id:'pharaoh'})
}
upsert('regions',{id:'pharaoh',name:'파라오의 황금해',description:'황금빛 물결 너머로 모래 왕국의 피라미드와 오벨리스크가 솟아 있어요. 잠든 왕릉의 수호자들과 오래된 보물을 만나 보세요.',rarity:'epic',sort_order:17,image_path:'https://ewafafphiovbpjwogwzn.supabase.co/storage/v1/object/public/collectibles/regions/pharaoh/scenery-v1.png',requires_map_fragment:true})
upsert('fishing_map_blueprints',{region_id:'pharaoh',piece_count:4,thumbnail_path:'https://ewafafphiovbpjwogwzn.supabase.co/storage/v1/object/public/collectibles/regions/pharaoh/map-v1.png',enabled:true,rarity:'rare',piece_rarities:['rare','rare','epic','epic']},'region_id')
upsert('fishing_rods',{id:'pharaoh',name:'황금 태양 낚싯대',price:1800,region_id:'pharaoh',failure_reduction_bp:200,native_bonus_bp:200,wait_reduction_seconds:1})
for(const table of ['regions','collectible_species','fishing_rods'])c[table].sort((a,b)=>a.id<b.id?-1:a.id>b.id?1:0)
c.fishing_map_blueprints.sort((a,b)=>a.region_id.localeCompare(b.region_id))
c.collectible_habitats.sort((a,b)=>a.species_id.localeCompare(b.species_id)||a.region_id.localeCompare(b.region_id))
fs.writeFileSync(p,JSON.stringify(c,null,2)+'\n')
console.log('Prepared local Pharaoh catalog: 59 species, four map pieces and regional rod')
