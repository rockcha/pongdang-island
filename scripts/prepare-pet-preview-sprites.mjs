import fs from 'node:fs'
import sharp from 'sharp'
import {batch,pets,sheets,spritePrompt} from './prepare-pet-preview-assets.mjs'
fs.mkdirSync('public/pets',{recursive:true})
for(const p of pets){
 const source=`${batch}/sources/${p.id}-thumbnail.source`
 await sharp(source).png({compressionLevel:9,adaptiveFiltering:true}).toFile(`${batch}/${p.thumbnail_path}`)
 fs.copyFileSync(`${batch}/${p.thumbnail_path}`,`public/${p.thumbnail_path}`)
}
const jobs=[]
for(const s of sheets){
 const cell=512,thumbnail=`${batch}/${s.thumbnail_path}`
 const art=await sharp(thumbnail).resize(320,320,{fit:'contain',background:'#00000000'}).png().toBuffer()
 const guide=`${batch}/sources/${s.id}-placement-guide.png`
 await sharp({create:{width:s.columns*cell,height:cell*2,channels:4,background:'#00000000'}}).composite(Array.from({length:s.frames},(_,f)=>({input:art,left:f%s.columns*cell+96,top:Math.floor(f/s.columns)*cell+96}))).png().toFile(guide)
 jobs.push({id:s.id,prompt:spritePrompt(s),references:[thumbnail,guide]})
}
fs.writeFileSync(`${batch}/sprite-jobs.json`,JSON.stringify(jobs,null,2)+'\n')
console.log(JSON.stringify({jobs:jobs.length}))
