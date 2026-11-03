import fs from 'node:fs'
import path from 'node:path'
import {fileURLToPath} from 'node:url'
const batch=path.dirname(fileURLToPath(import.meta.url))
const manifest=JSON.parse(fs.readFileSync(path.join(batch,'manifest.json'),'utf8'))
const descriptions={
 'round-sandfish':'모래빛 동글한 몸에 작은 점무늬가 콕콕 박힌 도루묵. 짧은 꼬리와 부드러운 등지느러미를 살랑이며 헤엄친다.',
 'flattened-otter-plush':'물에 젖어 납작해진 해달 봉제인형. 축 처진 팔다리와 덧댄 천 아래로 작은 미소가 남아 있다.',
 'unstuffed-seahorse-plush':'배의 봉제선 사이로 솜이 조금 빠져나온 민트빛 해마 인형. 구부러진 꼬리까지 여전히 포근하다.',
 'worn-seal-plush':'물살에 떠밀려 조금 꼬질해진 연보라색 물개 인형. 동그란 눈과 덧댄 천이 정겨운 표정을 만든다.',
 'baby-blenny':'아직 작은 베도라치. 길쭉한 몸의 갈색 무늬와 눈 위의 짧은 돌기를 뽐내며 꼬리를 살랑인다.',
 'pearlspot-wrasse':'민트빛 등과 산호빛 줄무늬 사이로 진주색 점이 이어진 놀래기. 부채꼴 꼬리를 부드럽게 흔들며 헤엄친다.'
}
const file='supabase/catalog/catalog.json',catalog=JSON.parse(fs.readFileSync(file,'utf8'))
for(const item of manifest.items){
 if(!fs.existsSync(path.join(batch,item.thumbnail_path))||(item.frames===4&&!fs.existsSync(path.join(batch,item.sprite_sheet_path))))throw Error('Incomplete final art')
 const row={id:item.id,kind:item.kind,name:item.name,description:descriptions[item.id],swim_y_min:String(item.swim_y_min),swim_y_max:String(item.swim_y_max),speed:String(item.speed),size:item.size,rarity:item.rarity,thumbnail_path:item.thumbnail_path,sell_price:item.price,sprite_sheet_path:item.sprite_sheet_path,native_region_id:null,movement_type:item.movement_type,flip_with_direction:item.flip_with_direction,travel_direction:item.travel_direction}
 const existing=catalog.collectible_species.find(r=>r.id===item.id)
 if(existing&&existing.name!==item.name)throw Error('Catalog ID already in use: '+item.id)
 if(existing)Object.assign(existing,row)
 else catalog.collectible_species.push(row)
 for(const region of catalog.regions)if(!catalog.collectible_habitats.some(h=>h.species_id===item.id&&h.region_id===region.id))catalog.collectible_habitats.push({species_id:item.id,region_id:region.id})
}
catalog.collectible_species.sort((a,b)=>a.id.localeCompare(b.id))
catalog.collectible_habitats.sort((a,b)=>a.species_id.localeCompare(b.species_id)||a.region_id.localeCompare(b.region_id))
fs.writeFileSync(file,JSON.stringify(catalog,null,2)+'\n')
console.log({species:manifest.items.length,habitats:manifest.items.length*catalog.regions.length})
