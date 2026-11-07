import fs from 'node:fs'
import sharp from 'sharp'
import {batch,items} from './prepare-hologram-assets.mjs'
const category=process.argv[2]??'fish',rarity=process.argv[3],selected=items.filter(i=>i.kind===category&&(!rarity||i.rarity===rarity)&&fs.existsSync(`${batch}/${i.thumbnail_path}`))
const tile=256,columns=4,rows=Math.ceil(selected.length/columns),parts=[]
if(!selected.length){console.log('No matching completed images');process.exit(0)}
for(let n=0;n<selected.length;n++){
 const i=selected[n],src=await sharp(`${batch}/${i.thumbnail_path}`).resize(220,220,{fit:'inside'}).png().toBuffer({resolveWithObject:true})
 parts.push({input:src.data,left:n%columns*tile+Math.floor((tile-src.info.width)/2),top:Math.floor(n/columns)*tile+Math.floor((220-src.info.height)/2)})
 const label=Buffer.from(`<svg width="256" height="36"><text x="8" y="18" fill="#bcecf4" font-size="11" font-family="sans-serif">${i.id.replace('hologram-','')}</text></svg>`)
 parts.push({input:label,left:n%columns*tile,top:Math.floor(n/columns)*tile+220})
}
fs.mkdirSync(`${batch}/review`,{recursive:true})
const file=`${batch}/review/${category}-${rarity??'all'}.png`
await sharp({create:{width:columns*tile,height:rows*tile,channels:4,background:'#081322'}}).composite(parts).png().toFile(file)
console.log(JSON.stringify({file,count:selected.length}))
