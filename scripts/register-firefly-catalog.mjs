import {readFileSync,writeFileSync,existsSync} from 'node:fs'
import {batch,items} from './prepare-firefly-assets.mjs'

const file='supabase/catalog/catalog.json'
const catalog=JSON.parse(readFileSync(file,'utf8'))
const upsert=(table,row,key='id')=>{
 const at=catalog[table].findIndex(r=>r[key]===row[key])
 if(at<0)catalog[table].push(row);else catalog[table][at]=row
}
const descriptions={
 'leaf-medaka':'잎사귀 꼬리를 살랑이며 요정 마을의 얕은 물길을 헤엄쳐요.',
 'acorn-puffer':'도토리 모자를 꼭 눌러쓴 복어예요. 통통한 배에 햇살 같은 꿀빛이 담겼어요.',
 'honey-guppy':'꿀방울처럼 맑은 꼬리를 펼치며 꽃향기 나는 여울을 누벼요.',
 'petal-bitterling':'살구빛 꽃잎 지느러미가 물결에 부드럽게 흔들려요.',
 'sprout-minnow':'머리 위의 작은 새싹을 흔들며 풀숲 사이를 빠르게 지나가요.',
 'clover-platy':'주황빛 몸 뒤로 초록 클로버 꼬리가 둥글게 펼쳐져요.',
 'willow-loach':'버들잎 무늬를 두른 긴 몸으로 바닥 가까운 물길을 따라가요.',
 'moss-goby':'이끼 같은 얼룩을 두른 망둑이에요. 둥근 돌 옆에서 쉬기를 좋아해요.',
 'bud-goldfish':'꽃봉오리처럼 오동통한 금붕어가 꽃잎 꼬리를 조심스레 펼쳐요.',
 'daisy-medaka':'하얀 데이지 꼬리와 노란 볼을 가진 작은 물가 친구예요.',
 'dandelion-guppy':'민들레 솜털 같은 흰 꼬리가 물살을 따라 부드럽게 퍼져요.',
 'grass-seed-anchovy':'은빛 옆구리에 풀씨 무늬가 콕콕 박힌 작은 멸치예요.',
 'pinecone-carp':'솔방울을 닮은 둥근 비늘이 겹겹이 몸을 감싸고 있어요.',
 'waterlily-fry':'분홍빛 작은 몸에 수련잎 같은 초록 지느러미가 돋아 있어요.',
 'mushroom-sculpin':'버섯 모자 무늬가 있는 둑중개예요. 넓은 지느러미로 바닥 가까이 헤엄쳐요.',
 'firefly-lanternfish':'꼬리 끝의 작은 빛으로 해 질 녘 마을 물길을 밝혀요.',
 'flower-cloak-seahorse':'분홍 꽃망토를 두른 해마예요. 말린 꼬리 끝에 꽃봉오리가 달렸어요.',
 'waterlily-jellyfish':'수련잎 우산을 오므렸다 펴며 꽃술 촉수를 살랑거려요.',
 'leaf-wing-guppy':'잎맥이 비치는 맑은 지느러미가 물속의 작은 날개 같아요.',
 'clover-postfish':'클로버 모자를 쓴 물고기예요. 잎사귀 가방에 꽃편지를 담고 다녀요.',
 'willow-ribbon-pipefish':'가는 몸을 따라 늘어진 버들잎 리본이 물결에 나풀거려요.',
 'acorn-lantern-hermit':'도토리 집 앞에 꽃등을 켜고 여울 바닥을 또각또각 걸어요.',
 'flower-letter-batfish':'접힌 꽃편지 같은 지느러미와 작은 꽃봉인 무늬를 지녔어요.',
 'clover-ray':'네잎클로버처럼 둥근 몸을 펼치고 초록 물길을 미끄러져요.',
 'woodgrain-turtle':'나이테 무늬 등껍질 가장자리에 작은 잎들이 돋아난 거북이에요.',
 'lantern-keeper-fairy':'해 질 무렵 꽃등을 들고 마을의 불을 하나씩 밝히는 다정한 요정이에요.',
 'acorn-warden-fairy':'도토리 모자를 쓴 숲지기가 잎망토를 펄럭이며 마을을 살펴요.',
 'waterlily-dancer-fairy':'물결에 맞춰 춤을 추면 수련 꽃잎 드레스가 부드럽게 펼쳐져요.',
 'clover-luck-fairy':'커다란 클로버 양산 아래에서 오늘의 작은 행운을 나눠 줘요.',
 'flower-post-fairy':'꽃편지가 든 가방을 메고 잎지붕 집집마다 안부를 전해요.',
 'mushroom-child-fairy':'버섯 모자와 작은 장화를 신은 꼬마예요. 가방 창문에 따뜻한 빛이 켜져요.',
 'honey-teahouse-fairy':'꽃잎 찻잔에 향긋한 차를 담아 마을 손님을 맞이하는 요정이에요.',
 'evening-lullaby-fairy':'달맞이꽃 모자를 쓰고 작은 씨앗 하프로 마을의 밤을 재워요.',
 'millennium-lantern-queen':'마을 최초의 반딧불이 잠든 천년의 꽃등을 소중히 품은 여왕이에요.',
 'village-elder-turtle':'고목과 작은 요정 마을을 등에 업고 천천히 여울을 지나는 오랜 수호자예요.',
 'flower-dream-queen':'수련 꽃봉오리 왕좌에 앉아 꽃들이 편히 잠들도록 밤을 돌보는 여왕이에요.',
 'first-firefly-spirit':'여울의 모든 반딧불에게 처음 빛을 나누어 주었다는 오래된 정령이에요.',
}
const objectDescriptions={
 'broken-acorn-cup':'가장자리와 손잡이가 깨진 작은 도토리 찻잔이에요.',
 'torn-leaf-umbrella':'벌레 먹은 잎사귀와 휘어진 가지 손잡이가 남은 우산이에요.',
 'spent-firefly-lantern':'불빛이 꺼지고 꽃잎 덮개가 축 늘어진 빈 초롱이에요.',
 'tangled-grass-thread':'마른 풀실 사이에 작은 잎 조각이 엉켜 있어요.',
 'wet-flower-letter':'물에 젖어 글씨가 번진 꽃편지예요. 풀줄기 매듭도 풀렸어요.',
 'single-petal-shoe':'끝이 조금 해진 꽃잎 신발 한 짝이에요.',
 'cracked-honey-pot':'금이 간 작은 꿀단지예요. 잎사귀 뚜껑이 비뚤게 얹혔어요.',
 'faded-fairy-invitation':'꽃가루 장식이 희미하게 남은 오래된 꽃잎 초대장이에요.',
 'cracked-dew-perfume':'은방울꽃 마개 아래 이슬 한 방울이 남은 금 간 향수병이에요.',
 'broken-flower-lamp-staff':'가지가 부러져 꽃봉오리 등이 꺼진 작은 지팡이예요.',
 'untied-flower-mask':'마른 꽃잎 가면이에요. 한쪽 풀줄기 끈이 끊어져 있어요.',
 'torn-leaf-map':'잎맥 물길이 그려졌지만 모서리가 뜯겨 나간 낡은 지도예요.',
 'acorn-teacups':'커다란 잎사귀 받침 위에 작은 도토리 찻잔 두 개가 놓였어요.',
 'mushroom-stool':'둥근 버섯 갓 위에 초록 잎방석을 올린 작은 의자예요.',
 'pebble-flowerpot':'속이 팬 조약돌 안에서 작은 들꽃들이 자라고 있어요.',
 'grass-thread-basket':'덩굴 바구니에 연두색 풀실과 나무 실패가 담겨 있어요.',
 'acorn-signpost':'도토리 장식 아래 잎사귀 방향판이 달린 작은 이정표예요.',
 'moss-stump-table':'나이테가 보이는 낮은 그루터기 탁자예요. 가장자리에 이끼가 자라요.',
 'leafroof-acorn-house':'잎사귀 지붕 아래 둥근 문과 꿀빛 창문이 있는 포근한 도토리집이에요.',
 'firefly-flower-lamppost':'휘어진 가지 끝의 꽃등이 따뜻한 반딧불빛을 밝혀요.',
 'moss-arch-bridge':'덩굴과 작은 꽃이 난간을 감싼 낮은 아치 나무다리예요.',
 'honey-acorn-teahouse':'잎사귀 차양 아래 열린 창가에 도토리 찻잔이 놓인 찻집이에요.',
 'lily-bell-tower':'작은 나무 틀에 크기가 다른 하얀 은방울꽃 세 송이가 달렸어요.',
 'leafboat-dock':'짧은 나무 선착장에 꽃잎 방석을 깐 잎사귀 배가 매여 있어요.',
 'fairy-village-mailbox':'꽃편지가 꽂힌 도토리 우편함 옆에서 작은 꽃등이 빛나요.',
 'waterlily-pavilion':'넓은 수련잎 지붕 아래 나무 의자 두 개와 작은 찻상이 있어요.',
}
for(const item of items){
 // Local catalog validation can run while image generation continues. Release
 // verification must require every referenced image before any remote writes.
 const slug=item.id.slice(8),size=item.kind==='fish'?({common:56,rare:76,epic:110,mythic:165})[item.rarity]:item.kind==='trash'?36:item.rarity==='common'?55:85
 upsert('collectible_species',{
  id:item.id,kind:item.kind,name:item.name,description:descriptions[slug]??objectDescriptions[slug],
  swim_y_min:item.swim_y_min===null?null:String(item.swim_y_min),swim_y_max:item.swim_y_max===null?null:String(item.swim_y_max),
  speed:item.kind==='trash'?'0.001':item.movement_type==='fixed'?'0':item.movement_type==='crawl'?'0.012':item.movement_type==='pulse'?'0.014':'0.024',size,rarity:item.rarity,thumbnail_path:item.thumbnail_path,sell_price:item.sell_price,sprite_sheet_path:item.sprite_sheet_path,native_region_id:'firefly',movement_type:item.movement_type,flip_with_direction:item.flip_with_direction,travel_direction:item.travel_direction,
 })
 if(!catalog.collectible_habitats.some(h=>h.species_id===item.id&&h.region_id==='firefly'))catalog.collectible_habitats.push({species_id:item.id,region_id:'firefly'})
}
upsert('regions',{id:'firefly',name:'반딧불 요정여울',description:'잎지붕 도토리집과 작은 나무다리가 이어진 포근한 여울. 꿀빛 반딧불을 따라 요정 마을의 친구들을 만나 보세요.',rarity:'epic',sort_order:16,image_path:'/regions/firefly/scenery-v1.png',requires_map_fragment:true})
upsert('fishing_map_blueprints',{region_id:'firefly',piece_count:8,thumbnail_path:'/regions/firefly/map-v1.png',enabled:true,rarity:'rare'},'region_id')
upsert('fishing_rods',{id:'firefly',name:'반딧불 꽃등 낚싯대',price:1800,region_id:'firefly',failure_reduction_bp:200,native_bonus_bp:200,wait_reduction_seconds:1})
if(catalog.collectible_species.some(s=>s.id.startsWith('firefly-')&&!s.description))throw Error('Missing species description')
const compare=(a,b)=>a<b?-1:a>b?1:0
for(const table of ['regions','collectible_species','fishing_rods'])catalog[table].sort((a,b)=>compare(a.id,b.id))
catalog.fishing_map_blueprints.sort((a,b)=>compare(a.region_id,b.region_id))
catalog.collectible_habitats.sort((a,b)=>compare(a.species_id,b.species_id)||compare(a.region_id,b.region_id))
writeFileSync(file,JSON.stringify(catalog,null,2)+'\n')
console.log(JSON.stringify({region:'firefly',species:items.length,pieces:8,pendingArtwork:items.filter(i=>!existsSync(batch+'/'+i.thumbnail_path)||(i.sprite_sheet_path&&!existsSync(batch+'/'+i.sprite_sheet_path))).map(i=>i.id)}))
