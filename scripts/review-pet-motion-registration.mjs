import fs from 'node:fs'
import sharp from 'sharp'
const root='assets/storage-upload/new/20261110-160000',read=p=>JSON.parse(fs.readFileSync(p,'utf8'))
const measured=read(`${root}/motion-landmarks.json`).pets,review=read(`${root}/motion-registration-review.json`)
for(const [id,poses] of Object.entries(measured)){
  const parts=[]
  for(const [i,[kind,suffix]] of [['idle','idle8_v2'],['happy','happy8_v1'],['eat','eat8_v1'],['needs','needs8_v1']].entries()){
    const {cell,floor}=review[id][kind]
    const picture=await sharp(`public/pets/${id}_${suffix}_sprite.png`).extract({left:0,top:0,width:cell,height:cell}).resize(400).flatten({background:'#faf6ef'}).png().toBuffer()
    const points=poses[kind].map(([x,y])=>`<circle cx="${x}" cy="${y}" r="3" fill="none" stroke="#ee33a6" stroke-width="1.5"/>`).join('')
    const overlay=Buffer.from(`<svg width="400" height="400">${points}<path d="M30 ${floor*400/cell}h340" stroke="#ee33a6" stroke-dasharray="4 4"/></svg>`)
    parts.push({input:await sharp(picture).composite([{input:overlay}]).png().toBuffer(),left:i*400,top:30})
    parts.push({input:Buffer.from(`<svg width="400" height="30"><text x="12" y="20" font-size="16">${id} / ${kind}</text></svg>`),left:i*400,top:0})
  }
  await sharp({create:{width:1600,height:430,channels:4,background:'#faf6ef'}}).composite(parts).png().toFile(`${root}/review/${id}-motion-landmarks.png`)
}
console.log('Exported eye/floor landmark review for four pets.')
