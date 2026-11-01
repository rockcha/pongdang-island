import fs from 'node:fs'
import {batch,items} from './prepare-hangang-assets.mjs'
const file='supabase/catalog/catalog.json',catalog=JSON.parse(fs.readFileSync(file,'utf8'))
const descriptions={
 'taegeuk-minnow':'은빛 비늘 위에 태극과 건곤감리가 물결처럼 번지는 작은 피라미예요.',
 'red-devil-puffer':'응원의 열기를 머금으면 붉은 몸과 작은 뿔을 한껏 부풀려요.',
 'soju-shell-snail':'한강 바닥에서 주운 초록 소주병을 자기만의 집으로 삼은 고둥이에요.',
 'mugunghwa-shrimp':'무궁화 꽃잎을 닮은 꼬리를 펼치며 한강의 밤물을 가볍게 가르는 새우예요.',
 'hangeun-crab':'등에 작은 저울추를 짊어지고도 씩씩하게 걷는 든든한 게예요.',
 'bibimbap-octopus':'돌솥 같은 머리 위에 갖가지 색을 얹고 여덟 팔로 맛있는 물결을 만들어요.',
 'ramen-jellyfish':'따끈한 한강라면을 닮은 갓 아래로 꼬불꼬불한 면발 촉수가 춤춰요.',
 'dalgona-starfish':'달고나처럼 바삭한 금빛 몸에 작은 별무늬를 간직한 불가사리예요.',
 'onggi-conch':'옹기 뚜껑을 단단히 닫고 강바닥의 오래된 이야기를 담아 다녀요.',
 'kite-ray':'방패연 무늬의 지느러미와 긴 꼬리로 물속에서도 연날리기를 즐겨요.',
 'millstone-snail':'맷돌을 닮은 묵직한 집을 돌리며 바닥을 느긋하게 기어가요.',
 'puffed-rice-urchin':'뻥튀기 알갱이 같은 가시를 세우고 조용히 강바닥을 누벼요.',
 'jangseung-goby':'장승처럼 익살스러운 얼굴로 물가를 지키는 작은 망둑이에요.',
 'porcelain-seahorse':'백자에 그린 청화 무늬가 몸을 감싼 도자기빛 해마예요.',
 'talchum-puffer':'하회탈 같은 미소를 짓고 색동 리본을 흔들며 물속 탈춤을 추어요.',
 'janggu-turtle':'장구 모양의 등껍질로 물살의 장단을 타며 유영해요.',
 'hanbok-koi':'고운 한복 자락처럼 흐르는 지느러미와 단정한 옷고름이 자랑이에요.',
 'seonbi-koi':'검은 갓을 단정하게 쓰고 강물 위의 글귀를 읽는 선비 잉어예요.',
 'red-devil-squid':'붉은 응원 리본을 닮은 팔로 물살에 힘찬 박자를 새겨요.',
 'mugunghwa-butterflyfish':'무궁화 꽃무늬가 비단처럼 번지는 지느러미를 활짝 펼쳐요.',
 'tiger-catfish':'호랑이 줄무늬와 긴 수염을 갖춘 당당한 한강의 메기예요.',
 'pungmul-seabass':'상모와 오색 띠를 휘날리며 풍물 장단처럼 경쾌하게 헤엄쳐요.',
 'neon-hangul-bream':'밤물이 짙어지면 비늘 사이의 한글 자모가 네온처럼 빛나요.',
 'pine-turtle':'등껍질에 뿌리내린 소나무와 함께 오랜 강의 계절을 건너왔어요.',
 'silla-crown-jellyfish':'신라 금관을 닮은 금빛 가지와 곡옥을 이고 천천히 맥동해요.',
 'incense-seahorse':'백제 금동대향로의 산과 봉황을 닮은 몸에 고요한 빛을 간직했어요.',
 'seven-branched-blade':'여섯 곁가지와 하나의 긴 칼끝을 지닌 고대의 검이 강물에서 다시 깨어났어요.',
 'moon-white-tiger':'달그림자를 두른 백호가 물결 속에서도 산군의 위엄을 잃지 않아요.',
 'celadon-sea-dragon':'비취빛 청자와 상감 구름 무늬로 빚어진 해룡이 밤강을 누벼요.',
 'taegeuk-twin-fish':'붉은 잉어와 푸른 잉어가 서로의 물길을 감싸며 한 쌍의 태극을 이루어요.',
 'mago-creator':'산과 강을 빚었다는 마고가 두 손에 작은 산하를 품고 한강을 바라봐요.',
 'haetae-guardian':'옳고 그름을 살피는 해태가 서울의 밤과 물길을 든든하게 지켜요.',
 'millennial-gumiho':'천 년의 달빛을 아홉 꼬리에 모은 구미호가 여우구슬을 품고 나타나요.',
 'dokdo-guardian':'동도와 서도를 닮은 두 봉우리를 등에 품고 우리 바다의 물결을 지켜요.',
 'iron-eater-bulgasari':'쇠를 먹을수록 단단해진다는 전설의 짐승이에요. 바다의 별 불가사리와는 다른 존재예요.',
 'immortal-turtle-ship':'수많은 파도를 막아 낸 조선의 거북선이 불멸의 방패가 되어 되살아났어요.',
 'hunmin-spirit':'펼쳐진 훈민정음 해례본에서 태어난 빛의 정령이에요. 스물여덟 글자의 빛이 책 주위를 따로 맴돌아요.',
 'ungnyeo-mother':'쑥과 마늘, 인내와 온기를 품은 시조신모 웅녀예요. 곰의 별빛과 새싹이 곁을 지켜요.',
 'red-cheer-incarnation':'붉은 응원의 불꽃과 북소리가 모여 탄생한 거대한 정령이에요. 북을 두드릴 때마다 함성의 물결이 퍼져요.',
}
const upsert=(rows,row,key='id')=>{const at=rows.findIndex(v=>v[key]===row[key]);if(at<0)rows.push(row);else rows[at]=row}
const regionTemplate=catalog.regions.find(r=>r.id==='pharaoh'),publicArt='https://ewafafphiovbpjwogwzn.supabase.co/storage/v1/object/public/collectibles/regions/hangang/'
upsert(catalog.regions,{...regionTemplate,id:'hangang',name:'한강의 불빛나루',description:'서울의 별빛과 한옥의 등불이 한강 위에서 만나요. 태극의 물결을 따라 한국의 이야기와 보물을 찾아보세요.',sort_order:Math.max(...catalog.regions.filter(r=>r.id!=='hangang').map(r=>r.sort_order))+1,image_path:publicArt+'overview-v1.png'})
upsert(catalog.fishing_map_blueprints,{...catalog.fishing_map_blueprints.find(r=>r.region_id==='pharaoh'),region_id:'hangang',piece_count:6,thumbnail_path:publicArt+'map-v1.png',rarity:'common',piece_rarities:['common','common','rare','rare','epic','epic']},'region_id')
upsert(catalog.fishing_rods,{...catalog.fishing_rods.find(r=>r.id==='pharaoh'),id:'hangang',name:'태극 물결 낚싯대',price:2500,region_id:'hangang'})
for(const item of items){
 const template=catalog.collectible_species.find(r=>r.native_region_id==='pharaoh'&&r.kind===item.kind)
 const row={...template}
 for(const key of Object.keys(row))if(Object.hasOwn(item,key))row[key]=['speed','swim_y_min','swim_y_max'].includes(key)&&item[key]!==null?String(item[key]):item[key]
 row.description=descriptions[item.id.replace('hangang-','')]??(item.kind==='decoration'?`한국의 풍경과 문화를 담은 ${item.name}. 물속에서도 고유한 모습과 오래된 이야기를 간직하고 있어요.`:`한강의 물결 사이에서 발견한 ${item.name}. 오랜 세월의 흔적이 남아 있지만 작은 수집 가치는 지니고 있어요.`)
 if(item.frames===8)row.sprite_sheet_path=`fish/mythic/${item.id}_compat_v1_sprite.png`
 upsert(catalog.collectible_species,row)
 if(!catalog.collectible_habitats.some(h=>h.species_id===item.id&&h.region_id==='hangang'))catalog.collectible_habitats.push({species_id:item.id,region_id:'hangang'})
}
const compare=(a,b)=>a<b?-1:a>b?1:0
for(const table of ['regions','fishing_rods','collectible_species'])catalog[table].sort((a,b)=>compare(a.id,b.id))
catalog.fishing_map_blueprints.sort((a,b)=>compare(a.region_id,b.region_id))
catalog.collectible_habitats.sort((a,b)=>compare(a.species_id,b.species_id)||compare(a.region_id,b.region_id))
fs.writeFileSync(file,JSON.stringify(catalog,null,2)+'\n')
if(process.argv.includes('--release')){
 const path='src/features/regions/species-releases.json',releases=JSON.parse(fs.readFileSync(path,'utf8'))
 if(!releases.some(r=>r.speciesIds.includes(items[0].id)))releases.unshift({releasedAt:new Date().toISOString(),speciesIds:items.map(i=>i.id)})
 fs.writeFileSync(path,JSON.stringify(releases,null,2)+'\n')
}
console.log(JSON.stringify({region:'hangang',species:items.length,mapPieces:6,rodPrice:2500,batch}))
