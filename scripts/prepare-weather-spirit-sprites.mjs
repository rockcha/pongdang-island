import fs from 'node:fs'
import sharp from 'sharp'
import {batch,items,spritePrompt} from './prepare-weather-spirit-assets.mjs'

const jobs=[]
for(const item of items){
 const raw=`${batch}/sources/${item.id}-thumbnail.source`
 if(!fs.existsSync(raw))continue
 const thumbnail=`${batch}/${item.thumbnail_path}`
 await sharp(raw).png({compressionLevel:9,adaptiveFiltering:true}).toFile(thumbnail)
 const cell=512,art=await sharp(thumbnail).resize(328,328,{fit:'contain',background:'#00000000'}).png().toBuffer()
 const layers=Array.from({length:8},(_,frame)=>({input:art,left:frame%4*cell+92,top:Math.floor(frame/4)*cell+92}))
 const guide=`${batch}/sources/${item.id}-placement-guide.png`
 await sharp({create:{width:cell*4,height:cell*2,channels:4,background:'#00000000'}}).composite(layers).png().toFile(guide)
 jobs.push({id:item.id,prompt:spritePrompt(item),references:[thumbnail,guide]})
}
fs.writeFileSync(`${batch}/sprite-jobs.json`,JSON.stringify(jobs,null,2)+'\n')
console.log(JSON.stringify(jobs))
