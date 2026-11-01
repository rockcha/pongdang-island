import fs from 'node:fs'
export const batch='assets/storage-upload/new/20261102-033000'
const groups=[
 ['fish','common',[
 ['taegeuk-minnow','태극기피라미','A slender silver Korean minnow with a red-and-blue taegeuk disc on its flank and delicate black trigram markings near its fins. Clearly fish-shaped, not a rectangular flag.',55,'swim'],
 ['red-devil-puffer','붉은 악마 복어','A round scarlet pufferfish with tiny friendly red supporter horns and white cheek stripes, recognizable puffer fins and small spines.',65,'swim'],
 ['soju-shell-snail','소주병고둥','A small aquatic snail carrying a translucent green Korean soju-bottle-shaped spiral shell with an unlettered white label; small head and crawling foot.',50,'crawl'],
 ['mugunghwa-shrimp','무궁화새우','An elegant pale-pink shrimp with hibiscus-petal tail fins and a pink mugunghwa blossom motif on its shell, fine attached antennae.',60,'swim'],
 ['hangeun-crab','한근 게','A robust warm-red Korean market crab with symmetrical claws and a compact old brass balance weight attached to its back; six small articulated walking legs.',68,'crawl'],
 ['bibimbap-octopus','비빔밥 문어','A friendly warm-brown octopus whose mantle resembles a tiny black stone bibimbap bowl topped with distinct rice, vegetables and fried egg, eight attached arms.',72,'swim'],
 ['ramen-jellyfish','한강라면 해파리','A translucent cream jellyfish with a little red ramen-pot-shaped bell, a bright yolk inside, and wavy noodle tentacles; no disconnected noodles.',62,'pulse'],
 ['dalgona-starfish','달고나불가사리','A five-armed honey-gold starfish resembling crisp Korean dalgona candy, a subtle embossed star in its central disc; natural five arms, no face required.',48,'crawl'],
 ['onggi-conch','장독대소라','A sea snail with a glossy dark-brown Korean onggi fermentation-jar spiral shell, a fitted rounded earthenware lid and a small soft beige head.',58,'crawl'],
 ['kite-ray','연날리기가오리','A small natural manta-like ray with a cream Korean bangpae kite pattern on broad flat fins, red blue central ring and thin kite-ribbon tail, right-facing nose.',68,'swim'],
 ['millstone-snail','맷돌고둥','A low aquatic snail whose shell is two circular porous grey Korean millstones with a tiny wooden handle, recognizable snail head and broad crawling foot.',52,'crawl'],
 ['puffed-rice-urchin','뻥튀기성게','A compact pale-golden sea urchin made of bubbly puffed rice grains with short fine spines; soft edible-looking texture, no invented eyes.',54,'crawl'],
 ['jangseung-goby','장승망둑','A short sandy goby with a carved wooden Korean jangseung guardian-post face pattern and tiny upturned moustache markings, real fins and fish tail.',64,'swim'],
 ]],
 ['fish','rare',[
 ['porcelain-seahorse','도자기해마','A graceful white porcelain seahorse decorated with cobalt Korean blue-and-white vine painting, curled tail and delicate translucent fins.',290,'swim'],
 ['talchum-puffer','탈춤복어','A charming golden pufferfish wearing a small authentic Hahoe-style smiling wooden mask, red and blue dance ribbons flowing behind attached fins.',300,'swim'],
 ['janggu-turtle','장구거북','A small green aquatic turtle carrying an hourglass-shaped Korean janggu drum as its shell, cream drumheads, red braided tension cords and four paddling flippers.',305,'swim'],
 ['hanbok-koi','한복비단잉어','A long elegant koi with flowing ivory and rose hanbok-inspired silk fins, a teal collar and a neat burgundy goreum ribbon attached to its body.',325,'swim'],
 ['seonbi-koi','선비잉어','A dignified white and charcoal koi wearing a recognizable black wide-brimmed Joseon gat hat with translucent brim and tied chin strings, flowing pale robe-like fins.',330,'swim'],
 ['red-devil-squid','붉은 악마 오징어','A scarlet squid with small red cheering horns and ribbon-like fins, compact pale belly and ten attached arms curling naturally.',310,'swim'],
 ['mugunghwa-butterflyfish','무궁화비단나비고기','A side-profile butterflyfish with pale pink hibiscus silk pattern, deep rose throat stripe and flowing soft fins, no literal butterfly wings.',315,'swim'],
 ['tiger-catfish','호랑무늬메기','A broad-headed Korean river catfish with warm orange and black tiger stripes, ivory belly, long paired whiskers and strong swimming tail.',320,'swim'],
 ['pungmul-seabass','풍물농어','A silver river seabass with colorful Korean pungmul ribbons flowing from its dorsal fin and a tiny white sangmo hat, natural fish anatomy.',300,'swim'],
 ['neon-hangul-bream','네온한글도미','A midnight-teal sea bream with clean cyan and pink glowing Hangul consonant shapes ㄱ ㄴ ㄷ ㄹ integrated in scales, compact neon strokes close to its body.',330,'swim'],
 ['pine-turtle','소나무거북','An old moss-green aquatic turtle carrying a miniature windswept Korean pine growing from its rocky shell, rooted trunk and four stable paddling limbs.',310,'swim'],
 ['silla-crown-jellyfish','금관해파리','A pale amber jellyfish crowned with a recognizable Silla gold crown with upright tree-shaped branches and comma-shaped jade pendants, attached fine flowing tentacles.',325,'pulse'],
 ['incense-seahorse','금동향로해마','A bronze-gold seahorse inspired by the Baekje gilt-bronze incense burner: layered mountain-relief body, tiny phoenix crest and dragon-tail base, no loose smoke cloud.',320,'swim'],
 ['seven-branched-blade','칠지도','An ancient bronze seven-branched ritual sword brought to life underwater, one central blade and three small matched side branches on each side, dark handle at left and main blade tip facing right; no eyes or face.',290,'pulse'],
 ]],
 ['fish','epic',[
 ['moon-white-tiger','월영백호','A majestic white Korean tiger swimming through moonlit water, charcoal stripes, long flowing whiskers, silver-blue fur and four anatomically correct paws; full side profile facing right, no wings.',1380,'swim'],
 ['celadon-sea-dragon','청자해룡','An elongated Korean sea dragon of translucent jade celadon porcelain with inlaid white cloud motifs, short branched horns, four small clawed limbs, flowing whiskers and a long complete tail.',1450,'swim'],
 ['taegeuk-twin-fish','태극쌍어','Two elegant koi swimming together as one cohesive paired collectible, one vermilion and one deep blue, both heads facing right and tails trailing left, curved complementary bodies suggesting a taegeuk.',1320,'swim'],
 ['mago-creator','천지를 빚은 태초의 손 · 마고','A wise ancient Korean mother-goddess Mago in layered ivory and earth-red hanbok, silver hair tied back, holding a small formed mountain in both cupped hands; full body facing right with long sleeves flowing gently, no giant detached hands.',1450,'pulse'],
 ['haetae-guardian','서울의 수호신 · 해태','A powerful Korean haetae guardian beast: stocky lion-like scaled body, short single horn, curled mane, broad nose, strong four legs and blue-gold stone-like fur; no western lion wings, side profile facing right.',1400,'swim'],
 ['millennial-gumiho','천년구미호','An elegant white Korean nine-tailed fox with exactly nine individually readable sweeping tails, subtle red ears, a small jade bead held close to chest, refined moonlit fur, four natural legs, profile facing right.',1420,'swim'],
 ['dokdo-guardian','독도의 수호정령','A gentle marine guardian spirit embodying Dokdo twin sea stacks: robust seal-like blue-grey body carrying two small green-topped volcanic rock peaks on its back, white wave mane and clean fins, facing right.',1370,'swim'],
 ['iron-eater-bulgasari','철을 먹고 자라난 재앙 · 불가사리','A formidable Korean folkloric iron-eating Bulgasari beast, clearly NOT a starfish: bear-like torso, elephant-like short trunk, armored bronze and iron plates, tiger paws and ox-like tail; four strong legs and right-facing head.',1440,'crawl'],
 ]],
 ['fish','mythic',[
 ['immortal-turtle-ship','조선의 마지막 방패 · 불멸의 거북선','A magnificent full Korean turtle ship sailing/swimming right: broad wooden hull, domed iron-plated turtle roof with short spikes, dragon head prow breathing a close compact blue-red flame, multiple paired oars and disciplined small naval flags. Historically inspired Korean turtle-ship silhouette, not a European galleon.',3800,'swim'],
 ['hunmin-spirit','스물여덟 글자의 주인 · 훈민성령','A luminous scholarly spirit born from an OPEN cream hanji Hunminjeongeum Haerye book. A serene small human-shaped turquoise-gold light spirit rises from the book wearing a translucent Joseon scholar hat and flowing ivory robe, torso faces right, open book remains anchored below. Crisp Hangul strokes stay close to the book; additional floating letters will be a separate runtime effect.',3850,'pulse'],
 ['ungnyeo-mother','한민족의 첫 번째 어머니 · 시조신모 웅녀','A dignified Korean founding mother goddess Ungnyeo, serene warm face and long black braided hair, ivory and forest-green ancient Korean robe, gentle bear-spirit silhouette woven into her cloak, holding a small mugwort sprig and garlic bulb close to body; complete right-facing full figure, no unrelated crown.',3700,'pulse'],
 ['red-cheer-incarnation','붉은 함성의 화신 · 붉은악마','A colossal benevolent Korean cheering spirit formed of dense scarlet flame, a broad athletic guardian silhouette with two curved red supporter horns, a traditional Korean buk drum held at chest and attached red cheering ribbons. Strong readable right-facing body, no satanic imagery, no generic western demon weapons; warm gold drum rims and red-blue Korean accents.',3800,'pulse'],
 ]],
 ['decoration','common',[
 ['convenience-chair','한강 편의점 의자','A single intact white molded Korean riverside convenience-store plastic chair in three-quarter view.',42],
 ['dolhareubang','돌하르방','A complete small Jeju volcanic-stone dolhareubang guardian statue with round hat, large nose and folded hands.',46],
 ['onggi-jars','장독대','Three Korean dark-brown onggi fermentation jars with round lids on a small low stone base.',45],
 ['bus-stop','버스정류장','A compact Korean city bus shelter with clear glass side panel, teal canopy and a narrow bench; blank sign without text.',48],
 ['flower-palanquin','꽃가마','A small ornate traditional Korean bridal flower palanquin with flower-decorated curved roof, red lacquer body and two carrying poles.',48],
 ['samulnori-set','사물놀이 악기 세트','A neatly arranged complete Korean samulnori ensemble: hourglass janggu, barrel buk, large jing gong and small kkwaenggwari gong, all on a compact mat.',47],
 ['gayageum','가야금','A full traditional wooden Korean gayageum zither with twelve thin strings and individual movable bridges, angled three-quarter view.',45],
 ['daegeum','대금','An intact long bamboo Korean daegeum transverse flute, visible blowing hole and finger holes, subtle red tassel attached.',42],
 ['jing-gong','징','A round warm-brass Korean jing gong hanging on a small dark wooden stand with one padded mallet.',44],
 ['hahoe-mask-display','하회탈 전시대','A recognizably smiling carved Korean Hahoe wooden mask mounted on a small simple dark display stand.',44],
 ]],
 ['decoration','rare',[
 ['haeundae-breakwater','해운대 방파제','A compact miniature Busan Haeundae breakwater of textured grey tetrapods and a small red harbor beacon, isolated complete miniature.',210],
 ['mini-turtle-ship','미니 거북선','An intricate miniature Korean turtle ship with wooden hull, spiked turtle roof and dragon-head prow, small paired oars.',230],
 ['fireworks-launcher','한강 불꽃축제 발사대','A compact riverside fireworks launch rack with several dark tubes and restrained red blue gold unlit rockets; no free-floating explosion.',220],
 ['goguryeo-rider','고구려 기마인물상','A weathered bronze miniature Goguryeo armored horse rider, full horse and rider with a straight modest spear, Korean ancient silhouette.',225],
 ['pensive-bodhisattva','금동미륵보살반가사유상','A respectful miniature gilt-bronze Korean pensive bodhisattva, seated with one leg crossed and one hand gently touching cheek, thin flowing drapery, intact pedestal.',230],
 ['najeon-jewelry-box','나전칠기 보석함','A closed small black lacquer Korean jewelry chest inlaid with iridescent mother-of-pearl cranes and peonies, delicate brass fittings.',225],
 ['sipjangsaeng-screen','십장생도 병풍','A small six-panel Korean folding screen painted with ten longevity motifs: sun, pine, cranes, deer, turtles, mountains and water; self-contained screen, no background scene outside panels.',215],
 ['jangseung-pair','장승 한 쌍','Two traditional Korean carved wooden village guardian posts side by side with expressive guardian faces, one taller one shorter, no lettering.',205],
 ]],
 ['decoration','epic',[
 ['sunken-lotte-tower','침몰한 롯데월드타워','A spectacular complete miniature Seoul Lotte World Tower, slender tapering glass skyscraper with split pointed crown, tasteful attached river plants and small coral at base indicating an underwater relic. Preserve full tower.',980],
 ['submerged-sungnyemun','잠긴 숭례문','An elegant complete miniature Sungnyemun gate: Korean two-tier curved tiled pavilion roof on a wide stone arch gate, subtle moss and aquatic reeds at base.',950],
 ['sleeping-cheomseongdae','잠든 첨성대','A complete beautiful Gyeongju Cheomseongdae ancient stone observatory, tapering stacked-stone bottle shape, square opening and square top frame, lightly mossed base.',880],
 ['sunken-dabotap','가라앉은 다보탑','An intricately rendered complete Korean Bulguksa Dabotap stone pagoda with square platform, octagonal upper structures and delicate stone rails, restrained attached aquatic moss.',930],
 ['submerged-63-building','잠긴 63빌딩','A complete miniature Seoul 63 Building, rectangular slender golden-glass skyscraper with curved top shoulder, soft underwater patina and small attached plants at base.',900],
 ['sunken-independence-gate','가라앉은 독립문','An intact miniature Seoul Independence Gate, pale stone triumphal arch with distinctive central arched opening and modest carved details, attached water plants only at base.',870],
 ['flooded-gwanghwamun','침수된 광화문','A complete miniature Gwanghwamun royal palace gate: three stone arches and broad double-tier Korean pavilion roof with green dancheong beams and red pillars, subtle moss.',970],
 ['admiral-yi-statue','이순신 장군 동상','A majestic bronze Admiral Yi Sun-sin statue standing upright in Korean Joseon naval armor with a sheathed long sword, full plinth and small turtle-ship relief on base, dignified historical monument.',980],
 ]],
 ['trash','common',[
 ['discarded-duck-boat','한강오리배','An abandoned small white Han River duck pedal boat, scratched yellow beak and faded orange seat, a little algae; full object, no person.',20],
 ['wet-transit-card','젖은 교통카드','One waterlogged Korean contactless transit card, teal and cream, slightly bent corners and faded blank printed shapes, no readable card number.',15],
 ['dented-ramen-pot','찌그러진 라면냄비','A dented small brass-colored Korean ramen pot with two ear handles and battered lid resting against it.',18],
 ['broken-cheering-stick','부러진 응원봉','A broken red-blue Korean cheering lightstick with snapped handle and a few attached exposed wires, no separate loose fragments.',16],
 ['old-karaoke-microphone','낡은 노래방 마이크','An old battered Korean karaoke microphone with a dented steel mesh head, faded silver body and short frayed cord.',18],
 ['broken-soju-glass','깨진 소주잔','One chipped small clear Korean soju shot glass, visible safe rounded chipped rim and algae tint, no spilled drink or loose shards.',14],
 ['old-100-won','오래된 100원 동전','A single old tarnished silver Korean 100-won coin with modest worn admiral relief, scratched surface, recognizable round coin.',17],
 ['old-1000-won','오래된 1000원 지폐','A visibly damaged faded blue Korean 1000-won banknote, crumpled and waterlogged with torn corners, game-style simplified nonfunctional currency illustration.',20],
 ['wet-taegeukgi','젖은 태극기','A small wet worn South Korean flag attached to a short broken pole, white cloth with correct red-over-blue taegeuk and four black trigrams, gently drooping.',17],
 ['wet-exam-book','젖은 수능 문제집','A swollen water-damaged Korean exam study workbook with bent pages and faded blank cream cover, a few indistinct study marks without readable text.',16],
 ['broken-backscratcher','부러진 효자손','An old bamboo Korean backscratcher with a small hand-shaped end and visibly snapped handle still joined by frayed fibers.',14],
 ]],
 ['trash','rare',[
 ['last-pager','한강의 마지막 삐삐','An old 1990s Korean black pager with cracked tiny LCD, worn clip and faint green display, no readable numbers.',110],
 ['olympic-badge','서울올림픽 기념 배지','A tarnished vintage Seoul sports-festival commemorative enamel pin with a simplified friendly orange tiger and blue-red ribbon, worn metal edges; no exact official logo or words.',115],
 ['broken-celadon-censer','깨진 청자 향로','A chipped pale-jade Goryeo celadon incense burner with broken lid handle, worn crackle glaze, complete compact object.',100],
 ['hangul-woodblock-fragment','한글이 새겨진 목판 조각','A single dark old Korean printing-woodblock fragment with shallow carved early Hangul ㄱ ㄴ ㄷ and worn edges; visible wood grain.',108],
 ['rusted-turtle-ship-iron','거북선의 녹슨 철편','One riveted curved iron roof plate fragment from a Korean turtle ship, rusty brown patina and one short worn defensive spike.',105],
 ['hanyang-map-fragment','오래된 한양 지도 조각','A torn fragment of old Korean hanji Hanyang city map with faded ink mountain ridges, a river and a walled palace plan; no modern text.',110],
 ['moon-porcelain-shard','달빛을 머금은 백자 파편','A single curved shard of Korean moon-white porcelain holding a restrained pearly moonlight sheen along its glazed edge.',112],
 ['rusted-cash-bundle','조선의 녹슨 엽전 꾸러미','A compact bundle of aged Korean brass cash coins with square center holes threaded on frayed cord, green patina and rust-colored stains.',105],
 ]],
]
export const items=groups.flatMap(([kind,rarity,entries])=>entries.map(([slug,name,design,sell_price,movement='fixed'])=>{
 const id=`hangang-${slug}`,folder=rarity==='common'?'normal':rarity,dir=kind==='decoration'?'decorations':kind
 const floor=movement==='crawl',fish=kind==='fish'
 return {id,kind,rarity,name,design,sell_price,native_region_id:'hangang',movement_type:movement,swim_y_min:fish?(floor?.86:movement==='pulse'?.28:.2):kind==='trash'?.86:null,swim_y_max:fish?(floor?.96:movement==='pulse'?.75:.78):kind==='trash'?.96:null,speed:fish?(floor?.009:movement==='pulse'?.007:.02):kind==='trash'?.001:0,size:rarity==='mythic'?170:rarity==='epic'?115:rarity==='rare'?78:55,flip_with_direction:fish,travel_direction:fish?'right':'both',thumbnail_path:`${dir}/${folder}/${id}_v1_thumbnail.png`,sprite_sheet_path:fish?`${dir}/${folder}/${id}${rarity==='mythic'?'_swim8':''}_v1_sprite.png`:null,frames:fish?(rarity==='mythic'?8:4):1,reference:`assets/references/collectible-style/${rarity==='epic'||rarity==='mythic'?'epic-mythic-starlight':'common-rare-pongi'}.png`}
}))
export function thumbnailPrompt(i){return `Use case: stylized-concept. A single Korean-themed ${i.rarity} collectible for Han River Lantern Ferry fishing game. SUBJECT: ${i.design} Reference image is STYLE ONLY: do not copy its animal, silhouette, props or background. ${i.rarity==='common'||i.rarity==='rare'?'Warm friendly Pongi cartoon illustration, thin soft brown contours, clean warm cel shading, subtle dimensional highlights, natural species proportions and small expressive eyes. No giant glitter eyes, thick black outlines or plastic toy shine.':'Refined softly painted fantasy illustration with thin colored edges, sculptural gradients, convincing rich materials and restrained close glow. Not a cartoon animal with added gems. Do not copy the reference ray silhouette or purple-star theme.'} ${i.kind==='fish'?'Head/nose or leading end clearly faces SCREEN RIGHT, tail trails LEFT; complete side or side-three-quarter profile.':'Complete three-quarter object view, no invented faces or eyes.'} Center complete subject within central 72 percent of a square canvas, at least 12 percent transparent margin all sides, no cropped tips. True clean alpha transparent background, no scene, water, floor, broad cast shadow, checkerboard, labels, watermark, border or loose particles. Cultural motif is Korean, never Chinese or Japanese costume. One subject only, not an animation sheet.`}
export function spritePrompt(i){return `NEW production animation sheet of the EXACT same character in the approved thumbnail. Reference 1 is character identity; reference 2 is placement guide only. ${i.frames===8?'EXACT 4 columns x 2 rows, eight equal SQUARE cells on a wide 2:1 canvas.':'EXACT 2 columns x 2 rows, four equal SQUARE cells on a square canvas.'} ${i.design} All poses face SCREEN RIGHT, rigid head/body anchor and scale fixed in all cells. Entire subject and all appendages occupy central 60 percent of EVERY cell, at least 15 percent clean transparent margin in every direction. Never overlap borders. ${i.movement_type==='crawl'?'Small natural alternating walking steps of the attached feet/arms; keep rigid shell/body and head anchored.':i.movement_type==='pulse'?'Gentle continuous contraction and release of soft body, flowing sleeves/tentacles and attached ribbons; keep rigid head/chest/book anchor fixed.':'A continuous forward propulsion cycle: tail, flippers, cloth or oars articulate through four connected poses; keep head and rigid body fixed. No whole-body bobbing.'} ${i.frames===8?'Frames 1-4 basic motion. Frames 5-8 anticipation, distinct physical action, return, and neutral recovery. '+(i.id.includes('turtle-ship')?'Oars draw back, sweep together, return; dragon jaw opens slightly then closes and small flags flutter.':i.id.includes('hunmin')?'The spirit raises both hands, gently opens the anchored book wider, lowers hands and returns; sleeves follow smoothly.':i.id.includes('ungnyeo')?'Gently present the mugwort sprig with an articulated hand, draw it back to chest and settle, cloak trailing naturally.':'Raise the drum mallet, strike the attached drum, lower the mallet and recover, flame silhouette remains dense and contained.'):'Read left-to-right then top-to-bottom as one seamless loop.'} Preserve exact anatomy, colors, costume, number of limbs and species identity. Real different connected poses, no duplicated stills or light-only variation, no per-frame zoom or recentering. True alpha transparency, no background, grid lines, text, numbers, shadows, particles or broad glow. All frame extremities and alpha remain inside cells.`}
if(process.argv[1]?.replaceAll('\\','/').endsWith('/prepare-hangang-assets.mjs')){
 fs.mkdirSync(batch,{recursive:true});fs.mkdirSync(batch+'/sources',{recursive:true})
 if(!fs.existsSync(batch+'/manifest.json'))fs.writeFileSync(batch+'/manifest.json',JSON.stringify({region_id:'hangang',region_name:'한강의 불빛나루',tool:'built-in image_gen',status:'in-progress',map_piece_count:6,map_piece_rarities:['common','common','rare','rare','epic','epic'],items,assets:[]},null,2)+'\n')
 const jobs=items.map(i=>({id:i.id,type:'thumbnail',prompt:thumbnailPrompt(i),reference:i.reference,destination:`${batch}/${i.thumbnail_path}`}))
 fs.writeFileSync(batch+'/generation-jobs.json',JSON.stringify(jobs,null,2)+'\n')
 console.log(JSON.stringify({batch,items:items.length,fish:items.filter(i=>i.kind==='fish').length,jobs:jobs.length}))
}
