import {build} from 'vite'
import fs from 'node:fs/promises'
import sharp from 'sharp'

const built=await build({configFile:false,publicDir:false,logLevel:'silent',build:{write:false,minify:false,target:'es2022',lib:{entry:'src/features/training/skill-art.ts',formats:['es']}}})
const output=Array.isArray(built)?built[0]:built
const code=output.output.find(item=>item.type==='chunk').code
const {trainingSkillArt}=await import('data:text/javascript;base64,'+Buffer.from(code).toString('base64'))
const shade=(hex,factor)=>'#'+hex.slice(1).match(/../g).map(value=>Math.round(parseInt(value,16)*factor).toString(16).padStart(2,'0')).join('')
await fs.mkdir('public/training/abilities',{recursive:true})
for(const [glyph,art] of Object.entries(trainingSkillArt)){
 const marks=art.paths.map((path,index)=>`<path d="${path}" fill="${/[zZ]\s*$/.test(path)?index%2?'url(#highlight)':'url(#body)':'none'}" stroke="${index?art.accent:shade(art.color,.42)}" stroke-width="${index?2.2:3.2}"/>`).join('')
 const svg=`<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 96 96"><title>${art.name}</title><defs><linearGradient id="body" x1=".2" x2=".8" y2="1"><stop stop-color="${art.accent}"/><stop offset=".42" stop-color="${art.color}"/><stop offset="1" stop-color="${shade(art.color,.58)}"/></linearGradient><linearGradient id="highlight" x2=".6" y2="1"><stop stop-color="#fff7da"/><stop offset="1" stop-color="${art.color}"/></linearGradient><radialGradient id="halo"><stop stop-color="${art.color}" stop-opacity=".16"/><stop offset="1" stop-color="${art.color}" stop-opacity="0"/></radialGradient><filter id="shadow" x="-30%" y="-30%" width="160%" height="160%"><feDropShadow dx="0" dy="1.5" stdDeviation="1" flood-color="#111415" flood-opacity=".32"/></filter></defs><circle cx="48" cy="48" r="44" fill="url(#halo)"/><g transform="translate(8 8)" stroke-linecap="round" stroke-linejoin="round" filter="url(#shadow)">${marks}</g><path d="m80 17 1.7 4.3L86 23l-4.3 1.7L80 29l-1.7-4.3L74 23l4.3-1.7Z" fill="${art.accent}" opacity=".8"/></svg>\n`
 await fs.writeFile(`public/training/abilities/${glyph}.svg`,svg)
}
if(process.argv.includes('--preview')){
 await fs.mkdir('artifacts/previews/training',{recursive:true})
 const entries=Object.entries(trainingSkillArt),width=640,height=4*160
 for(const [theme,color]of [['light','#fff6e6'],['dark','#111b1b']]){
  const layers=[]
  for(const [index,[glyph]]of entries.entries()){
   layers.push({input:await sharp(await fs.readFile(`public/training/abilities/${glyph}.svg`)).resize(104,104).png().toBuffer(),left:index%4*160+28,top:Math.floor(index/4)*160+8})
   layers.push({input:Buffer.from(`<svg width="160" height="30"><text x="80" y="16" text-anchor="middle" font-family="sans-serif" font-size="11" fill="${theme==='light'?'#785a3d':'#ead9b8'}">${glyph}</text></svg>`),left:index%4*160,top:Math.floor(index/4)*160+120})
  }
  await sharp({create:{width,height,channels:4,background:color}}).composite(layers).png().toFile(`artifacts/previews/training/ability-icons-${theme}.png`)
 }
}
console.log(`Generated ${Object.keys(trainingSkillArt).length} illustrated training SVG icons.`)
