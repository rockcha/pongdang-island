import fs from 'node:fs'
import sharp from 'sharp'
import {createHash} from 'node:crypto'
import {monster} from './tower-defense-shapes.mjs'
const root='public/arcade/tower-defense',batch='assets/storage-upload/new/20261113-180000'
fs.mkdirSync(`${batch}/arcade/tower-defense`,{recursive:true})
const kinds=['ironCrab','emberMako','crystalCuttlefish','crownHealer','ironKing','eclipseDragon']
const group=(drawing,x=0)=>`<g transform="translate(${x+25.6} 25.6) scale(1.6)">${drawing}</g>`
const svg=content=>`<svg xmlns="http://www.w3.org/2000/svg" width="1024" height="256" viewBox="0 0 1024 256">${content}</svg>`
const files=[],rows=[]
const save=(name,bytes)=>{fs.writeFileSync(`${root}/${name}`,bytes);fs.writeFileSync(`${batch}/arcade/tower-defense/${name}`,bytes);files.push({path:`arcade/tower-defense/${name}`,sha256:createHash('sha256').update(bytes).digest('hex')})}
for(const kind of kinds){
 let sheet
 if(kind==='emberMako')sheet=fs.readFileSync(`${root}/mako-v1-sheet.svg`,'utf8').replaceAll('#80a9d0','#e5a18e').replaceAll('#58758e','#986d7d').replaceAll('#7a97ad','#d46b71')
 else if(kind==='crystalCuttlefish'){
  sheet=fs.readFileSync(`${root}/cuttlefish-v1-sheet.svg`,'utf8').replaceAll('#c4a4bf','#bca2e1')
  const crystals=Array.from({length:4},(_,f)=>group('<path d="M47 55 L43 39 L54 43 L64 23 L74 43 L85 39 L81 55Z" fill="#ded4ff" stroke="#8b7bb5" stroke-width="2.5"/><path d="M64 26V51" stroke="#fbecff" stroke-width="2"/>',f*256)).join('')
  sheet=sheet.replace('</svg>',crystals+'</svg>')
 }else if(kind==='eclipseDragon')sheet=fs.readFileSync(`${root}/lunar-dragon-v1-sheet.svg`,'utf8').replaceAll('#807da9','#775d85').replaceAll('#b6acd6','#c798b5').replaceAll('#c5bee9','#d5b1d7').replaceAll('#ffe1aa','#ffd1a8')
 else sheet=svg(Array.from({length:4},(_,f)=>{
  let drawing=monster(kind==='crownHealer'?'healer':kind==='ironKing'?'boss':'armored',f)
  if(kind==='crownHealer')drawing+='<path d="M45 38 L45 24 L55 30 L64 17 L73 30 L83 24 L83 38Z" fill="#e9d294" stroke="#a88f62" stroke-width="2.5"/><circle cx="64" cy="30" r="4" fill="#fff6d5"/>'
  else {
   drawing=drawing.replaceAll('#c2b9dc','#9ba6b9').replaceAll('#d6cee7','#c0c7d5').replaceAll('#847b9f','#626d85').replaceAll('#e8a9aa','#8994a9').replaceAll('#ae7e79','#56627a')
   drawing+='<path d="M42 42 L48 31 L55 39 L64 27 L73 39 L80 31 L86 42 L81 66 L64 75 L47 66Z" fill="#8591aa" stroke="#53627d" stroke-width="2.5"/><path d="M64 37 V65 M51 48 L64 56 L77 48" fill="none" stroke="#d9e0ed" stroke-width="2"/>'
   if(kind==='ironKing')drawing+='<path d="M48 30 L46 17 L57 24 L64 10 L71 24 L82 17 L80 30Z" fill="#e2c789" stroke="#9d855d" stroke-width="2"/>'
  }
  return group(drawing,f*256)
 }).join(''))
 save(`${kind}-v1-sheet.svg`,sheet)
 const bytes=await sharp(Buffer.from(sheet)).png().toBuffer();save(`${kind}-v1-sprite.png`,bytes)
 rows.push(await sharp(bytes).ensureAlpha().raw().toBuffer())
}
const {data,info}=await sharp(`${root}/enemies-v7-sprite.png`).ensureAlpha().raw().toBuffer({resolveWithObject:true})
const output=await sharp(Buffer.concat([data,...rows]),{raw:{width:info.width,height:24*256,channels:4}}).png().toBuffer()
save('enemies-v8-sprite.png',output)
const manifest={source:'scripts/build-tower-defense-late-art.mjs',baseAtlas:'arcade/tower-defense/enemies-v7-sprite.png',enemyOrder:kinds,columns:4,rows:24,cell:256,files}
fs.writeFileSync(`${root}/late-art-manifest.json`,JSON.stringify(manifest,null,2)+'\n');fs.writeFileSync(`${batch}/manifest.json`,JSON.stringify(manifest,null,2)+'\n')
console.log('Built six late-game enemies and 24-row enemy atlas')
