import fs from 'node:fs'
import sharp from 'sharp'
import {batch,items,spritePrompt} from './prepare-weather-decoration-assets.mjs'
const jobs=[]
for(const i of items){
 const source=`${batch}/sources/${i.id}-thumbnail.source`
 if(!fs.existsSync(source))continue
 const thumbnail=`${batch}/${i.thumbnail_path}`
 await sharp(source).png({compressionLevel:9,adaptiveFiltering:true}).toFile(thumbnail)
 const cell=512,art=await sharp(thumbnail).resize(332,332,{fit:'contain',background:'#00000000'}).png().toBuffer()
 const guide=`${batch}/sources/${i.id}-placement-guide.png`
 await sharp({create:{width:cell*2,height:cell*2,channels:4,background:'#00000000'}}).composite(Array.from({length:4},(_,f)=>({input:art,left:f%2*cell+90,top:Math.floor(f/2)*cell+90}))).png().toFile(guide)
 jobs.push({id:i.id,prompt:spritePrompt(i),references:[thumbnail,guide]})
}
fs.writeFileSync(`${batch}/sprite-jobs.json`,JSON.stringify(jobs,null,2)+'\n')
console.log(JSON.stringify({jobs:jobs.length}))
