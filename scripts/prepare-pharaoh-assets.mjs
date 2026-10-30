import fs from 'node:fs'
export const batch='assets/storage-upload/new/20261030-044000'
const groups=[
 ['fish','common',55,[
 ['gold-medaka','사금비늘 송사리','Slender medaka with tiny gold-dust scales and translucent cream fins.',45,'swim'],
 ['brick-hermit','모래벽돌 소라게','Real hermit crab carrying a tiny stepped sandstone brick shell.',50,'crawl'],
 ['papyrus-billfish','파피루스 잎새치','Slender little billfish with papyrus-leaf dorsal sail and long pointed snout.',55,'swim'],
 ['papyrus-seahorse','파피루스 해마','Natural small seahorse with papyrus ivory leaf crown and parchment fins, curled gold-banded tail, amber eye.',60,'swim'],
 ['scorpion-crab','사막전갈 게','Sandy crab with real crab legs and two claws, a short segmented scorpion tail curled over back.',60,'crawl'],
 ['glyph-starfish','상형문자 불가사리','Five-armed ochre starfish with simple small carved Egyptian symbol markings.',45,'crawl'],
 ['coin-clam','황금주화 조개','Small cream clam partly open, round gold coin-shaped inner shell, no human face.',50,'fixed'],
 ['nile-puffer','나일강 복어','Natural sandy golden Nile pufferfish, small eyes, cream belly and ochre spots.',55,'swim'],
 ['sand-ray','모래지느러미 가오리','Compact natural stingray with sandy spotted diamond body and short thin tail, no giant wing ribbons.',60,'swim'],
 ['oasis-carp','오아시스 잉어','Elegant cream carp with honey-gold scale patches and flowing pale sand fins.',65,'swim'],
 ['sarcophagus-crab','석관 집게게','Small real crab with a tiny carved sandstone sarcophagus covering its back, two broad claws.',60,'crawl'],
 ['tomb-shrimp','도굴꾼 새우','Little tan shrimp with curled tail, small worn linen head wrap and tiny pick tucked alongside shell.',50,'swim'],
 ['oil-bottle-eel','향유병 속 꼬마장어','Tiny cream eel peeking from a small translucent amber perfume bottle, tail curled beside bottle.',60,'swim'],
 ]],
 ['fish','rare',280,[
 ['royal-cobra','왕가의 코브라','Aquatic ivory-gold cobra, expanded hood with elegant golden royal bands, coiled serpentine body.',290,'swim'],
 ['glyph-cuttlefish','상형문자 갑오징어','Golden cuttlefish, flat oval mantle, short curled arms and small Egyptian pictogram markings.',260,'swim'],
 ['mummy-eel','석관에서 깨어난 미라장어','Long cream eel wrapped loosely in aged linen, emerging from miniature open stone sarcophagus.',300,'swim'],
 ['gold-catfish','황금비늘 메기','Natural catfish with broad head, long whiskers and subtle gold scales on sandy body.',270,'swim'],
 ['pyramid-conch','피라미드 소라','Living conch with stepped pyramid-shaped sandy shell, small amber animal foot emerging.',280,'crawl'],
 ['sun-disc-jelly','태양원반 해파리','Translucent warm amber jellyfish, flat sun-disc bell with gold radial segments and short cream tentacles.',280,'pulse'],
 ]],
 ['fish','epic',1200,[
 ['gold-nile-crocodile','황금갑옷의 나일악어','Majestic long Nile crocodile in sculpted antique-gold Egyptian armor, strong natural reptile anatomy.',1150,'swim'],
 ['moon-bastet','달그림자 바스테트','Regal slender dark umber Egyptian cat goddess in feline form, ivory crescent collar and gold bangles, graceful paws.',1200,'crawl'],
 ['sand-spirit','사막의 모래정령','Elegant spirit formed of coherent swirling pale sandstone ribbons, expressive amber mask, tapering sand body, no detached dust.',1100,'pulse'],
 ['sleepless-sphinx','잠들지 않는 스핑크스','Magnificent sandstone sphinx with lion body, pharaoh face, striped gold nemes and awake amber eyes, walking.',1250,'crawl'],
 ['cursed-gold-octopus','저주받은 황금 문어','Powerful eight-armed octopus with deep ochre skin, antique gold engraved mantle, luminous amber curse seals on arms.',1250,'swim'],
 ['sand-whale','사막을 삼키는 모래고래','Massive streamlined warm sandstone whale with dune-like dorsal ridges, gold seams and broad cream flukes.',1300,'swim'],
 ['tomb-serpent-shark','왕릉을 지키는 모래뱀상어','Long sand-colored shark with serpentine tapering tail, strong shark head and fins, engraved gold royal crest.',1150,'swim'],
 ]],
 ['fish','mythic',3400,[
 ['solar-scarab','태양을 굴리는 스카라베','Divine colossal golden scarab with six articulated legs, elegant carved wing cases partly open, pushing one glowing warm amber sun sphere closely ahead to right. Sandstone ivory and sculpted antique gold, majestic insect anatomy.',3300,'crawl'],
 ['gatekeeper-anubis','황금해의 문지기 아누비스','Tall majestic jackal-headed Egyptian guardian deity in warm umber, ornate sandstone ivory and antique gold pharaoh armor, long ears, ankle-length segmented gold kilt, holds a slim gold was scepter; noble right-facing three-quarter pose.',3500,'crawl'],
 ['obelisk-colossus','오벨리스크 거신','Monumental sandstone and gold pharaoh colossus, distinct pharaoh-mask head with tall obelisk crown, two obelisks behind shoulders, long athletic legs, broad gold collar, one powerful hand forward, warm amber eyes.',3500,'crawl'],
 ['gold-wing-horus','황금 날개의 호루스','Regal falcon-headed Egyptian god with an elegant humanoid armored torso, two large layered gold falcon wings, sandstone ivory robes and gold solar crown, dignified right-facing hovering pose, finely feathered wings.',3300,'swim'],
 ]],
 ['trash','common',15,[
 ['chipped-pottery','이 빠진 토기 조각','One chipped terracotta pottery shard with a partial cream rim.',12],
 ['torn-papyrus','찢어진 파피루스','Torn sandy papyrus scroll with faded abstract ink marks, no readable text.',14],
 ['worn-scribe-brush','반쯤 닳은 서기관 붓','Worn reed scribal brush with frayed brown bristles and ink-stained tip.',13],
 ['handleless-jug','손잡이 빠진 물동이','Worn terracotta water jug with visibly broken missing handle.',16],
 ['frayed-linen-fan','날 풀린 아마포 부채','Fraying linen hand fan on small weathered wood handle.',15],
 ['dull-bronze-mirror','빛을 잃은 청동 거울','Dull scratched bronze hand mirror with round unreflective face.',18],
 ['torn-grain-sack','구멍 난 곡물 자루','Small worn linen grain sack with a clearly visible torn hole.',14],
 ['broken-reed-rod','부러진 갈대 낚싯대','Short broken reed fishing rod with snapped end and tangled linen line.',15],
 ['wheel-less-cart','바퀴 빠진 나무 수레','Small worn Egyptian wooden handcart missing one wheel, empty bed.',18],
 ]],
 ['trash','rare',90,[
 ['half-gold-mask','반쪽짜리 황금 가면','Half of a damaged antique gold pharaoh funerary mask, clear broken edge, no blue inlays.',100],
 ['open-perfume-bottle','마개 잃은 향유병','Elegant old amber perfume bottle with missing stopper and dusty neck.',85],
 ['rusty-tomb-pick','녹슨 도굴꾼의 곡괭이','Rusty ochre iron pickaxe with aged wooden handle.',90],
 ['gnomon-less-sundial','바늘 없는 해시계','Cracked circular sandstone sundial plate with missing central gnomon.',85],
 ['peeled-ritual-oar','금박이 뜯긴 의식용 노','Weathered short ceremonial oar with patchy peeling gold leaf and carved lotus paddle.',90],
 ]],
 ['decoration','common',40,[
 ['reed-boat-model','갈대배 모형','Intact miniature Egyptian reed boat with simple cream linen sail, no water.',38],
 ['papyrus-column','파피루스 꽃기둥','Small intact sandstone column topped with papyrus flower capital and restrained gold bands.',42],
 ['lotus-water-jar','연꽃무늬 물항아리','Intact cream terracotta water jar with ochre lotus motif and gold rim.',40],
 ['sand-egg-box','모래빛 새알 보관함','Small sandstone-colored lidded egg storage box open to show three ivory bird eggs.',38],
 ['three-pot-shelf','세 칸짜리 토기 선반','Small three-compartment sandstone shelf with three little terracotta jars.',42],
 ['baby-croc-stone','꼬마 악어 돌조각','Little sandstone crocodile statuette on a tiny integral stone foot.',40],
 ]],
 ['decoration','rare',190,[
 ['little-sphinx','꼬마 스핑크스 석상','Intact little sandstone sphinx statue with neat gold nemes stripes.',200],
 ['horus-eye-tablet','호루스의 눈 석판','Small rectangular sandstone tablet with a sculpted antique gold Eye of Horus relief.',190],
 ['royal-lotus-lamp','왕가의 연꽃 등잔','Refined golden lotus oil lamp with small warm amber flame.',190],
 ['sleeping-cat-guardian','잠든 고양이 수호상','Curled sleeping sandstone cat guardian statue with gold collar.',180],
 ['crescent-incense','초승달 향로','Small antique gold crescent-shaped incense burner, closed pale stone bowl, no smoke.',180],
 ['sun-holding-hands','태양을 받드는 두 손','Two sculpted sandstone hands holding one small polished golden sun disc.',200],
 ['four-pillar-altar','네 기둥의 작은 봉헌대','Small complete sandstone votive altar with four columns and gold lotus trim.',190],
 ]],
 ['decoration','epic',800,[
 ['sunken-pyramid','가라앉은 거대 피라미드','Magnificent intact pale sandstone pyramid with golden capstone, small carved entrance and elegant gold seams, isolated complete structure.',850],
 ['sand-obelisk','모래빛 오벨리스크','Elegant tall sandstone obelisk with gold pyramidion, carefully engraved Egyptian reliefs and compact attached stone footing.',750],
 ]],
]
const refs={cartoon:'assets/references/collectible-style/common-rare-pongi.png',fantasy:'assets/references/collectible-style/epic-mythic-starlight.png'}
export const items=groups.flatMap(([kind,rarity,average,entries])=>{
 if(entries.reduce((n,e)=>n+e[3],0)!==average*entries.length)throw Error('Average mismatch '+kind+rarity)
 return entries.map(([slug,name,design,price,motion='fixed'])=>{
 const id='pharaoh-'+slug,folder=rarity==='common'?'normal':rarity,dir=kind==='decoration'?'decorations':kind
 return {id,kind,rarity,name,design,sell_price:price,native_region_id:'pharaoh',movement_type:motion,swim_y_min:kind==='decoration'?null:motion==='fixed'||motion==='crawl'?0.86:0.22,swim_y_max:kind==='decoration'?null:motion==='fixed'||motion==='crawl'?0.96:0.76,speed:kind==='decoration'?0:motion==='fixed'?0.001:motion==='crawl'?0.009:motion==='pulse'?0.008:0.02,size:rarity==='mythic'?170:rarity==='epic'?115:rarity==='rare'?78:55,flip_with_direction:kind==='fish'&&motion!=='fixed',travel_direction:kind==='fish'?'right':'both',thumbnail_path:`${dir}/${folder}/${id}_v1_thumbnail.png`,sprite_sheet_path:kind==='fish'?`${dir}/${folder}/${id}${rarity==='mythic'?'_swim8':''}_v1_sprite.png`:null,reference:rarity==='epic'||rarity==='mythic'?refs.fantasy:refs.cartoon,frames:kind==='fish'?(rarity==='mythic'?8:4):1}
 })
})
export function thumbnailPrompt(i){
 const cartoon=i.rarity==='common'||i.rarity==='rare'
 const style=cartoon
  ?'CUTE FRIENDLY CARTOON, matching the provided Pongi cartoon reference: appealing gently rounded simplified shapes, clear soft BROWN cartoon contour, warm clean CEL SHADING with gentle dimensional highlights, charming approachable expression where the species has a face. Keep recognizable species anatomy and proportionate eyes with a small natural highlight. Do not turn this into a realistic animal study, photoreal rendering, serious biological illustration or ornate fantasy concept painting. Do not exaggerate into giant glitter eyes, excessively thick outlines, inflated toy bodies or plastic shine. Rare uses the SAME cute cartoon style as common; distinguish it through its own motifs and materials, not a different rendering style. Objects without eyes stay objects, never add arbitrary faces.'
  :'Beautiful refined fantasy illustration matching the starlight reference rendering: softly colored thin edges, sculptural gradient shading, elegant rich materials and restrained close-to-body glow. Epic and mythic use this distinct refined illustration style, not the Pongi cartoon with extra jewels. Do not copy ray anatomy, ribbon tails, purple colors or star patterns from the style reference.'
 return `Use case: stylized-concept. One ${i.rarity} game collectible: ${i.design} Theme: Pharaoh's Golden Sea. Palette strictly warm sand, papyrus ivory, ochre, antique gold, amber and umber. NO blue, cyan, turquoise, purple or green. Reference is STYLE ONLY, never copy its species, props, silhouette or checkerboard. ${style} ${i.kind==='fish'?'Face clearly SCREEN RIGHT in side or side-three-quarter profile; head on right, tail trailing left.':'Show complete intact object in clear three-quarter view, except trash damage explicitly described.'} Entire subject centered occupying only 76 percent canvas, generous transparent margin all sides, no cropped extremities. True transparent background, no ground shadow, scenery, loose particles, labels, letters, watermarks, grid, border, checkerboard or matte fringe. One image, not a sheet.`
}
export function spritePrompt(i){const myth=i.rarity==='mythic';return `Production game animation sheet for EXACT same individual as reference thumbnail: ${i.design} Reference 1 is identity, reference 2 is placement guide only. Preserve anatomy, colors, camera, exact head/rigid torso anchor and body scale in all cells. ${myth?'EXACTLY 8 full-body poses, 4 columns x 2 rows of equal SQUARE cells, wide 2:1 canvas.':'EXACTLY 4 full-body poses, 2 columns x 2 rows of equal SQUARE cells, square canvas.'} All face SCREEN RIGHT, never mirrored. ${i.movement_type==='fixed'?'A gentle clam shell opening cycle: closed a little, half open, slightly wider, return half open; lower shell and gold coin position stay anchored.':i.id.includes('starfish')?'Natural starfish crawling cycle: five arms softly flex at tips in connected poses, stable central disc, no added legs or human arms.':i.id.includes('octopus')?'Natural octopus propulsion cycle: eight attached arms curl gradually and softly unfurl while mantle remains stable.':i.movement_type==='crawl'?'Natural walking: articulated legs move in small alternating steps; stable head and rigid shell/torso, constant feet baseline.':i.movement_type==='pulse'?'Bell/spirit body gently contracts and expands with trailing attached tentacles/ribbons.':'Natural forward swimming: tail, fins or wings sweep gently through four physical poses; stable head and rigid body, no large bobbing.'} ${myth?'Frames 1-4 basic locomotion. Frames 5-8: '+(i.id.includes('scarab')?'front legs brace, gently roll attached sun sphere forward, return sphere and legs, settle neutral.':i.id.includes('anubis')?'raise scepter slightly, present it with deliberate wrist and arm articulation, lower it, recover neutral.':i.id.includes('colossus')?'slowly extend the forward palm, spread fingers a little, retract fingers and hand, settle into neutral stance; shoulder stone structures remain stable.':'slightly gather feathered wings, extend them majestically in one coordinated sweep, retract wings, settle neutral.'):'Frames read left-to-right top-to-bottom as one continuous loop.'} Entire figure including longest tips stays within central 60 percent of EACH cell, at least 15 percent completely transparent margin on all four sides of EVERY cell. Head/torso anchor identical in each cell, no per-frame recenter/scale, neutral final frame connects to first. Draw real physical changes, not identical copies or light-only animation. Warm sand + gold + amber only, absolutely no blue/cyan/green/purple. Clean true alpha transparency, no scenery, ground, cell borders, lettering, numbers, particles, checkerboard, diffuse glow or shadows. Never overlap cell boundaries.`}
if(process.argv[1]?.replaceAll('\\','/').endsWith('/prepare-pharaoh-assets.mjs')){
 fs.mkdirSync(batch,{recursive:true}); const p=batch+'/manifest.json'
 if(!fs.existsSync(p))fs.writeFileSync(p,JSON.stringify({region_id:'pharaoh',region_name:'파라오의 황금해',tool:'built-in image_gen',status:'in-progress',map_piece_count:4,map_piece_rarities:['rare','rare','epic','epic'],items,assets:[]},null,2)+'\n')
 if(process.argv.includes('--tasks'))console.log(JSON.stringify(items.map(i=>({id:i.id,path:i.thumbnail_path,reference:i.reference,prompt:thumbnailPrompt(i)}))))
 else console.log(JSON.stringify({batch,count:items.length,groups:groups.map(([kind,rarity,average,entries])=>({kind,rarity,average,count:entries.length}))}))
}
