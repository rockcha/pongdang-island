import fs from 'node:fs'
import sharp from 'sharp'
const root='assets/storage-upload/new/20261027-154009'
const {species}=JSON.parse(fs.readFileSync(root+'/plan.json','utf8'))
const errors=JSON.parse(fs.readFileSync(root+'/sprite-errors.json','utf8'))
fs.mkdirSync(root+'/layout-guides',{recursive:true})
for(const {id} of errors){
 const s=species.find(s=>s.id===id),columns=s.frames/2,cell=640
 const thumbnail=root+`/fish/${s.rarity==='common'?'normal':s.rarity}/${id}_v1_thumbnail.png`
 const image=await sharp(thumbnail).resize(240,240,{fit:'inside'}).png().toBuffer({resolveWithObject:true})
 const pieces=Array.from({length:s.frames},(_,i)=>({input:image.data,left:i%columns*cell+Math.floor((cell-image.info.width)/2),top:Math.floor(i/columns)*cell+Math.floor((cell-image.info.height)/2)}))
 await sharp({create:{width:columns*cell,height:cell*2,channels:4,background:'#00000000'}}).composite(pieces).png().toFile(root+'/layout-guides/'+id+'.png')
 console.log(id)
}
