import fs from 'node:fs'
import sharp from 'sharp'
import {createHash} from 'node:crypto'
const root='public/arcade/tower-defense'
const batch='assets/storage-upload/new/20261113-174500'
fs.mkdirSync(`${batch}/arcade/tower-defense`,{recursive:true})
const shape=(frame)=>{
 const move=[0,3,0,-3][frame]
 return `<g stroke-linejoin="round" stroke-linecap="round">
 <path d="M55 57 Q${28-move} ${37-move} 15 ${50-move} L26 77 Q40 80 56 69 M73 57 Q${100+move} ${37+move} 113 ${50+move} L102 77 Q88 80 72 69" fill="#c5bee9" stroke="#877eaf" stroke-width="2.5"/>
 <path d="M25 ${53-move} L46 65 M103 ${53+move} L82 65" fill="none" stroke="#efddf9" stroke-width="2"/>
 <path d="M63 31 Q${37+move} 23 ${48+move} 12 Q${61+move} 10 64 20 Q${67+move} 12 ${80+move} 14 Q${82+move} 27 68 35" fill="#a7a2d3" stroke="#716e9d" stroke-width="2.5"/>
 <path d="M64 24 C39 31 42 43 60 49 C80 56 80 65 65 70 C47 75 43 86 47 97 Q64 113 81 97 C87 82 81 72 74 66 C91 54 79 39 65 36 Q57 32 64 24Z" fill="#807da9" stroke="#5e608b" stroke-width="3"/>
 <path d="M62 32 Q48 38 65 45 C88 58 80 69 64 75 Q54 79 55 93" fill="none" stroke="#c2b4da" stroke-width="5"/>
 <path d="M55 39 L48 37 M70 49 L78 45 M75 63 L84 63 M60 74 L50 70" stroke="#e4c5cb" stroke-width="2.5"/>
 <path d="M49 84 Q31 73 35 64 Q47 68 53 78 M79 84 Q97 73 93 64 Q81 68 75 78" fill="#eddbb4" stroke="#b29a83" stroke-width="2.5"/>
 <path d="M49 83 Q64 73 79 83 L83 99 Q76 113 64 114 Q52 113 45 99Z" fill="#b6acd6" stroke="#6c6998" stroke-width="3"/>
 <path d="M55 106 Q64 111 73 106" fill="none" stroke="#dfc9df" stroke-width="3"/>
 <path d="M68 73 A9 9 0 1 0 68 90 A7 7 0 0 1 68 73Z" fill="#ffe1aa" stroke="#c6a279" stroke-width="1.5"/>
 <ellipse cx="54" cy="96" rx="2.7" ry="3.5" fill="#443e6e"/><ellipse cx="74" cy="96" rx="2.7" ry="3.5" fill="#443e6e"/>
 <path d="M46 99 Q${29-move} 99 ${27-move} 111 M82 99 Q${99+move} 99 ${101+move} 111" fill="none" stroke="#dac8e3" stroke-width="2"/>
 </g>`
}
const cell=(frame,x=0)=>`<g transform="translate(${x+25.6} 25.6) scale(1.6)">${shape(frame)}</g>`
const svg=(content,width=256)=>`<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="256" viewBox="0 0 ${width} 256">${content}</svg>`
const files=[]
const save=(name,bytes)=>{
 fs.writeFileSync(`${root}/${name}`,bytes)
 fs.writeFileSync(`${batch}/arcade/tower-defense/${name}`,bytes)
 files.push({path:`arcade/tower-defense/${name}`,sha256:createHash('sha256').update(bytes).digest('hex')})
}
save('lunar-dragon-v1.svg',svg(cell(0)))
const sheet=svg(Array.from({length:4},(_,f)=>cell(f,f*256)).join(''),1024)
save('lunar-dragon-v1-sheet.svg',sheet)
const row=await sharp(Buffer.from(sheet)).png().toBuffer()
save('lunar-dragon-v1-sprite.png',row)
// Keep all existing enemy frames byte-identical; replace only the final boss row.
const base=fs.readFileSync(`${root}/enemies-v6-sprite.png`)
const {data,info}=await sharp(base).ensureAlpha().raw().toBuffer({resolveWithObject:true})
const pixels=await sharp(row).ensureAlpha().raw().toBuffer()
pixels.copy(data,11*256*info.width*4)
const output=await sharp(data,{raw:{width:info.width,height:info.height,channels:4}}).png().toBuffer()
save('enemies-v7-sprite.png',output)
const manifest={source:'scripts/build-tower-defense-lunar-boss.mjs',baseAtlas:'arcade/tower-defense/enemies-v6-sprite.png',replacedRow:11,cell:256,columns:4,rows:18,animation:'Fixed head/body anchor; four gentle fin, whisker and tail poses. Strict overhead view.',files}
fs.writeFileSync(`${root}/lunar-boss-art-manifest.json`,JSON.stringify(manifest,null,2)+'\n')
fs.writeFileSync(`${batch}/manifest.json`,JSON.stringify(manifest,null,2)+'\n')
console.log('Built overhead lunar sea dragon and updated final boss atlas row')
