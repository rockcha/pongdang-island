import fs from 'node:fs'
import sharp from 'sharp'
import {batch,items,spritePrompt} from './prepare-pharaoh-assets.mjs'
fs.mkdirSync('artifacts/previews/pharaoh/guides',{recursive:true})
const tasks=[]
for(const i of items.filter(i=>i.sprite_sheet_path)){
 const columns=i.rarity==='mythic'?4:2,cell=512
 const t=await sharp(batch+'/'+i.thumbnail_path).resize(360,360,{fit:'inside'}).png().toBuffer({resolveWithObject:true})
 const guide=`artifacts/previews/pharaoh/guides/${i.id}.png`
 await sharp({create:{width:columns*cell,height:2*cell,channels:4,background:'#00000000'}}).composite(Array.from({length:columns*2},(_,n)=>({input:t.data,left:n%columns*cell+Math.floor((cell-t.info.width)/2),top:Math.floor(n/columns)*cell+Math.floor((cell-t.info.height)/2)}))).png().toFile(guide)
 tasks.push({id:i.id+'-sprite',species_id:i.id,path:i.sprite_sheet_path,target:batch+'/'+i.sprite_sheet_path,prompt:spritePrompt(i),references:[batch+'/'+i.thumbnail_path,guide],frames:columns*2})
}
fs.writeFileSync(batch+'/animation-tasks.json',JSON.stringify(tasks,null,2)+'\n')
if(process.argv.includes('--tasks'))console.log(JSON.stringify(tasks));else console.log('Prepared '+tasks.length+' animation identity/layout inputs')
