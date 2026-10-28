import fs from 'node:fs'
import path from 'node:path'
import sharp from 'sharp'
import {createHash} from 'node:crypto'
export const root='assets/storage-upload/new/20261029-055051'
export const reference='assets/storage-upload/new/20261029-054632/fish/epic/atlantean-guard-shark-bluegold-concept-v2_thumbnail.png'
const guides='artifacts/starruins-bluegold-guides'
const read=p=>JSON.parse(fs.readFileSync(p,'utf8').replace(/^\uFEFF/,''))
const write=(p,v)=>fs.writeFileSync(p,JSON.stringify(v,null,2)+'\n')
const manifestFile=root+'/manifest.json'
const command=process.argv[2]
if(command==='prepare'){
 fs.mkdirSync(root+'/sources',{recursive:true})
 const old=read('assets/storage-upload/new/20261015-213344/species.json').filter(s=>s.native_region_id==='starruins')
 const design={
 'tile-fitting-crab':'A small living blue crab with six visible walking legs and two small claws, carrying one square cobalt ceramic mosaic tile on its shell, yellow curved wave inlay. Natural crab anatomy, right-facing three-quarter.',
 'teacup-nest-blenny':'A tiny sky-blue blenny peeking out of a cracked lapis-blue royal teacup with a broken handle, warm yellow rim and curved yellow scroll ornament. Small fish head looks right, cup fully visible.',
 'cracked-perfume-vial':'A tiny cracked cobalt-blue glass perfume vial with two small loop handles, worn golden-yellow stopper and simple yellow wave filigree, a little pale sediment inside. One complete small ancient object.',
 'lost-atlantean-crown':'A lost ancient royal crown made of worn warm yellow gold with small lapis-blue ceramic inserts, one empty stone socket and restrained wave-shaped scroll relief, one short blue seaweed strand. No weapon or trident shapes.',
 'amphora-home-octopus':'A small blue living octopus wearing a broken rounded lapis ceramic amphora as a helmet, small yellow curved waves on the pot, natural compact eight arms gathered beneath, calm eye looks right. Clearly octopus and amphora, not humanoid.',
 'broken-kingdom-tile':'One broken cobalt and sky-blue ancient kingdom mosaic tile fragment with warm yellow flowing wave inlay, chipped pale stone edges, one tiny barnacle. Abstract curve decoration only.',
 'sunken-kingdom-fountain':'A complete miniature ancient seashell fountain, cobalt and pale blue ceramic basin on a low pale stone base, golden-yellow curved wave ornaments and a simple curved SHELL spout, a thin attached arc of pale water flowing into basin. No trident spout.',
 'azure-armored-sea-turtle':'A living sea turtle with lapis-blue shell plates edged warm golden yellow, simple curved yellow wave inlays, pale sky-blue skin and four natural flippers. Readable natural sea turtle anatomy, head right and shell trailing left.',
 'templekeeper-moray':'A long slender blue living moray eel, broad blunt eel head on right, tapering sinuous body trailing left, thin dorsal ridge, pale sky-blue jaw, sparse yellow curved wave markings along blue skin. No arms, wings or armor suit.',
 'mask-changing-octopus':'A small living cobalt-blue octopus holding one small ancient pale-blue theater mask with golden-yellow curved trim in a short arm beside its cheek; natural eight compact arms, right-facing head. Mask stays beside face without hiding eye.',
 'letter-carrier-ray':'A living blue stingray with natural broad diamond-shaped disc, pale sky-blue underside, restrained golden-yellow curved wave markings, a small blue shell mail satchel beneath belly and one little rolled pale letter. Head at right and thin tail trailing left. No shark silhouette.',
 'atlantean-guard-shark':'The approved exact blue and yellow shark with the curved-wave forehead ornament, NO trident. Preserve its design exactly.',
 'living-mosaic-ray':'An elegant natural ray with a broad low diamond-shaped disc composed of flexible lapis-blue and pale sky-blue mosaic scales, warm golden-yellow curved inlay between selected tiles, pale underside and a slender tail left. Head right. No huge upward wings or ribbon tail.',
 'palace-lantern-anglerfish':'A rounded deep cobalt-blue anglerfish with a modest natural eye, pale-blue jaw and warm yellow curved scroll markings. Its bent natural lure stalk holds one small golden palace lantern with blue glass panels and short dangling crystal pendants. Head and mouth right, little tail left, friendly mysterious expression.',
 'atlantean-giant-squid':'A grand long blue giant squid, tapered lapis mantle trailing left, small right-facing head, two triangular mantle fins, eight flowing blue arms and two longer feeding tentacles extending toward right, sky-blue undersides, restrained golden-yellow curved inlays on mantle and fin edges. Clearly elongated squid anatomy, no ray wings.',
 'atlantean-sentinel':'A full-body ancient underwater automaton guardian knight, upright on two planted feet, cobalt-blue ceramic articulated armor with warm golden-yellow trim and abstract curved wave inlays, pale stone joints, deep-blue flowing cape, a small blue-and-yellow shell-shaped shield and one simple rounded-top ceremonial staff. Helmet faces right. NO trident anywhere, no three-pronged weapon, no heraldic pictogram. Complete feet and staff tip visible.'
 }
 const motions={
 'tile-fitting-crab':'Small alternating walking-leg steps beneath rigid tile and shell; claws flex slightly. Shell remains level; no body bounce.',
 'teacup-nest-blenny':'Cup and fish head anchor remain absolutely stationary; small paired pectoral fins flutter and short exposed tail tip responds to water. No head peeking up and down.',
 'amphora-home-octopus':'Amphora and head stay rigid; lower arm tips gather, gently extend and relax in a compact propulsion loop. No mantle lifting.',
 'sunken-kingdom-fountain':'Stone pedestal, basin and spout stationary; only thin attached water arc and contained basin ripples change smoothly. No jumping detached drops.',
 'azure-armored-sea-turtle':'Four natural flippers execute small coordinated propulsion strokes; rigid shell, neck and head remain level and fixed. No one-sided arm flap.',
 'templekeeper-moray':'A shallow traveling wave moves only along rear two thirds and dorsal fin ridge; rigid head and front quarter remain at identical coordinates.',
 'mask-changing-octopus':'Lower arm tips gather and release gently, mask-holding arm tilts mask very slightly without hiding face; rigid head and eye fixed.',
 'letter-carrier-ray':'Small continuous wave in disc outer margins and tail tip, strap softly responds; central disc and head fixed. No large wing flaps.',
 'atlantean-guard-shark':'Restrained tail propulsion: tail neutral, gently flexed one side, neutral passing, gently opposite side. Tiny fin-tip water response; rigid face, armored chest and dorsal root fixed. No flapping pectoral fins.',
 'living-mosaic-ray':'A shallow wave travels through flexible outer mosaic disc edges, tail tip follows gently; face and central mosaic body anchor fixed. No torso rotation.',
 'palace-lantern-anglerfish':'Tail gently beats and tiny fins move; lure stalk bends a little and lantern pendants sway subtly; rigid eye/head/body fixed. No whole-lantern flashing or head movement.',
 'atlantean-giant-squid':'Tentacle tips gather and release in gentle jet-propulsion phases, narrow mantle-fin edges ripple; rigid eye, head and central mantle fixed, no whole-body squeezing or rising.',
 'atlantean-sentinel':'Frames0-3: cape hem and waist ribbons flow in a small current, armor joints and planted feet fixed. Frames4-7: fingers gently tighten around staff, shield wrist tilts slightly outward, returns, then neutral recovery. Helmet/chest/pelvis/feet and staff stay at identical coordinates throughout. No stepping, head turn, whole-body bounce or brightness-only animation.'
 }
 const items=old.map(s=>{
  const kind=s.id==='cracked-perfume-vial'?'decoration':s.kind
  const folder=(kind==='decoration'?'decorations':kind==='trash'?'trash':'fish')+'/'+(s.rarity==='common'?'normal':s.rarity)
  const frames=s.kind==='trash'?1:s.rarity==='mythic'?8:4
  const sprite=frames>1?`${folder}/${s.id}${frames===8?'_swim8_bluegold_v2':'_bluegold_v2'}_sprite.png`:null
  const style='Soft polished storybook fantasy game painting matching the approved reference: rich cobalt/lapis blue, pale sky-blue underside, warm yellow-gold curved ornaments, tactile blue ceramic and brushed soft gold, soft colored contours, dimensional smooth gradients, readable friendly proportions. The reference is STYLE AND PALETTE ONLY, never copy its shark anatomy into this subject. Keep species identity and distinct body proportions. No trident, three-pronged symbols, letters or heraldic logos; only simple flowing yellow wave/spiral decorations. No heavy black outlines, plastic toy render or detached sparkle.'
  const thumbnailPrompt=`ONE isolated square collectible thumbnail: ${design[s.id]} ${style} ${kind==='fish'?'Face SCREEN RIGHT, head/front on right and body/rear left; no front-facing or left-facing animal.':''} Whole subject inside central 78% of canvas, generous alpha padding on all sides. True transparent alpha PNG, clean antialiasing, no white/black matte fringe, background, checkerboard, scenery, external shadow, dust, grid, text or watermark.`
  return {...s,kind,frames,design:design[s.id],motion:motions[s.id]??'static',movement_type:s.id==='atlantean-sentinel'?'fixed':s.movement,swim_y_min:s.movement==='fixed'?.84:s.movement==='crawl'?.84:s.movement==='pulse'?.3:.2,swim_y_max:s.movement==='fixed'?.94:s.movement==='crawl'?.94:s.movement==='pulse'?.7:.8,travel_direction:'both',flip_with_direction:kind==='fish'&&s.movement!=='fixed',thumbnail_path:`${folder}/${s.id}_bluegold_v2_thumbnail.png`,sprite_sheet_path:sprite,thumbnailPrompt,generation:{},facing_direction:kind==='fish'?'right':undefined}
 })
 write(manifestFile,{tool:'built-in image_gen',status:'in production; not uploaded; catalog unchanged',style_reference:reference,scope:'16 currently registered starruins-native collectibles; excludes unreleased expansion',items})
 const s=items.find(s=>s.id==='atlantean-guard-shark');fs.mkdirSync(path.dirname(root+'/'+s.thumbnail_path),{recursive:true});fs.copyFileSync(reference,root+'/'+s.thumbnail_path)
 s.generation.thumbnail={reference,role:'approved identity reused',prompt:read('assets/storage-upload/new/20261029-054632/revision-v2.json').prompt};write(manifestFile,{...read(manifestFile),items})
 console.log(JSON.stringify({root,items:items.length,thumbnails:15,sprites:items.filter(s=>s.frames>1).length}))
}
if(command==='jobs'){
 const m=read(manifestFile),type=process.argv[3]??'thumbnail';const jobs=[]
 for(const s of m.items){
  if(type==='thumbnail'&&!fs.existsSync(root+'/'+s.thumbnail_path))jobs.push({id:s.id,prompt:s.thumbnailPrompt,references:[reference],destination:root+'/'+s.thumbnail_path})
  if(type==='sprite'&&s.frames>1&&fs.existsSync(root+'/'+s.thumbnail_path)&&fs.existsSync(guides+'/'+s.id+'-guide.png')&&!fs.existsSync(root+'/'+s.sprite_sheet_path)){
   const prompt=`Production aquarium animation sheet, ${s.frames===8?'4 columns by 2 rows, 2:1 landscape':'2 columns by 2 rows, square'}, ${s.frames} equal SQUARE cells, row-major order. Reference1 is exact approved identity, reference2 is ONLY a repeated-image position/size guide, NOT a valid final animation. Preserve exact anatomy, colors, ornaments, face, camera angle and rigid head size from reference1. ${s.design} Genuine small articulated animation: ${s.motion} ${s.frames===4?'Cycle: neutral, flex, neutral passing, opposite flex; smooth return to0.':''} CRITICAL: eyes, head, rigid torso or shell or pedestal are at IDENTICAL cell-relative coordinates and size in EVERY cell, including top row to bottom row. Do not recenter the silhouette as limbs move. No vertical drift, bounce, zoom, body rotation, scale or opacity animation. ${s.kind==='fish'?'Right-facing profile in ALL poses.':''} IMPORTANT SMALL SUBJECTS: Whole silhouette including moving extremities fits ONLY the central 50% of EACH cell, with 25% actual clear alpha padding on all FOUR sides of EVERY cell. These large empty margins are intentional and mandatory; do NOT crop transparent whitespace or fill the quadrants. Entire anatomy intact. Small restrained movement, no giant wing flaps. No clone-only frames or light-only animation. True transparent PNG, clean colored edges, no background, matte fringe, grid, text, numbers, dust or scenery.`
   jobs.push({id:s.id,prompt,references:[root+'/'+s.thumbnail_path,guides+'/'+s.id+'-guide.png'],destination:root+'/'+s.sprite_sheet_path})
  }
 }
 const jobsFile=root+'/'+type+'-jobs.json',previous=fs.existsSync(jobsFile)?read(jobsFile):[]
 write(jobsFile,[...previous.filter(p=>!jobs.some(j=>j.id===p.id)),...jobs]);console.log(JSON.stringify(jobs))
}
if(command==='save'){
 const [id,type,source]=process.argv.slice(3),m=read(manifestFile),s=m.items.find(s=>s.id===id)
 const dest=root+'/'+(type==='thumbnail'?s.thumbnail_path:s.sprite_sheet_path)
 fs.mkdirSync(path.dirname(dest),{recursive:true});fs.copyFileSync(source,dest);fs.copyFileSync(source,root+'/sources/'+id+'-'+type+'.source')
 const job=read(root+'/'+type+'-jobs.json').find(j=>j.id===id)
 s.generation[type]={source,prompt:job.prompt,references:job.references}
 write(manifestFile,m);console.log(JSON.stringify({id,type,file:dest}))
}
if(command==='guides'){
 fs.mkdirSync(guides,{recursive:true})
 const m=read(manifestFile)
 for(const s of m.items.filter(s=>s.frames>1&&fs.existsSync(root+'/'+s.thumbnail_path))){
  const columns=s.frames===8?4:2,cell=512
  const im=await sharp(root+'/'+s.thumbnail_path).trim().resize({width:320,height:320,fit:'inside'}).png().toBuffer({resolveWithObject:true})
  const layers=Array.from({length:s.frames},(_,f)=>({input:im.data,left:f%columns*cell+Math.floor((cell-im.info.width)/2),top:Math.floor(f/columns)*cell+Math.floor((cell-im.info.height)/2)}))
  await sharp({create:{width:cell*columns,height:cell*2,channels:4,background:'#00000000'}}).composite(layers).png().toFile(guides+'/'+s.id+'-guide.png')
 }
 console.log('Generated identity placement guides')
}
