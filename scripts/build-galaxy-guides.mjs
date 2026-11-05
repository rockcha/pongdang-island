import sharp from 'sharp'
import {mkdirSync,existsSync,writeFileSync} from 'node:fs'
import {batch,items} from './prepare-galaxy-assets.mjs'
const root='artifacts/previews/galaxy/guides'
mkdirSync(root,{recursive:true})
export function spritePrompt(i){
 const mythic=i.rarity==='mythic'
 const motion=i.action??(i.movement_type==='crawl'?'Articulated slow walking cycle: legs advance in small alternating steps, shell stays rigid, antennae gently flex.':i.movement_type==='pulse'?'A smooth propulsion cycle: bell or soft body relaxed, slightly compressed, compressed, relaxing. Tentacles follow with a gentle phase delay. Stable central core.':'A gentle rightward swimming cycle: tail or species-appropriate propulsion parts flex through neutral, left sweep, neutral, right sweep. Soft appendages follow water. Head and rigid torso stable; no arm-like paddling of one front fin.')
 return `Production animated sprite sheet of ${i.name}. ${i.description}. Input 1 is the EXACT identity thumbnail: preserve anatomy, facial design, color, equipment and rendering. Input 2 is a PLACEMENT GUIDE only, do not merely copy its still poses. ${mythic?'EXACTLY 8 poses, 4 columns by 2 rows, overall landscape 2:1. First row: 4 continuous basic-motion poses. Second row: anticipation, special action, return, recovery matching first frame.':'EXACTLY 4 poses in a 2 by 2 grid of equal square cells, overall square canvas.'} ${motion} Head faces SCREEN RIGHT consistently. Fixed buildings retain the same three-quarter camera. Rigid face/head/core or building foundation stays at EXACTLY the same per-cell coordinates and scale through every pose; no whole-character translation, rotation, zoom, recentering, opacity animation or anatomy changes. Real small physical appendage movements, never eight identical copies or only changing eyes/glow. Every full pose including orbiting parts occupies the central 60% of its cell; at least 12% fully transparent margin on each side of every cell, never cut or overlap a cell boundary. Detailed crisp soft hand-painted fantasy art inherited from thumbnail. True alpha background and gutters, no grid lines, labels, numbers, white matte, checkerboard, cast shadow, fog or scene. Smooth loop with restrained natural motion.`
}
const tasks=[]
for(const i of items.filter(i=>i.sprite_sheet_path&&existsSync(batch+'/'+i.thumbnail_path))){
 const columns=i.rarity==='mythic'?4:2,cell=512,thumb=await sharp(batch+'/'+i.thumbnail_path).trim().resize(300,300,{fit:'inside'}).png().toBuffer({resolveWithObject:true})
 const guide=`${root}/${i.id}.png`
 await sharp({create:{width:columns*cell,height:cell*2,channels:4,background:'#00000000'}}).composite(Array.from({length:columns*2},(_,n)=>({input:thumb.data,left:n%columns*cell+Math.floor((cell-thumb.info.width)/2),top:Math.floor(n/columns)*cell+Math.floor((cell-thumb.info.height)/2)}))).png().toFile(guide)
 tasks.push({id:i.id,path:i.sprite_sheet_path,prompt:spritePrompt(i),refs:[batch+'/'+i.thumbnail_path,guide]})
}
writeFileSync(`${root}/tasks.json`,JSON.stringify(tasks,null,2)+'\n')
console.log(JSON.stringify({guides:tasks.length}))
