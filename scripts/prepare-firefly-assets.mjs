import {mkdirSync,writeFileSync,existsSync} from 'node:fs'

// Reproducible creative inputs; execution receipts live beside the generated assets.
export const batch='assets/storage-upload/new/20261029-032100'
const groups=[
 ['fish','common',55,[
  ['leaf-medaka','잎새송사리','Tiny slender pale green medaka, a single leaf-shaped tail, cream belly.',45],
  ['acorn-puffer','도토리복어','Round tan pufferfish, creamy belly, small soft spines and brown speckles, snug acorn cup cap with woody stem.',65],
  ['honey-guppy','꿀방울구피','Honey yellow guppy with rounded translucent golden fan tail, tiny amber droplet marking inside belly.',55],
  ['petal-bitterling','꽃잎납줄개','Small oval ivory bitterling, peach cheeks and short peach-pink petal fins.',50],
  ['sprout-minnow','새싹피라미','Slim silver green minnow, a tiny two-leaf sprout on head, narrow forked tail.',45],
  ['clover-platy','클로버플래티','Small warm orange platy, rounded green clover-shaped tail and cream belly.',55],
  ['willow-loach','버들잎미꾸리','Long slender willow-green loach, flowing willow-leaf markings along flanks, short whiskers.',50],
  ['moss-goby','이끼망둑','Small squat goby, soft moss-green blotches, broad short fins, rounded friendly head.',50],
  ['bud-goldfish','봉오리금붕어','Plump peach goldfish resembling a closed flower bud, compact folded petal fan tail.',65],
  ['daisy-medaka','데이지메다카','Small milky white medaka with yellow cheek and white daisy-petal fan tail.',55],
  ['dandelion-guppy','민들레꼬리구피','Warm brown guppy with a delicate round white dandelion-fluff fan tail, continuous clean silhouette.',65],
  ['grass-seed-anchovy','풀씨멸치','Slender silver anchovy with pale tan grass-seed flecks and tiny green forked tail.',45],
  ['pinecone-carp','솔방울붕어','Little chestnut carp with large rounded overlapping pinecone scales, cream belly.',60],
  ['waterlily-fry','수련치어','Tiny rosy pink fish fry, small green waterlily-leaf pectoral fins and short translucent tail.',60],
  ['mushroom-sculpin','버섯모자둑중개','Small broad-headed sculpin, brown mushroom-cap pattern on crown, wide peach fan pectoral fins.',60],
 ]],
 ['fish','rare',260,[
  ['firefly-lanternfish','반딧불랜턴피시','Small teal lanternfish, rounded honey-yellow glowing organ at tail tip, subtle translucent fins.',230],
  ['flower-cloak-seahorse','꽃망토해마','A real little seahorse with flower-calyx cap and short pink petal cloak, curled tail with tiny flower bud.',280],
  ['waterlily-jellyfish','수련우산해파리','Jellyfish with broad waterlily-leaf umbrella bell, short dangling pink flower-stamen tentacles, readable right-facing tilt.',260],
  ['leaf-wing-guppy','잎날개구피','Pale green guppy with translucent veined leaf fins and two-lobed wide leafy tail. Fish anatomy, not humanoid.',240],
  ['clover-postfish','클로버우체부','Small orange fish wearing clover cap and folded leaf mail satchel against flank. Fins and tail, no arms or legs.',270],
  ['willow-ribbon-pipefish','버들리본실고기','Very long thin green pipefish with long willow-leaf dorsal ribbons, tiny ivory flower near head, long straight snout.',240],
  ['acorn-lantern-hermit','도토리등소라게','Real hermit crab with acorn shell cottage, round door, small warm lantern at entrance, articulated legs and claws; walking to right.',290],
  ['flower-letter-batfish','꽃편지제비고기','Tall laterally compressed batfish, long fins shaped like folded ivory flower letters, tiny pink flower-seal marking.',250],
  ['clover-ray','클로버가오리','Broad compact stingray shaped like a four-leaf clover, soft leaf veins, slender short stem-like tail, face to right.',280],
  ['woodgrain-turtle','나무결거북','Small swimming turtle, rounded woodgrain shell with growth rings and tiny leaves along rim, moss-green limbs.',260],
 ]],
 ['fish','epic',1200,[
  ['lantern-keeper-fairy','반딧불 등지기 요정','Actual tiny humanoid fairy with honey-gold bob, pointed ears, cream petal tunic, short moss-green leaf cloak, acorn shoes, translucent green insect wings, curved twig flower-bud lantern held in both hands.',1200],
  ['acorn-warden-fairy','도토리 숲지기 요정','Actual tiny humanoid forest guardian fairy with chestnut hair, acorn cap, russet leaf tunic, short green cloak, acorn satchel and little twig staff, clear insect wings.',1250],
  ['waterlily-dancer-fairy','수련 무희 요정','Actual tiny humanoid fairy dancer with soft rose hair, fully covering layered pink waterlily petal dress, green leaf collar, long translucent wings, graceful floating dance pose.',1300],
  ['clover-luck-fairy','클로버 행운 요정','Actual tiny humanoid fairy with curly green hair, clover cap, cream and green leafy outfit, holds oversized four-leaf clover parasol, small clear wings.',1150],
  ['flower-post-fairy','꽃편지 배달 요정','Actual tiny humanoid fairy with auburn short hair, flower-bud cap, leaf cape, fully covering ivory tunic, leaf mail satchel filled with folded pink petal letters, clear wings.',1100],
  ['mushroom-child-fairy','버섯집 꼬마 요정','Actual little humanoid fairy, rounded chestnut mushroom cap, fully covering cream outfit and little boots, mushroom-cottage backpack with honey-lit window, short clear wings.',1150],
  ['honey-teahouse-fairy','꿀꽃 찻집 요정','Actual tiny humanoid fairy with honey-gold braids, cream flower-calyx apron over moss dress, holding a flower-petal teacup on acorn saucer, translucent honey wings.',1200],
  ['evening-lullaby-fairy','달맞이 자장가 요정','Actual tiny humanoid fairy with pale yellow evening-primrose hat, cream full-length sleep robe, holding a little seedpod harp, soft golden translucent wings, peaceful expression.',1250],
 ]],
 ['trash','common',15,[
  ['broken-acorn-cup','깨진 도토리 찻잔','Chipped little acorn teacup, broken handle lying beside cup, worn edges.',15],
  ['torn-leaf-umbrella','구멍 난 잎사귀 우산','Old broad green leaf umbrella with a few clearly visible holes, bent twig handle.',18],
  ['spent-firefly-lantern','다 쓴 반딧불 초롱','Empty unlit flower lantern, wilted petal cover, worn twig loop.',16],
  ['tangled-grass-thread','헝클어진 풀실 뭉치','Small tangled bundle of dried grass thread, little leaf scraps caught inside.',12],
  ['wet-flower-letter','젖은 꽃편지','Wet folded flower-petal letter with illegible washed-out ink marks, loose grass tie, no readable text.',13],
  ['single-petal-shoe','짝 잃은 꽃신','One tiny worn rose-petal shoe, lightly frayed toe, no character attached.',14],
  ['cracked-honey-pot','금 간 꿀단지','Little cracked amber honey pot with crooked leaf lid and a tiny honey residue.',17],
 ]],
 ['trash','rare',55,[
  ['faded-fairy-invitation','빛바랜 요정 초대장','Folded ivory flower-petal invitation with faded gold pollen decorative marks and a worn green seal, no readable letters.',50],
  ['cracked-dew-perfume','금 간 이슬 향수병','Small cracked transparent dew perfume bottle, lily-of-valley stopper, one last pale blue drop inside.',60],
  ['broken-flower-lamp-staff','부러진 꽃등 지팡이','Broken miniature twig lantern staff, attached unlit wilted flower-bud lamp, visibly snapped handle.',55],
  ['untied-flower-mask','풀린 꽃무도회 가면','Little masquerade mask crafted from dried pink petals, one grass-string tie snapped and curled beside it.',55],
  ['torn-leaf-map','찢어진 잎맥 지도','Weathered green leaf chart with branching vein waterways, torn missing corner, tiny decorative route dots, no lettering.',55],
 ]],
 ['decoration','common',40,[
  ['acorn-teacups','도토리 찻잔 세트','Two intact acorn teacups on a broad leaf tray, tiny wooden spoon.',38],
  ['mushroom-stool','버섯 둥근의자','One squat chestnut mushroom stool with round green leaf cushion.',40],
  ['pebble-flowerpot','조약돌 꽃화분','Round hollow pebble flowerpot with three tiny cream and peach wildflowers.',42],
  ['grass-thread-basket','풀실 바구니','Small woven vine basket holding green grass-thread balls and a wooden spool.',38],
  ['acorn-signpost','도토리 이정표','Short wooden signpost with acorn finial and two leaf-shaped direction boards, no writing.',40],
  ['moss-stump-table','이끼 그루터기 탁자','Low tree stump table with clear growth rings, moss along edges, small leaf coaster.',42],
 ]],
 ['decoration','rare',180,[
  ['leafroof-acorn-house','잎지붕 도토리집','One complete little acorn cottage with overlapping oversized green leaf roof, round wooden door and honey-lit circular windows, mossy base.',200],
  ['firefly-flower-lamppost','반딧불 꽃등 가로등','Gracefully curved twig lamppost, closed flower-bud lantern giving soft warm yellow light, mossy stone footing.',160],
  ['moss-arch-bridge','이끼 아치 나무다리','Low arched miniature wooden footbridge, simple railings wrapped with small vines and cream flowers, moss on feet.',180],
  ['honey-acorn-teahouse','꿀빛 도토리 찻집','Little acorn teahouse, open serving window with two cups, green leaf awning, honey-lit interior, no signs or letters.',210],
  ['lily-bell-tower','은방울꽃 종탑','Small rustic timber bell tower holding three white lily-of-valley flower bells of different sizes, vines at base.',170],
  ['leafboat-dock','잎배 선착장','Short wooden dock with one tiny tied leaf boat containing a pink petal cushion, entire object isolated without water.',180],
  ['fairy-village-mailbox','요정마을 우편함','Acorn mailbox on short wooden post, one folded pink flower letter protrudes, small warm flower lantern on same mossy footing.',160],
  ['waterlily-pavilion','수련잎 정자','Little pavilion with broad green waterlily-leaf roof, two wooden seats and tiny tea table beneath, complete isolated structure.',180],
 ]],
 ['fish','mythic',3400,[
  ['millennium-lantern-queen','천년등을 품은 요정여왕','Regal but gentle adult humanoid fairy queen, honey-gold flowing hair, rounded acorn crown, elaborate layered emerald leaf gown with ivory petals, four elegant transparent insect wings, cradles an ancient large flower lantern between both hands, the first firefly glowing within.',3500],
  ['village-elder-turtle','여울을 업은 고목거북','Massive gentle swimming turtle, broad ancient woodgrain shell supports a tiny detailed acorn-house fairy village and one old leafy tree, honey-lit windows among roots, sturdy moss-green limbs, clear turtle anatomy, head on right.',3400],
  ['flower-dream-queen','꽃잠의 요정여왕','Gentle adult humanoid fairy queen with flowing cream petal-like hair, elegant pink and ivory layered waterlily gown, sits upon a large partially open pink flower-bud throne with a curved leaf backrest, delicate transparent wings, eyes warmly open, whole throne floating toward right.',3600],
  ['first-firefly-spirit','첫반딧불의 정령','Ancient benevolent firefly spirit: small luminous gold insect body with rounded chest and segmented glowing abdomen, four very large delicate clear veined wings, tiny antennae and six fine legs, warm modest dark eyes, elegant organic firefly anatomy, no humanoid face, no generic stingray form.',3100],
 ]],
]
const refs={cartoon:'assets/references/collectible-style/common-rare-pongi.png',fantasy:'assets/references/collectible-style/epic-mythic-starlight.png'}
const face='Face SCREEN RIGHT in a clear side or side-three-quarter profile. The head, mouth and snout point to the right; the body and tail trail behind to the left. Show forward swimming toward the right, never backward swimming. Keep this exact right-facing orientation in the thumbnail and ALL FOUR animation frames. No left-facing, front-facing, mirrored or alternating-direction frames.'
export const items=groups.flatMap(([kind,rarity,average,entries])=>{
 if(entries.reduce((s,x)=>s+x[3],0)!==average*entries.length)throw Error('Incorrect price average: '+kind+rarity)
 return entries.map(([slug,name,design,price])=>{
  const id='firefly-'+slug,folder=rarity==='common'?'normal':rarity,root=`${kind==='decoration'?'decorations':kind}/${folder}`
  const movement=kind!=='fish'?'fixed':slug==='acorn-lantern-hermit'?'crawl':slug==='waterlily-jellyfish'?'pulse':'swim'
  const min=kind==='trash'?.82:movement==='fixed'?null:movement==='crawl'?.85:['willow-loach','moss-goby','mushroom-sculpin'].includes(slug)?.6:.18
  const max=kind==='trash'?.92:movement==='fixed'?null:movement==='crawl'?.95:['willow-loach','moss-goby','mushroom-sculpin'].includes(slug)?.88:.78
  return {id,name,kind,rarity,sell_price:price,design,movement_type:movement,swim_y_min:min,swim_y_max:max,travel_direction:'both',flip_with_direction:kind==='fish',reference:refs[['common','rare'].includes(rarity)?'cartoon':'fantasy'],thumbnail_path:`${root}/${id}_v1_thumbnail.png`,sprite_sheet_path:kind==='fish'?`${root}/${id}_${rarity==='mythic'?'swim8_':''}v1_sprite.png`:null}
 })
})
export function thumbnailPrompt(item){
 return `Use case: stylized-concept. ONE static isolated game collectible thumbnail for cozy woodland fairy-village fishing region 반딧불 요정여울. Subject: ${item.name}. ${item.design} ${['common','rare'].includes(item.rarity)?'Warm friendly 2D cartoon with thin soft brown colored contours, gentle dimensional warm shading, natural modest eyes, restrained highlights. STYLE reference only; never copy otter anatomy, fur, fishing hook or starfish.':'Elegant soft 2D fantasy illustration, delicate colored contours, refined dimensional gradients, subtle translucent materials, not thick brown cartoon outlines. STYLE reference only for rendering; never copy stingray silhouette, purple palette, stars or ribbon tail.'} ${item.kind==='fish'?face:'Object only, no added face, eyes, limbs or creature. Slight three-quarter view showing complete object and stable base.'} Warm leaf green, honey gold, cream, chestnut and gentle flower colors appropriate to subject. Compact clean readable unique silhouette at small thumbnail scale, centered in square canvas with all extremities within central 80%, ample transparent safe margins. Actual transparent background, clean antialiased alpha edges, no white or black fringe, no checkerboard pixels, no scene, no ground shadow, no unrelated props, no particles, no fog or excessive bloom, no text or UI. Deliver one thumbnail only, not a contact sheet.`
}
export function spritePrompt(item){
 const mythic=item.rarity==='mythic',fairy=item.rarity==='epic'||item.id.includes('queen')
 const motion=item.movement_type==='crawl'?'A continuous natural articulated walking cycle: alternating small leg and claw movements, shell rigid and stable, feet on a constant low baseline.':item.movement_type==='pulse'?'A continuous gentle jellyfish propulsion cycle: bell relaxed, compressing, compressed, expanding; short tentacles follow the water without detached pieces.':fairy?'A continuous delicate fairy swimming/hovering cycle: insect wings slowly flutter, cloth hems and hair tips respond to water, knees and feet subtly trail, hands retain the same prop. Stable head and torso; no large bobbing.':'A continuous gentle forward swimming cycle: tail and species-appropriate fins sweep gradually from neutral to one side, to neutral, to other side. Stable rigid head and body; no waving pectoral fins like arms.'
 const actions=item.id.includes('millennium')?'Frames 5-8: slowly raise the ancient lantern a little, present it with both hands as wing tips spread, lower it, settle back to exactly the neutral holding pose.':item.id.includes('elder-turtle')?'Frames 5-8: gently extend front flippers, widen their sweep while tree leaves and tiny roof leaves sway, draw flippers back, recover neutral. Shell and village architecture remain stable.':item.id.includes('dream-queen')?'Frames 5-8: anticipate with the surrounding throne petals slightly drawn inward, open throne petals outward, bring petals gently inward, recover the original throne shape. Queen head and torso stay anchored.':'Frames 5-8: antennae curve forward, spread the four veined wings a little wider, retract wings and antennae, settle into the initial neutral pose. Glow stays restrained and does not replace physical movement.'
 return `Create a production-ready animated game sprite sheet, NOT a thumbnail. Input reference is the exact SAME individual identity, anatomy, proportions, clothing, prop, colors and rendering to preserve. Subject: ${item.name}. ${item.design} ${mythic?'EXACTLY EIGHT full-body poses arranged in 4 columns x 2 rows of equal SQUARE cells; overall sheet aspect ratio EXACTLY 2:1, wide landscape. Read left to right then second row. Frames 1-4 are continuous basic swimming. '+actions:'EXACTLY FOUR full-body poses arranged in a precise 2 columns x 2 rows of equal SQUARE cells; overall canvas EXACTLY SQUARE. Read left to right then second row.'} ${motion} ${face} Each pose uses EXACT SAME camera, head/torso or rigid shell anchor position inside its cell, body scale, and facing angle. No per-frame recentering or scaling. Neutral last pose should connect naturally to the first. Keep every extremity including wings, lanterns, staff, fins, tail, village and faint highlights WITHIN the central 65 percent of its OWN cell, minimum 12 percent completely transparent margin on ALL FOUR sides of EVERY cell, never cross grid divisions. Keep body and face detailed at source scale. True alpha transparent canvas and transparent cell gutters; NO cell outlines, numbers, words, labels, checkerboard, background, floor, shadows, bubbles, loose particles, broad glow or panel backgrounds. Clean antialiased complete silhouettes, no chopped extremities. Never duplicate a still image across cells or animate only eye state or light. Only ONE sheet.`
}
if(process.argv[1]?.replaceAll('\\','/').endsWith('/prepare-firefly-assets.mjs')){
 mkdirSync(batch,{recursive:true})
 const path=batch+'/manifest.json'
 if(!existsSync(path))writeFileSync(path,JSON.stringify({region_id:'firefly',region_name:'반딧불 요정여울',map_piece_count:8,tool:'image_gen.imagegen',status:'in-progress',items,assets:[]},null,2)+'\n')
 const doc=`# 반딧불 요정여울 이미지 제작\n\n이 배치는 사용자 지정 63종과 해역·장비 이미지를 보존합니다. 일반 장식물 평균가는 사용자 확인한 40골드입니다. 가격·이동 설정·참고 이미지와 최종 프롬프트는 manifest.json을 따릅니다. 승인한 도토리복어와 등지기 요정 시안을 개체 동일성 참고로 사용합니다.\n\n생성 원본을 검수하고 공개 업로드 해시와 원격 카탈로그를 확인하기 전에는 출시 완료로 취급하지 않습니다. 원본은 originals/에 보존하며 업로드 도구에는 최종 파일만 전달합니다.\n`
 if(!existsSync(batch+'/README.md'))writeFileSync(batch+'/README.md',doc)
 if(process.argv.includes('--sprites'))console.log(JSON.stringify(items.filter(i=>i.sprite_sheet_path).map(item=>({id:item.id,path:item.sprite_sheet_path,thumbnail:batch+'/'+item.thumbnail_path,prompt:spritePrompt(item),reference:item.reference,frames:item.rarity==='mythic'?8:4}))))
 else if(process.argv.includes('--tasks'))console.log(JSON.stringify(items.map(item=>({id:item.id,path:item.thumbnail_path,prompt:thumbnailPrompt(item),reference:item.reference}))))
 else console.log(JSON.stringify({batch,count:items.length,groups:groups.map(([kind,rarity,average,entries])=>({kind,rarity,average,count:entries.length}))}))
}
