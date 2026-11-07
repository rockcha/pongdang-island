import {mkdirSync,existsSync,readFileSync,writeFileSync} from 'node:fs'
import {pathToFileURL} from 'node:url'

export const batch='assets/storage-upload/new/20261107-153000'
export const regionId='hologram'
export const scenePaths=['regions/hologram/map-v1.png','regions/hologram/overview-v1.png','fishing/scenery/hologram-v1.png','fishing/close-water/hologram-v1.png','fishing/platforms/hologram-v1.png','equipment/rods/hologram/thumbnail.png']
export const excludedDraftIds=['hologram-quicksilver','hologram-proto-x','hologram-proto-09','hologram-leviathan','hologram-override']
// Deduplicate the repeated puffer and shrimp concepts; retain both named sharks.
const groups=[
['fish','common',65,`
neon-guppy|네온 구피|몸의 윤곽만 형광빛으로 빛나는 투명 구피|swim|transparent guppy with only cyan luminous outline, tiny fan tail
pixel-jellyfish|픽셀 해파리|촉수 끝이 작은 사각형 픽셀로 흩어지는 해파리|pulse|small jellyfish with square pixel segments at tentacle tips
holo-shrimp|홀로그램 새우|몸의 절반이 반투명하며 푸른 회로가 흐르는 새우|swim|segmented shrimp half transparent hologram with cyan internal circuits
glitch-crab|글리치 게|움직일 때 몸 가장자리가 깨졌다 복구되는 게|crawl|small crab with symmetrical claws and a few displaced pixel shell fragments
led-puffer|전광판 복어|둥근 LED 전광판 같은 배에 표정 이모티콘이 나타나는 복어|swim|round puffer with a small cyan LED emoticon grid integrated into belly
data-anchovy|데이터 멸치|작은 데이터 부호들이 비늘처럼 흐르는 은빛 멸치|swim|slender anchovy with tiny abstract code-like scale marks
wifi-ray|와이파이 가오리|넓은 날개에 푸른 신호 무늬가 반짝이는 가오리|swim|natural diamond-bodied stingray with cyan wifi arcs on flat wings, no upraised fantasy wings
fiber-seahorse|광섬유 해마|가느다란 광섬유 다발로 이루어진 꼬리를 가진 해마|swim|organic seahorse with delicate fiberoptic curled tail strands
cable-eel|케이블 장어|전선처럼 길고 유연한 몸을 가진 형광빛 장어|swim|long flexible eel like a navy cable with cyan lateral stripe
battery-seahorse|배터리 해마|몸속의 작은 에너지 셀이 은은하게 빛나는 기계 해마|swim|small mechanical seahorse with visible cyan energy cell inside torso`],
['fish','rare',280,`
holo-butterflyfish|홀로그램 나비고기|반투명 지느러미가 여러 겹의 잔상을 남기는 나비고기|swim|butterflyfish with translucent cyan fins and two close faint trailing hologram echoes
error-octopus|오류의 문어|여덟 촉수마다 서로 다른 홀로그램 화면을 띄우는 문어|swim|octopus with eight arms each supporting a different cyan holographic screen
neon-ghost-ray|네온 유령가오리|보랏빛 몸의 일부가 홀로그램처럼 사라졌다 나타나는 가오리|swim|wide flat natural ghost stingray with subtle violet transparency patches, navy and cyan base
disco-jellyfish|디스코 해파리|투명한 갓 속에서 여러 빛이 천천히 회전하는 해파리|pulse|jellyfish with a rotating cyan and violet segmented luminous sphere inside bell
laser-marlin|레이저 청새치|둥근 창 모양 주둥이가 붉은 레이저처럼 빛나는 청새치|swim|sleek marlin with ROUND narrow spear bill and cyan body, tiny magenta-red laser bill accent
digital-chameleon|디지털 카멜레온|네온 간판의 색과 무늬를 비늘에 복제하는 수중 카멜레온|crawl|aquatic chameleon with curled tail and neon sign-shaped cyan camouflage markings, four climbing feet
photon-seadragon|광자 해룡|몸속의 푸른 광자 에너지가 뼈처럼 드러나는 작은 해룡|swim|small slender organic sea dragon with transparent cyan photon skeleton
billboard-angler|광고판 아귀|발광 기관에 작은 홀로그램 광고를 띄워 먹이를 유인하는 아귀|swim|round deep-sea anglerfish with a cyan holographic fish pictogram projected from lure
laser-swordfish|레이저 황새치|납작하고 긴 주둥이가 붉은 레이저 검처럼 빛나는 황새치|swim|swordfish with conspicuously FLAT broad sword bill, cyan body and small magenta-red blade highlight`],
['fish','epic',1250,`
zero-shark|심해의 추격자, 제로샤크|소리를 죽인 채 네온 그림자 사이를 추격하는 날렵한 상어|swim|sleek streamlined navy shark with cyan tracking reticle eye and restrained stealth armor, fully solid body
glitch-hunter|허상의 사냥꾼, 글리치|검은 몸이 픽셀처럼 깨졌다 복구되며 짧은 잔상을 남기는 상어|swim|black organic shark with limited cyan-magenta pixel discontinuities and two close trailing ghost echoes
memoria|기억을 훔치는 자, 메모리아|머릿속의 거대한 메모리 코어에 접촉한 생명의 기억을 저장하는 문어|swim|large eight-armed organic octopus with rounded transparent mantle containing a large faceted cyan memory core, small lateral eye at mantle base, no fish snout, gills or fins
volteon|전류를 먹는 자, 볼테온|고압 전류를 삼키며 몸의 푸른 회로를 밝히는 전기뱀장어|swim|powerful blue electric eel with internal cyan current and a few close contained electric arcs
sos|심해의 마지막 신호, SOS|낡은 구조 신호기와 융합해 몸을 따라 붉은 구조 신호가 흐르는 거대 산갈치|swim|giant SILVER OARFISH with a long flat ribbon body, small blunt right-facing natural fish head, small lateral eye, red dorsal crest and thin red rescue signal dashes along body, a small worn rescue beacon fused behind head; midnight navy shadows and cyan rim, restrained RED signal accent replaces magenta on this species; no legs, dragon horns, large wings or jet engines
sweeper|네온의 청소부, 스위퍼|거대한 청소 로봇과 해삼이 융합해 도시의 폐기물을 삼켜 에너지로 바꾸는 존재|crawl|large benthic SEA CUCUMBER fused with a compact industrial cleaning robot, navy elongated bumpy soft cucumber rear body, low articulated crawler tracks and tube feet, functional front vacuum intake facing right, transparent cyan energy chamber containing tiny waste silhouettes, sparse violet accent; NO cartoon eyes, eyebrows, smiling face, humanoid arms or wings
prism|광섬유의 여왕, 프리즘|바닥에 뿌리내린 채 수백 가닥의 광섬유 촉수를 펼치는 거대 말미잘|fixed|rooted sea anemone with elegant dense fiberoptic tentacle crown cyan and sparse magenta tips, base visible
mirage|홀로그램 환술사, 미라주|작은 몸 주위에 거대한 오징어 환영을 투영하는 생명체|swim|small real squid inside a much larger translucent cyan squid hologram, clear nested silhouette
hologram-pongi|홀로그램 퐁이|푸른 투영 장치에서 태어나 도시를 안내하는 반투명 퐁이|swim|recognizable friendly Pongi otter rendered as translucent navy-cyan hologram, starfish hair ornament in violet, holds tiny luminous city map`],
['fish','mythic',3500,`
seraphim|버려진 신들의 서버, 세라핌|여섯 개의 서버랙이 천사의 날개처럼 펼쳐지는 심해의 기계 생명체|swim|majestic floating mechanical lifeform with EXACTLY SIX distinct tall server racks unfolding like three pairs of angel wings from a compact dark hexagonal core; core at front RIGHT with a small right-pointing data prow, six racks fanning behind toward LEFT, cyan server indicator slots and sparse magenta circuits; mechanical anatomy, no human face, cartoon eyes, feathers, manta body or ribbon tail
archive|데이터의 신, 아카이브|투명한 몸속에 도시의 모든 기록이 흐르는 거대한 고래상어|swim|giant transparent whale shark with broad blunt terminal mouth, tiny eye, gill slits, five-point spots and internal holographic archive city
eve|심해의 인공지능, 이브|중앙 서버에서 태어난 자율 인공지능이 회로와 홀로그램 몸으로 유영하는 모습|swim|serene adult AI goddess with elegant translucent cyan humanoid upper body and flowing circuit-ribbon aquatic lower body, modest long luminous robe, no legs, right-facing profile
simula|가상세계의 창조자, 시뮬라|거대한 투명 갓 속에 또 하나의 작은 네온 도시를 품은 디지털 해파리|pulse|giant transparent jellyfish containing a miniature cyan neon city inside wide bell, elegant fine data-tentacles
masquerade|천 개의 가면, 마스커레이드|서로 다른 인격을 지닌 수많은 디지털 가면이 모여 이루어진 거대한 해룡|swim|immense long serpentine SEA DRAGON built entirely from dozens of small overlapping translucent DIGITAL MASKS, each mask has a different restrained expression or slit shape, dark navy structural core and cyan holographic seams with sparse magenta personalities; composite dragon snout points RIGHT and long S-curved body and tapering mask tail trail LEFT; head formed from layered masks not a manta face, no giant manta wings, no gold armor or rainbow`],
['trash','common',25,`
broken-neon-sign|깨진 네온사인|일부 관이 깨져 푸른 불빛만 남은 네온 간판|fixed|broken bent cyan neon tubing on rusted dark sign frame
empty-battery|방전된 배터리|에너지 표시등이 꺼진 작은 해저 배터리|fixed|depleted small cylindrical energy battery with faint cyan indicator
broken-drone|고장 난 드론|프로펠러 하나가 부러진 소형 정찰 드론|fixed|small dark reconnaissance quadcopter with one clearly broken propeller
old-chip|낡은 전자칩|표면의 회로가 바닷물에 부식된 반도체 칩|fixed|small corroded square semiconductor with cyan etched circuits
broken-panel|깨진 홀로그램 패널|금 간 화면에 불완전한 푸른 영상이 남은 유리판|fixed|cracked translucent hologram glass panel with a small fragmented cyan projection
rusty-robot-arm|녹슨 로봇 팔|손가락 하나만 미세하게 움직이는 폐기 로봇 팔|fixed|detached rusted compact robotic forearm with one raised metal finger
discarded-billboard|폐기된 전광판|해독할 수 없는 광고 무늬를 반복하는 작은 화면|fixed|discarded rectangular LED screen showing abstract cyan blocks, no readable letters
broken-watch|고장 난 스마트워치|표시가 멈춘 작은 방수 손목시계|fixed|broken waterproof smartwatch with four small unchanging cyan display dots
empty-energy-can|빈 에너지 캔|형광 음료의 흔적만 남은 찌그러진 캔|fixed|dented empty dark drink can with cyan stripe and tiny magenta residue
broken-keyboard|부서진 키보드|형광 키캡 몇 개만 남은 기계식 키보드|fixed|broken compact mechanical keyboard with several cyan and violet keycaps, no letters
broken-lens|깨진 카메라 렌즈|보라색 코팅이 벗겨진 감시 카메라 렌즈|fixed|cracked surveillance camera lens with peeling violet coating
charging-cable|폐기된 충전 케이블|해초에 끝부분이 얽힌 낡은 충전선|fixed|coiled discarded charging cable with cyan connector and a little dark seaweed`],
['trash','rare',80,`
memory-chip|기억이 담긴 메모리칩|정체불명의 기억 조각이 맴도는 데이터 칩|fixed|navy data chip projecting a tiny translucent cyan memory fragment
damaged-ai-core|손상된 AI 코어|내부의 경고등이 깜빡이는 손상된 연산 장치|fixed|cracked spherical AI computation core with a restrained magenta warning light
black-box|미확인 블랙박스|미래 잠수정에서 떨어져 나온 밀봉 기록 장치|fixed|sealed black submarine recorder with small cyan status slots
forbidden-disk|금지된 데이터 디스크|도시의 기밀 정보가 잠든 보랏빛 디스크|fixed|dark violet optical disk with cyan circuit rings and sealed triangular symbol
holo-heart|홀로그램 심장|푸른 홀로그램으로 이루어져 아직 박동하는 인공 심장|fixed|stylized anatomical holographic cyan artificial heart floating over a small broken emitter, not gore
reverse-clock|고장 난 시간 측정기|시간의 방향이 뒤집힌 작은 디지털 측정기|fixed|small broken digital chronometer with counterclockwise cyan circular arrows, no numbers
sealed-cell|봉인된 에너지 셀|검은 에너지가 소용돌이치는 밀봉 투명 용기|fixed|sealed transparent cylinder with dark swirling energy and narrow cyan cap lights
robot-skull|미완성 로봇 두개골|비어 있는 눈에서 푸른빛이 새어 나오는 로봇 머리|fixed|unfinished friendly robotic skull with cyan light from empty eye sockets
deleted-id|삭제된 시민증|지워진 인물의 흔적만 남은 전자 신분증|fixed|damaged electronic identity card with a glitchy cyan silhouette portrait and no text
emergency-stop|비상 정지 버튼|주변 기기를 멈추는 붉은 버튼이 달린 폐기 장치|fixed|large dark emergency stop switch with a magenta-red button and cyan outer ring
dimension-chip|균열 난 차원칩|금 사이로 다른 공간의 빛이 비치는 반도체|fixed|cracked microchip with a tiny violet dimensional slit and cyan circuitry
infected-cube|오염된 데이터 큐브|검은 픽셀 조각이 안에서 움직이는 투명 정육면체|fixed|transparent cyan data cube containing compact black pixel-like contamination
experiment-tag|실험체 식별 태그|비밀 연구소의 표식이 새겨진 낡은 금속표|fixed|small scratched laboratory metal identification tag with abstract cyan bars, no legible serial
last-voice|마지막 음성 기록기|끊긴 구조 요청의 파형이 반복되는 녹음기|fixed|small abandoned voice recorder projecting a short fragmented cyan waveform`],
['decoration','common',40,`
neon-lamp|네온 가로등|청록색 불빛으로 길을 밝히는 미래형 가로등|fixed|slender futuristic street lamp with restrained cyan light
holo-sign|홀로그램 표지판|반투명 방향 화살표가 떠 있는 작은 표지판|fixed|small dark post projecting a translucent cyan directional arrow
cyber-vending|사이버 자판기|형광 음료가 진열된 작은 자동판매기|fixed|small navy vending machine with cyan drink bottles and magenta trim
neon-bench|네온 벤치|분홍 LED 가장자리가 은은히 빛나는 벤치|fixed|compact dark metal bench with cyan supports and narrow pink LED edges
digital-traffic|디지털 신호등|물고기 신호가 떠 있는 해저 교통 신호등|fixed|small futuristic traffic signal showing cyan fish pictograms
charging-station|소형 충전소|드론과 로봇이 쉬어 가는 작은 충전대|fixed|small dark energy charging pedestal with cyan light rings
neon-postbox|네온 우체통|푸른 홀로그램 편지를 보관하는 우체통|fixed|small navy mailbox with a tiny cyan holographic envelope above slot
advert-hologram|광고 홀로그램|입체 상품 무늬를 비추는 작은 투영 장치|fixed|small emitter projecting a rotating abstract cyan geometric product icon
abyss-cctv|심해 CCTV|보랏빛 렌즈로 골목을 살피는 감시 카메라|fixed|small dark security camera on short stand with violet lens and cyan outline
cyber-phone|사이버 공중전화|투명 디스플레이가 달린 작은 전화 부스|fixed|compact navy public telephone booth with translucent cyan display
road-sign|발광 도로 표지판|도시 구역을 빛무늬로 안내하는 도로 표지판|fixed|dark road sign showing cyan geometric district symbols, no text
neon-bin|네온 쓰레기통|물건을 넣으면 작은 표시등이 켜지는 수거함|fixed|small futuristic trash bin with cyan inlet light and tiny magenta status dot
pixel-pot|픽셀 화분|작은 홀로그램 꽃이 피어나는 화분|fixed|small navy flowerpot growing a cyan hologram flower with sparse violet square petals
digital-clock|디지털 시계탑|여러 시간대를 빛 고리로 나타내는 시계 기둥|fixed|small dark clock pillar with several cyan circular clock faces, no digits
robot-guide|로봇 안내판|작은 로봇 얼굴이 표정을 바꾸는 안내판|fixed|small navy robot-face information kiosk with friendly cyan display eyes`],
['decoration','rare',155,`
holo-aquarium|홀로그램 수족관|투명 구체 안에서 디지털 물고기들이 헤엄치는 장치|fixed|glass globe on dark stand containing three tiny cyan holographic fish
cyber-cherry|사이버 벚꽃나무|검은 금속 가지에 분홍 홀로그램 꽃이 피는 나무|fixed|black metal cherry tree with translucent cyan and pink holographic blossoms, contained canopy
neon-fountain|네온 분수대|푸른 에너지 입자가 물줄기처럼 솟는 분수|fixed|small dark circular fountain with restrained cyan energy jets
sunken-robot|침몰한 로봇 동상|해초와 산호가 덮인 거대한 로봇 상반신|fixed|sunken robotic upper torso statue with dark seaweed, cyan coral and one dim violet eye
holo-whale-statue|홀로그램 고래상|원형 발광 장치 위에 고래의 환영이 떠 있는 조형물|fixed|small emitter plinth projecting a complete tiny cyan whale hologram
abyss-arcade|심해 게임센터|고장 난 아케이드 게임기 세 대가 나란한 작은 오락실|fixed|three compact abandoned navy arcade cabinets side by side, cyan screens and violet trim
future-bus-stop|미래형 버스 정류장|투명 지붕과 디지털 노선도가 있는 작은 정류장|fixed|compact futuristic bus shelter with glass roof and cyan route diagram without text
neon-coral-garden|네온 산호 정원|회로와 융합해 분홍·청록빛으로 빛나는 산호 군락|fixed|clustered cyan and violet coral fused with dark printed-circuit base
broken-portal|고장 난 포털 게이트|에너지 막이 불규칙하게 깜빡이는 원형 관문|fixed|dark circular portal gate with incomplete cyan energy membrane and tiny magenta glitches
drone-workshop|심해 드론 정비소|작은 로봇들이 드론을 수리하는 자동 정비 시설|fixed|compact automated repair dock with one little robot arm tending a cyan drone
advert-tower|해저 광고탑|여러 홀로그램이 둘러싼 높은 광고 기둥|fixed|slender dark advertisement tower with three close cyan hologram panels and violet highlights
music-fountain|디지털 음악 분수|음표 모양의 빛이 물줄기 위로 떠오르는 분수|fixed|dark small fountain emitting cyan music-note shaped holograms
cyber-taxi|버려진 사이버 택시|바닥에 반쯤 묻힌 미래형 무인 택시|fixed|abandoned futuristic driverless taxi half resting in dark sand, cyan windows and magenta taillights
artificial-moon|인공 달 조명|작은 보랏빛 달이 장치 위로 떠오르는 조명|fixed|small navy pedestal suspending a violet moon orb in two thin cyan rings
data-cabinet|데이터 보관함|투명 데이터 큐브들이 떠 있는 작은 진열장|fixed|small navy archive cabinet displaying three hovering cyan transparent data cubes`],
['decoration','epic',900,`
whale-fountain|홀로그램 고래 분수|고래의 환영과 푸른 물줄기가 어우러진 대형 분수|fixed|grand dark circular fountain projecting a large translucent cyan whale and short magenta water arcs
glass-dome-tower|심해 유리돔 타워|푸른 회로가 둘러싼 투명 유리돔의 도시 탑|fixed|ornate dark underwater tower with glass dome containing cyan holographic city core
sunken-subway|침몰한 네온 지하철|자홍빛 창문이 남은 버려진 해저 지하철|fixed|complete abandoned futuristic subway carriage with navy metal, cyan ribs and magenta lit windows
neon-clocktower|네온 시계탑|겹친 청록빛 고리가 시간을 새기는 높은 시계탑|fixed|tall dark cyberpunk clock tower with cyan concentric holographic dial and sparse violet edges
giant-robot-wreck|거대 로봇 잔해|꺼진 기계 몸체에 작은 푸른 회로만 남은 거대 잔해|fixed|large collapsed dark robot torso and detached arm with dim cyan surviving circuitry, no gore
data-waterfall|심해 데이터 폭포|도시의 기록이 빛의 줄기가 되어 쏟아지는 장치|fixed|dark sculptural data arch releasing a contained waterfall of cyan light strips and sparse violet squares`],
]

export const items=groups.flatMap(([kind,rarity,mean,lines])=>{
 const rows=lines.trim().split('\n').map(l=>l.split('|'))
 const step=kind==='fish'?({common:2,rare:8,epic:30,mythic:100})[rarity]:kind==='trash'?rarity==='common'?1:3:rarity==='common'?1:rarity==='rare'?3:40
 return rows.map(([slug,name,description,movement_type,visual],index)=>{
  const id=`hologram-${slug}`,folder=`${kind==='decoration'?'decorations':kind}/${rarity==='common'?'normal':rarity}`
  const fixed=movement_type==='fixed',crawl=movement_type==='crawl'
  const [swim_y_min,swim_y_max]=kind==='decoration'?[null,null]:fixed?[.86,.94]:crawl?[.86,.94]:movement_type==='pulse'?[.22,.70]:[.20,.76]
  const offset=rows.length%2?index-(rows.length-1)/2:index<rows.length/2?index-rows.length/2:index-rows.length/2+1
  return {id,kind,rarity,name,description,visual,movement_type,swim_y_min,swim_y_max,speed:fixed?(kind==='decoration'?'0':'0.001'):crawl?'0.008':movement_type==='pulse'?'0.012':'0.024',flip_with_direction:kind==='fish'&&!fixed,travel_direction:'both',facing_direction:kind==='fish'?'right':null,sell_price:mean+offset*step,thumbnail_path:`${folder}/${id}_v1_thumbnail.png`,sprite_sheet_path:kind==='fish'?`${folder}/${id}${rarity==='mythic'?'_swim8_v1':'_v1'}_sprite.png`:null,frames:kind==='fish'?(rarity==='mythic'?8:4):0}
 })
})
// Keep the arithmetic group means exact when even-sized groups require rounding.
for(const [kind,rarity,mean] of groups){const a=items.filter(i=>i.kind===kind&&i.rarity===rarity);a.at(-1).sell_price+=mean*a.length-a.reduce((n,i)=>n+i.sell_price,0)}
export const paletteReference='assets/storage-upload/new/20261107-151834/regions/neon-abyss-city/map-v2.png'
export function thumbnailPrompt(i){
 const style=['common','rare'].includes(i.rarity)?'Friendly restrained cartoon game illustration with thin soft color outlines and clean soft cel shading, natural modest eye size. Do not copy the otter animal, orange palette, hook or fur from style reference.':'Premium soft fantasy illustration with fine color edges, layered translucent materials and exquisite shading. Style reference is ONLY for rendering and light; NEVER copy manta silhouette, upraised wings, ribbon tail, face or stars.'
 const facing=i.kind==='fish'?(i.movement_type==='fixed'?'A rooted organism in right-biased side-three-quarter view with base intact. A sea anemone has NO head, face, eyes, fish body, snout or fins: individual fiberoptic tentacles form a radial crown above a stalk.':'Face SCREEN RIGHT in a clear side or side-three-quarter profile. The head, mouth and snout point to the right; the body and tail trail behind to the left. Show forward swimming toward the right, never backward swimming. No left-facing or front-facing pose.'):'Three-quarter isolated object view with base visible, readable silhouette. It is an inanimate OBJECT, not an anthropomorphic character: NO added cute eyes, eyebrows, face or mouth. Do not transfer the animal reference face onto it. Only literal mechanical camera lenses or robot face parts specifically required by subject may remain; no extra expressions on other surfaces.'
 return `Create ONE ${i.rarity} ${i.kind} game collectible thumbnail: ${i.name}. Subject specification: ${i.visual}. ${style} Second reference supplies ONLY the shared Hologram Abyss City color palette: primarily midnight navy and ink teal, electric cyan emission, sparse magenta-violet accents about ten percent, no rainbow or gold. Keep readable against dark ocean via a clean subtle cyan rim. ${facing} Exactly ONE whole complete subject centered in square canvas, within central 76 percent so at least 12 percent truly transparent margin on EVERY side including glow, fins, tentacles and attached holograms. No cropping. Natural species anatomy takes priority. No background, scenery, panel, floor, ground shadow, external particles, loose pixels, smoky glow, labels, legible text, watermark or checkerboard. TRUE transparent background. Static thumbnail, not a sprite sheet.`
}
export function prepare(){
 mkdirSync(batch,{recursive:true})
 writeFileSync(`${batch}/specification.json`,JSON.stringify({regionId,name:'홀로그램 심해도시',mapPieces:['common','common','rare','rare','epic','epic'],rod:{name:'홀로그램 회로 낚싯대',price:2800,failure_reduction_bp:200,native_bonus_bp:200,wait_reduction_seconds:1},paletteReference,items},null,2)+'\n')
 if(!existsSync(`${batch}/manifest.json`))writeFileSync(`${batch}/manifest.json`,JSON.stringify({status:'work-in-progress-not-deployed',tool:'built-in image_gen',items:[]},null,2)+'\n')
 else{
  const previous=JSON.parse(readFileSync(`${batch}/manifest.json`,'utf8'))
  if(JSON.stringify(previous.artwork_review?.reviewedSpeciesIds??[])!==JSON.stringify(items.map(i=>i.id))){previous.status='work-in-progress-not-deployed';previous.excluded_unreleased_draft_ids=excludedDraftIds;writeFileSync(`${batch}/manifest.json`,JSON.stringify(previous,null,2)+'\n')}
 }
 console.log(JSON.stringify({batch,species:items.length,groups:groups.map(([kind,rarity,mean])=>({kind,rarity,count:items.filter(i=>i.kind===kind&&i.rarity===rarity).length,mean}))}))
}
if(process.argv[1]&&import.meta.url===pathToFileURL(process.argv[1]).href)prepare()
