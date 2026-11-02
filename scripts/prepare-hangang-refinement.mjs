import fs from 'node:fs'
import sharp from 'sharp'
export const batch='assets/storage-upload/new/20261102-091000'
const catalog=JSON.parse(fs.readFileSync('supabase/catalog/catalog.json','utf8'))
const specs=[
 ['mago-creator',8,'Hands held forward together, empty upward-facing palms at a stable location. Keep face and torso rigid while the fingers open gently and both hands draw together then unfold; flowing Korean hanbok sleeves and long white hair trail LEFT in the water. Eight physical poses: 4 gentle floating/swimming poses; 4 prepare, open palms, relax and return. No miniature mountain or star baked into the sprite: a separate game effect will create it.'],
 ['haetae-guardian',4,'An underwater forward-swimming Korean blue/gold haetae. Body is HORIZONTAL, buoyant, belly clear of any ground. Forelegs sweep forward then backward as slow swimming paddles; hind legs extend backward behind hips then tuck slightly. Mane and tail flow left. Never standing, walking, running or contacting a floor. Four connected paddling poses; same head, chest and scale.'],
 ['millennial-gumiho',4,'An underwater forward-swimming nine-tailed white fox. Horizontal streamlined body, forepaws paddle water with small alternating strokes, hind paws stretch back and relax, nine long tails trail LEFT in a coherent slow traveling wave. No stepping on ground, standing or running. Keep exactly nine tails, face and torso stable; four continuous physical swim poses.'],
 ['iron-eater-bulgasari',4,'An underwater forward-swimming armored Korean bulgasari beast. Horizontal buoyant torso, forelegs make connected swimming paddle strokes, hind legs extend backward then gently flex, long trunk points to SCREEN RIGHT and stays stable, tail streams LEFT. No walking, stomping, standing or bottom contact. Keep armored chest/head fixed; four connected aquatic propulsion poses.'],
 ['red-cheer-incarnation',8,'Korean red cheering fire spirit holding its ONE round taegeuk drum. Lock the FACE, CHEST AND DRUM TOGETHER at exactly the same positions and scale in ALL eight cells. Never turn torso, change face perspective, shrink/enlarge drum, crouch, bob or rotate. The mallet arm alone articulates. Flames remain one compact attached mass, only small outer tips flutter. Frames0-3 gentle arm/flame movement; frame4 mallet raised moderately, frame5 mallet contacts drum with a small wrist movement, frame6 releases contact, frame7 same neutral arm position as frame0. No dramatic pose or separate second drum. No detached particles, halos, sparks or effects.'],
]
export const items=specs.map(([slug,frames,action])=>{
 const previous=catalog.collectible_species.find(s=>s.id==='hangang-'+slug),rarity=frames===8?'mythic':'epic',id=previous.id
 return {...previous,rarity,frames,action,previousThumbnail:slug==='mago-creator'?'fish/epic/hangang-mago-creator_v1_thumbnail.png':previous.thumbnail_path,thumbnail_path:slug==='mago-creator'?`fish/mythic/${id}_v2_thumbnail.png`:previous.thumbnail_path,sprite_sheet_path:`fish/${rarity}/${id}${frames===8?'_swim8':''}_v2_sprite.png`,compatibility_path:frames===8?`fish/mythic/${id}_compat_v2_sprite.png`:null}
})
export function prompt(i){return `Edit the approved character into a NEW production animation sheet. Reference1 fixes IDENTITY and MATERIALS; Reference2 fixes SIZE and GRID only. ${i.frames===8?'4 columns x 2 rows, eight square cells, 2:1 wide sheet':'2 columns x 2 rows, four square cells, square sheet'}. ${i.action} ALL poses face SCREEN RIGHT. One same anatomical character, fixed rigid head/chest anchor, SAME SCALE and perspective in every cell. Render characters SMALL, only central 48% of each cell, minimum 20% completely transparent padding ALL four edges including all tips. No cell overlap, no cropping, no resizing between poses. Preserve colors, ornament, exact identity and soft detailed Korean fantasy illustration. Real physically different articulated poses, never duplicate stills; animation must return naturally to frame0. True clean alpha, no opaque background, no ground, no shadows, grid, labels, letters or water. No floating particles or broad aura. Keep exact complete ${i.id.includes('gumiho')?'nine-tail fox':i.name} anatomy.`}
if(process.argv[1]?.replaceAll('\\','/').endsWith('/prepare-hangang-refinement.mjs')){
 fs.mkdirSync(batch+'/sources',{recursive:true});fs.mkdirSync(batch+'/review',{recursive:true})
 for(const i of items){
  fs.mkdirSync(batch+'/'+i.thumbnail_path.split('/').slice(0,-1).join('/'),{recursive:true})
  fs.copyFileSync('assets/storage-upload/new/20261102-033000/'+i.previousThumbnail,batch+'/'+i.thumbnail_path)
  const thumb=await sharp(batch+'/'+i.thumbnail_path).resize(190,190,{fit:'contain',background:'#0000'}).png().toBuffer()
  await sharp({create:{width:i.frames/2*512,height:1024,channels:4,background:'#0000'}}).composite(Array.from({length:i.frames},(_,f)=>({input:thumb,left:f%(i.frames/2)*512+161,top:Math.floor(f/(i.frames/2))*512+161}))).png().toFile(`${batch}/sources/${i.id}-placement-guide.png`)
 }
 fs.writeFileSync(batch+'/manifest.json',JSON.stringify({status:'in-progress',tool:'built-in image_gen',region_id:'hangang',items,entries:[],assets:[]},null,2)+'\n')
 fs.writeFileSync(batch+'/jobs.json',JSON.stringify(items.map(i=>({id:i.id,prompt:prompt(i),destination:batch+'/'+i.sprite_sheet_path,refs:[process.cwd()+'/'+batch+'/'+i.thumbnail_path,process.cwd()+'/'+batch+'/sources/'+i.id+'-placement-guide.png']})),null,2)+'\n')
 console.log(JSON.stringify({batch,jobs:items.length}))
}
