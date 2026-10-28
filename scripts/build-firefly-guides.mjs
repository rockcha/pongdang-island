import sharp from 'sharp'
import {mkdirSync} from 'node:fs'
import {batch,items} from './prepare-firefly-assets.mjs'
mkdirSync('artifacts/previews/firefly/guides',{recursive:true})
const safeMythic=process.argv.includes('--mythic-safe')
const selected=items.filter(i=>i.sprite_sheet_path&&(!safeMythic||i.rarity==='mythic'))
for(const item of selected){
 const columns=item.rarity==='mythic'?4:2,cell=512
 // This is a placement reference, never a deliverable animation. All final
 // motion is generated separately from the exact thumbnail and this guide.
 const limit=safeMythic?184:266
 const thumbnail=await sharp(batch+'/'+item.thumbnail_path).resize(limit,limit,{fit:'inside'}).png().toBuffer({resolveWithObject:true})
 const layers=Array.from({length:columns*2},(_,i)=>({input:thumbnail.data,left:i%columns*cell+Math.floor((cell-thumbnail.info.width)/2),top:Math.floor(i/columns)*cell+Math.floor((cell-thumbnail.info.height)/2)}))
 await sharp({create:{width:columns*cell,height:cell*2,channels:4,background:'#00000000'}}).composite(layers).png().toFile(`artifacts/previews/firefly/guides/${item.id}${safeMythic?'-safe8-v2':''}.png`)
}
console.log(`Prepared ${selected.length} transparent layout guides; no animation frames synthesized.`)
