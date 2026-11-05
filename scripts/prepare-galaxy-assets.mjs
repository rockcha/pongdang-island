import {mkdirSync,existsSync,readFileSync,writeFileSync} from 'node:fs'

export const batch='assets/storage-upload/new/20261105-033000'
// Creative specification. Catalog registration is gated on completed artwork.
const groups=[
 ['fish','common',60,`
stardust-anchovy|별가루 멸치|몸속에 작은 별가루가 반짝이는 은빛 멸치|swim
moon-crab|달조각 게|달 표면처럼 분화구가 있는 등껍질을 가진 게|crawl
meteor-puffer|운석 복어|울퉁불퉁한 운석처럼 생긴 둥근 복어|swim
galactic-jellyfish|은하 해파리|투명한 갓 안에 작은 은하가 회전하는 해파리|pulse
saturn-whelk|토성고둥|껍데기 주변에 토성처럼 고리가 떠 있는 고둥|crawl
comet-shrimp|혜성 새우|움직일 때마다 꼬리에서 빛나는 입자가 흩날리는 새우|swim
cosmic-starfish|우주 불가사리|다섯 팔 끝에 각각 작은 별이 달린 불가사리|crawl
moonlight-seahorse|달빛 해마|초승달 모양의 꼬리를 가진 푸른 해마|swim
nebula-ray|성운 가오리|날개에 보라색 성운 무늬가 흐르는 가오리|swim
shooting-star-squid|별똥별 오징어|머리가 별 모양이고 다리가 유성의 꼬리처럼 빛나는 오징어|swim
orbital-snail|궤도 달팽이|작은 돌멩이들이 몸 주위를 공전하는 달팽이|crawl
cosmic-dust|우주먼지 뭉치|작은 별 알갱이가 뭉쳐 천천히 숨 쉬는 은빛 우주먼지 생명체|pulse
antenna-goby|안테나 망둑어|머리 위 두 가느다란 안테나로 별의 신호를 듣는 망둑어|swim
alien-slime|외계 슬라임|연두색 반투명 몸을 오므렸다 펴며 떠다니는 작은 외계 슬라임|pulse
helmet-hermit|우주복 소라게|버려진 우주비행사 헬멧을 집으로 사용하는 소라게|crawl`],
 ['fish','rare',260,`
crescent-dragon|초승달 해룡|초승달 형태의 뿔을 가진 은빛 바다용|swim
comet-thresher|유성꼬리 여우상어|꼬리가 긴 혜성처럼 빛나는 상어|swim
planet-turtle|행성수호 거북|등껍질에 작은 숲과 바다가 있는 행성 거북|swim
aurora-seahorse|오로라 해마|몸에서 여러 색의 오로라가 피어오르는 해마|swim
gravity-octopus|중력문어|다리 끝에 작은 천체들이 매달려 공전하는 문어|swim
eclipse-jellyfish|일식 해파리|검은 중심부를 황금빛 고리가 감싸는 해파리|pulse
constellation-dragon|별자리 해룡|몸의 발광점들이 별자리처럼 이어지는 해룡|swim
astronaut-puffer|우주비행 복어|우주복 헬멧 같은 투명한 막에 둘러싸인 복어|swim
binary-nautilus|쌍성 앵무조개|껍데기 안에서 두 개의 작은 태양이 회전하는 앵무조개|swim
meteor-angler|운석포식 아귀|운석을 삼키며 몸속에서 녹여 빛을 내는 거대한 아귀|swim
plasma-jellyfish|플라즈마 해파리|보랏빛 갓 안에서 푸른 플라즈마 줄기가 흐르는 해파리|pulse
black-hole-urchin|블랙홀 성게|검은 구형 몸을 둘러싼 가시 사이로 작은 별빛이 빨려드는 성게|crawl`],
 ['fish','epic',1450,`
solaris|태양을 품은 자, 솔라리스|투명한 몸속에 작은 태양을 품고 있는 황금빛 해파리|pulse
nebula|성운을 삼킨 뱀, 네뷸라|몸 전체가 보랏빛 성운으로 이루어진 거대한 우주 바다뱀|swim
nova|별의 장례자, 노바|죽어가는 별을 등에 싣고 우주를 떠도는 거북|swim
orbis|궤도의 지배자, 오르비스|몸 주위에 일곱 개의 행성이 공전하는 문어|swim
entropy|붕괴의 전조, 엔트로피|주변의 빛을 흡수하며 검은 입자를 흩뿌리는 심해 아귀|swim
station-hermit|우주정거장 소라게|작은 우주정거장을 등에 지고 다니는 소라게|crawl
ufo-pongi|UFO 퐁이|작은 UFO를 타고 둥둥 떠다니는 퐁이|swim
astronaut-pongi|우주비행사 퐁이|커다란 우주 헬멧과 하얀 우주복을 입은 퐁이|swim`],
 ['fish','mythic',3300,`
necropolis|별의 무덤, 네크로폴리스|멸망한 행성과 죽은 별의 잔해가 모여 만들어진 거대 생명체|swim
genesis|우주의 마지막 방주, 제네시스|멸망한 우주 문명들의 도시를 등에 싣고 떠다니는 초거대 우주선 생명체|swim
ananke|운명을 엮는 자, 아난케|행성들을 실처럼 꿰어 목걸이로 만들고 은하의 운행을 조종하는 여신형 존재|swim
apocalypsis|멸망의 집행자, 아포칼립시스|부서진 행성을 갑옷처럼 두른 거대한 우주 기사|swim
eos|새벽별의 여신, 에오스|긴 머리카락이 은하수로 이어지는 여신. 손끝에서 새벽별이 태어난다|swim
pongi-control-tower|퐁이 우주관제탑|꼭대기에 거대한 레이더가 회전하는 우주 통신탑|fixed
pongi-moon-base|퐁이 달 탐사기지|반구형 돔 여러 개가 연결된 달 표면 탐사기지|fixed`],
 ['trash','common',25,`
dented-helmet|찌그러진 우주 헬멧|유리 부분이 깨진 낡은 우주비행사 헬멧
fuel-canister|로켓 연료통|연료가 모두 떨어진 작은 로켓 연료통
broken-solar-panel|부서진 태양광 패널|파란 태양광 판이 반쯤 깨진 인공위성 부품
food-pouch|우주식량 봉지|우주비행사가 먹고 버린 은색 식량 포장지
oxygen-tank|낡은 산소통|산소가 모두 빠져나간 우주복용 산소통
meteor-gravel|운석 부스러기|우주를 떠돌다 떨어져 나온 작은 돌멩이
severed-cable|끊어진 우주선 케이블|끝부분에서 작은 전기 불꽃이 튀는 전선
single-glove|우주 장갑 한 짝|주인을 잃고 떠다니는 두꺼운 흰색 장갑
broken-radio|고장 난 우주 무전기|지직거리는 소리만 나오는 통신 장치
dented-nozzle|찌그러진 로켓 노즐|발사 과정에서 떨어져 나온 금속 부품
satellite-bolt|인공위성 나사|우주를 떠돌던 커다란 육각 나사
cracked-lens|깨진 관측 렌즈|별을 관찰하던 망원경의 금이 간 렌즈
warning-sign|우주선 경고 표지판|위험 표시가 그려진 낡은 금속판
alien-drink-can|외계 음료수 캔|정체불명의 외계 문자로 가득한 음료수 캔
faded-moon-flag|낡은 달 탐사 깃발|색이 바래고 끝부분이 찢어진 깃발
broken-clock|고장 난 우주 시계|시간이 00:00에서 멈춰버린 전자시계
broken-star-bulb|깨진 별빛 전구|내부에 작은 별가루가 남아 있는 전구
seatbelt|우주선 안전벨트|좌석에서 뜯겨 나온 낡은 안전벨트
pongi-button|퐁이 우주복 단추|우주비행사 퐁이가 떨어뜨린 별 모양 단추`],
 ['trash','rare',80,`
black-box|블랙박스 기록장치|실종된 우주선의 마지막 기록이 담긴 검은 상자
alien-coin|외계 문명의 동전|정체불명의 행성 문양이 새겨진 고대 동전
broken-warp-engine|부서진 워프 엔진|차원 이동 장치의 파손된 핵심 부품
broken-gravity-generator|고장 난 중력 발생기|주변의 작은 물체를 둥둥 띄우는 장치
unknown-wreckage|미확인 우주선 파편|어느 문명의 것인지 알 수 없는 금속 잔해
cracked-star-orb|금이 간 별자리 구슬|내부에 작은 별자리가 회전하는 수정 구슬
alien-wallet|외계인의 분실 지갑|알 수 없는 화폐와 이상한 신분증이 들어 있는 지갑
broken-moon-crown|깨진 달의 왕관|초승달 장식이 달린 부서진 은빛 왕관
stopped-compass|멈춰버린 우주 나침반|바늘이 존재하지 않는 별을 가리키는 나침반
supernova-film|초신성 관측 필름|폭발하는 별의 마지막 순간이 기록된 필름
discarded-ufo|폐기된 소형 UFO|동력이 꺼진 손바닥 크기의 비행접시
faulty-hologram|오작동하는 홀로그램|오래된 외계인의 모습이 깜빡이는 투영 장치
unfinished-sun|미완성 인공태양|빛이 약해져 폐기된 작은 인공태양 장치
forbidden-chart|금지된 행성 지도|현재 우주에는 존재하지 않는 행성이 표시된 지도
empty-culture-vessel|외계 생명체 배양통|내부가 비어 있는 정체불명의 생명체 배양 용기
frozen-hourglass|시간이 멈춘 모래시계|모래알이 공중에 멈춰 있는 작은 모래시계
rift-shard|차원 균열 조각|주변 공간을 일그러뜨리는 검은 유리 파편
pongi-lost-spaceship|퐁이의 분실 우주선|퐁이 이름표가 붙어 있는 고장 난 미니 우주선
broken-cosmic-rod|우주 낚싯대 잔해|별을 낚으려다 부러진 전설적인 낚싯대 조각`],
 ['decoration','common',40,`
mini-rocket|미니 로켓|빨간 뾰족 지붕을 가진 작은 로켓 모형
moon-rock|달 표면 바위|크레이터가 파인 회색 달 바위
star-streetlamp|별빛 가로등|꼭대기에 노란 별이 달린 가로등
exploration-flag|우주 탐사 깃발|작은 행성 그림이 그려진 탐사 깃발
mini-ufo|미니 UFO|땅에 착륙한 귀여운 비행접시
alien-planter|외계 식물 화분|보라색 촉수 잎이 자라는 화분
meteor-stone|운석 장식석|반짝이는 광물이 박힌 운석
space-signpost|우주 안내 표지판|달·화성·지구 방향을 가리키는 표지판
constellation-frame|별자리 액자|반짝이는 별자리 그림이 들어 있는 액자
astronaut-footprints|우주인 발자국|달 표면처럼 생긴 작은 발자국 타일
saturn-balloon|토성 풍선|고리가 달린 토성 모양 풍선
rocket-mailbox|로켓 우체통|로켓 모양의 작은 우체통
alien-scarecrow|외계인 허수아비|초록색 외계인 모양의 허수아비
star-candy-machine|별사탕 자판기|별 모양 사탕을 판매하는 자판기`],
 ['decoration','rare',155,`
astronaut-pongi-statue|우주비행사 퐁이 동상|우주복을 입고 깃발을 꽂는 퐁이 동상
solar-system-model|회전하는 태양계|태양을 중심으로 작은 행성들이 공전하는 모형
alien-abduction-device|외계인 납치 장치|UFO 아래에서 초록색 광선이 내려오는 장식
moon-fountain|달빛 분수|초승달에서 은빛 물이 흘러내리는 분수
meteor-sculpture|별똥별 조형물|땅에 떨어지는 별똥별을 형상화한 조형물
capsule-house|우주 캡슐 하우스|둥근 우주 캡슐 형태의 작은 집
galactic-streetlamp|은하수 가로등|푸른 은하수가 나선형으로 감긴 가로등
hologram-globe|홀로그램 지구본|공중에 푸른 지구가 떠 있는 장치
alien-mushrooms|외계 버섯 군락|형광빛으로 빛나는 거대한 외계 버섯
starlight-telescope|별빛 관측 망원경|금빛 별 장식이 달린 천체 망원경
mini-space-station|미니 우주정거장|작은 태양광 패널이 달린 우주정거장 모형
antigravity-rocks|반중력 바위|여러 개의 작은 돌이 공중에 떠 있는 조형물
moon-crystal-tree|달의 수정나무|은빛 줄기와 초승달 모양 잎을 가진 나무
impact-crater|운석 충돌 분화구|중심에 빛나는 운석이 박힌 작은 분화구
space-fishing-pier|우주 낚시터|우주비행사 퐁이가 앉아 있는 초승달 낚시터
meteor-observatory|유성우 관측소|지붕 위에 별똥별이 떨어지는 효과가 있는 관측소`],
 ['decoration','epic',900,`
pongi-lunar-lander|퐁이의 달 착륙선|금빛 착륙 다리와 퐁이 창문이 달린 정교한 달 착륙선
pongi-space-lighthouse|퐁이 우주등대|유리 돔의 별빛 렌즈로 우주 항로를 비추는 퐁이 등대`],
]
export const actions={
 necropolis:'A massive elongated skeletal leviathan built from curved planetary fragments around a stable dark stellar heart. Basic: articulated debris ribs gently flex. Special: outer fragments draw inward, unfurl in a limited circular orbit revealing the heart, return to their original slots, settle. Stable skull and heart.',
 genesis:'A vast living ark with a recognizable elongated ship hull, ancient tiered alien cities on its back and organic ventral fins. Basic: ventral fins and engine vanes flex. Special: paired docking petals unlock, open to reveal a small luminous sanctuary within, close, settle. Rigid hull and cities stay perfectly anchored.',
 ananke:'Regal adult goddess in a fully covering flowing midnight gown, elegant gold astrolabe crown, holds seven small planets on fine golden threads. Basic: hair tips and gown move in water. Special: hands gather thread, weave planets into a necklace arc, loosen the thread, return hands. Head and torso fixed.',
 apocalypsis:'A monumental right-facing armored cosmic knight with shattered planetary plates and a long celestial sword. Basic: cloak hem and articulated armor skirts drift. Special: sword wrist draws back, blade sweeps a small deliberate arc as shoulder plates open, blade returns, plates settle. Helmet and breastplate fixed, no lunging.',
 eos:'An adult dawn goddess in an elegant fully covering ivory and rose-gold gown, long hair becoming a finely painted Milky Way ribbon. Basic: hair and trailing cloth flow. Special: cupped fingers gather, hand opens to reveal a tiny newborn dawn star, gently cups again, returns. Face and torso remain fixed.',
 'pongi-control-tower':'A detailed ivory lunar communication tower with a large physically rotating radar dish, little brown otter operators behind windows. Basic: radar turns through four small angles, cables flex. Special: antenna petals unfold, radar tilts toward the sky, returns, petals fold. Tower foundation and windows fixed.',
 'pongi-moon-base':'A detailed lunar research base of three connected transparent hemispherical domes, small brown otter scientists inside, articulated telescope and airlock. Basic: telescope slowly scans and little flags flex. Special: airlock opens, a tiny attached rover extends on ramp, retracts, airlock closes. Dome shells and base fixed.',
}
export const items=groups.flatMap(([kind,rarity,average,raw])=>{
 const rows=raw.trim().split('\n').map(s=>s.split('|'))
 // Symmetric price steps retain the requested exact arithmetic average.
 const step=kind==='trash'?(rarity==='common'?1:3):kind==='decoration'?(rarity==='common'?1:rarity==='rare'?3:100):({common:2,rare:8,epic:40,mythic:100})[rarity]
 return rows.map(([slug,name,description,movement],i)=>{
  const movement_type=movement??'fixed',ground=movement_type==='crawl',fixed=movement_type==='fixed'
  const id=`galaxy-${slug}`,folder=`${kind==='decoration'?'decorations':kind}/${rarity==='common'?'normal':rarity}`
  const offset=rows.length%2?i-(rows.length-1)/2:i<rows.length/2?i-rows.length/2:i-rows.length/2+1
  return {id,name,description,kind,rarity,sell_price:average+offset*step,movement_type,swim_y_min:fixed?(kind==='fish'?.82:null):ground?.85:slug==='antenna-goby'?.6:.18,swim_y_max:fixed?(kind==='fish'?.92:null):ground?.95:slug==='antenna-goby'?.88:.78,travel_direction:'both',flip_with_direction:!fixed,reference:`assets/references/collectible-style/${['common','rare'].includes(rarity)?'common-rare-pongi':'epic-mythic-starlight'}.png`,thumbnail_path:`${folder}/${id}_v1_thumbnail.png`,sprite_sheet_path:kind==='fish'?`${folder}/${id}_${rarity==='mythic'?'swim8_':''}v1_sprite.png`:null,action:actions[slug]??null}
 })
})
for(const i of items){
 i.frames=i.sprite_sheet_path?(i.rarity==='mythic'?8:4):1
 if(i.kind==='trash'){i.swim_y_min=.82;i.swim_y_max=.92}
 i.speed=i.movement_type==='fixed'?(i.kind==='decoration'?'0':'0.001'):i.movement_type==='crawl'?'0.012':i.movement_type==='pulse'?'0.014':'0.024'
}
export function thumbnailPrompt(i){return `Use case: stylized-concept. One isolated production game collectible thumbnail. Subject: ${i.name}. ${i.description}. ${i.action??''} Input reference is rendering STYLE only; do not copy its silhouette, character, props or background. ${['common','rare'].includes(i.rarity)?'Gentle hand-painted cartoon, thin warm colored contours, soft dimensional shading, modest natural eyes, restrained highlights.':'Refined detailed soft fantasy illustration, delicate colored contours, luminous translucent materials and dimensional shading, elegant mythic presence, not thick cartoon outlines.'} ${i.name.includes('퐁이')?'Pongi is a small warm brown otter with cream muzzle and belly, round ears, peach star hair ornament, preserve this identity.':''} ${i.kind==='fish'&&i.movement_type!=='fixed'?'Head faces SCREEN RIGHT in clear side three-quarter view, anatomy appropriate to species.':'Complete object in a gentle three-quarter view, stable base.'} Center the whole silhouette in the central 75% of a square canvas with generous transparent margins. Space themed colors appropriate to this object. Clean antialiased alpha, no matte fringe, no checkerboard, no scene, no ground shadow, no text or UI. One thumbnail, not a sheet. Subtle local light only, no diffuse fog or detached sparks.`}
if(process.argv[1]?.replaceAll('\\','/').endsWith('/prepare-galaxy-assets.mjs')){
 mkdirSync(batch,{recursive:true})
 const manifest={region_id:'galaxy',region_name:'은하수의 끝자락',status:'in-progress',tool:'image_gen.imagegen',map_piece_rarities:['rare','rare','rare','epic','epic','epic'],items,assets:[]}
 const previous=existsSync(batch+'/manifest.json')?JSON.parse(readFileSync(batch+'/manifest.json','utf8')):{}
 writeFileSync(batch+'/manifest.json',JSON.stringify({...manifest,...previous,items},null,2)+'\n')
 console.log(JSON.stringify({batch,count:items.length,groups:groups.map(([kind,rarity,average])=>({kind,rarity,expected:average,actual:items.filter(i=>i.kind===kind&&i.rarity===rarity).reduce((s,i)=>s+i.sell_price,0)/items.filter(i=>i.kind===kind&&i.rarity===rarity).length}))}))
}
