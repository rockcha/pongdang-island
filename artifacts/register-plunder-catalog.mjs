import fs from 'node:fs'
const root='assets/storage-upload/new/20261027-034411'
const manifest=JSON.parse(fs.readFileSync(`${root}/manifest.json`,'utf8'))
const descriptions=[
 '나무통 같은 몸무늬와 작은 지느러미를 가진 통통한 복어예요.',
 '밧줄처럼 꼬인 가느다란 꼬리 끝에 작은 매듭이 보여요.',
 '솔 같은 수염으로 바닥을 쓸며 선창 주변을 돌아다녀요.',
 '망원경처럼 솟은 두 눈으로 멀리서 오는 배를 살펴봐요.',
 '볼주머니에 작은 조개를 몰래 숨겨 둔 장난꾸러기 복어예요.',
 '검은 눈가 무늬와 수배전단 같은 등껍질이 눈에 띄는 작은 게예요.',
 '한쪽 다리가 나무 의족처럼 곧게 뻗은 씩씩한 게예요.',
 '돋보기 같은 집게 너머로 작은 보석을 들여다보는 새우예요.',
 '큰 눈 하나와 오래된 흉터 무늬를 지닌 느긋한 붕어예요.',
 '붉은 두건 같은 머리 주름과 짧게 말린 여덟 다리를 가진 문어예요.',
 '선원 같은 줄무늬와 붉은 등지느러미로 항로를 누비는 물고기예요.',
 '삼각 돛 같은 갓 아래로 짧은 돛줄 모양 촉수가 흔들려요.',
 '낡은 선원 양말 같은 줄무늬가 긴 몸을 따라 이어지는 곰치예요.',
 '포탄처럼 둥근 머리와 짧은 도화선 모양 볏을 지닌 오징어예요.',
 '날개 가장자리가 오래된 해도처럼 너덜너덜한 가오리예요.',
 '황동 금고 같은 등껍질에 작은 자물쇠 문양이 달린 거북이에요.',
 '두 집게가 짧은 해적 권총처럼 생긴 날쌘 딱총새우예요.',
 '삼각모를 닮은 넓은 등껍질과 긴 꼬리를 가진 투구게예요.',
 '몸을 부풀리면 동전 같은 둥근 비늘 무늬가 드러나는 복어예요.',
 '황동빛 가시 사이에 작은 보석빛 무늬를 품은 왕관 같은 성게예요.',
 '부서진 갑판과 기울어진 돛대를 등에 품은 오래된 바다거북이에요.',
 '묵직한 황동 함포 같은 두 집게로 해저를 지키는 바닷가재예요.',
 '진주와 은식기가 담긴 보물상자를 집으로 삼은 커다란 소라게예요.',
 '닻처럼 휜 수염과 붉은 망토 같은 지느러미를 가진 바다사자예요.',
 '양피지 같은 긴 몸에 붉은 항로와 보물 표시가 이어지는 뱀장어예요.',
 '붉은 돛 같은 지느러미와 유리 몸속의 낡은 검으로 침몰한 약속을 지키는 오징어예요.',
 '등의 빈 선장실에 등불을 밝힌 채 닻과 조타륜 같은 집게로 돌아올 주인을 기다려요.',
 '산호 왕관과 붉은 망토 지느러미를 두른 곰치왕이에요. 목 아래의 황금 열쇠를 지켜요.',
]
let fishIndex=0
for(const item of manifest.items)if(item.kind==='fish')item.description=descriptions[fishIndex++]
const catalogPath='supabase/catalog/catalog.json', catalog=JSON.parse(fs.readFileSync(catalogPath,'utf8'))
const existing=catalog.regions.find(r=>r.id==='plunder')
if(!existing)catalog.regions.push({...manifest.region})
const keys=Object.keys(catalog.collectible_species[0])
for(const item of manifest.items){
 const row=Object.fromEntries(keys.map(k=>[k,item[k]]))
 if(keys.some(k=>row[k]===undefined))throw Error(`Missing ${item.id}: ${keys.filter(k=>row[k]===undefined)}`)
 const found=catalog.collectible_species.find(s=>s.id===item.id)
 if(found)Object.assign(found,row);else catalog.collectible_species.push(row)
 if(!catalog.collectible_habitats.some(h=>h.species_id===item.id&&h.region_id==='plunder'))catalog.collectible_habitats.push({species_id:item.id,region_id:'plunder'})
}
const blueprint={region_id:'plunder',piece_count:4,thumbnail_path:'https://ewafafphiovbpjwogwzn.supabase.co/storage/v1/object/public/regions/plunder/map-v1.png',enabled:true,rarity:'rare'}
if(!catalog.fishing_map_blueprints.some(b=>b.region_id==='plunder'))catalog.fishing_map_blueprints.push(blueprint)
catalog.regions.sort((a,b)=>a.id.localeCompare(b.id));catalog.collectible_species.sort((a,b)=>a.id.localeCompare(b.id));catalog.collectible_habitats.sort((a,b)=>a.species_id.localeCompare(b.species_id)||a.region_id.localeCompare(b.region_id))
fs.writeFileSync(catalogPath,JSON.stringify(catalog,null,2)+'\n')
fs.writeFileSync(`${root}/manifest.json`,JSON.stringify(manifest,null,2)+'\n')
console.log(JSON.stringify({region:'plunder',species:manifest.items.length,mapPieces:4}))
