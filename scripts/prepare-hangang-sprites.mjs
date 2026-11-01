import fs from 'node:fs'
import sharp from 'sharp'
import {batch,items,spritePrompt} from './prepare-hangang-assets.mjs'
const jobs=[]
for(const item of items.filter(i=>i.kind==='fish')){
 const thumbnail=batch+'/'+item.thumbnail_path
 if(!fs.existsSync(thumbnail))continue
 const columns=item.frames===8?4:2,cell=512,layers=[]
 const art=await sharp(thumbnail).resize(340,340,{fit:'contain',background:'#00000000'}).png().toBuffer()
 for(let frame=0;frame<item.frames;frame++)layers.push({input:art,left:frame%columns*cell+86,top:Math.floor(frame/columns)*cell+86})
 const guide=`${batch}/sources/${item.id}-placement-guide.png`
 await sharp({create:{width:columns*cell,height:cell*2,channels:4,background:'#00000000'}}).composite(layers).png().toFile(guide)
 jobs.push({id:item.id,type:'sprite',prompt:spritePrompt(item),references:[thumbnail,guide],destination:`${batch}/${item.sprite_sheet_path}`,frames:item.frames})
}
fs.writeFileSync(batch+'/sprite-jobs.json',JSON.stringify(jobs,null,2)+'\n')
console.log(JSON.stringify({jobs:jobs.length,expected:39}))
