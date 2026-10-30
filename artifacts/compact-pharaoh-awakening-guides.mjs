import fs from 'node:fs'
import sharp from 'sharp'
const batch='assets/storage-upload/new/20261030-101406',m=JSON.parse(fs.readFileSync(batch+'/manifest.json','utf8'))
for(const a of m.assets.filter(a=>a.role==='thumbnail')){
 const {data,info}=await sharp(a.target).resize(192,192,{fit:'inside'}).png().toBuffer({resolveWithObject:true}),cell=512
 await sharp({create:{width:2048,height:1024,channels:4,background:'#00000000'}}).composite(Array.from({length:8},(_,i)=>({input:data,left:i%4*cell+Math.floor((cell-info.width)/2),top:Math.floor(i/4)*cell+Math.floor((cell-info.height)/2)}))).png().toFile(batch+'/guides/'+a.id+'-compact.png')
}
