import fs from 'node:fs'
import sharp from 'sharp'
import {batch,items} from './prepare-pharaoh-assets.mjs'
fs.mkdirSync('artifacts/previews/pharaoh',{recursive:true})
const groups=[['common',items.filter(i=>i.rarity==='common')],['rare',items.filter(i=>i.rarity==='rare')],['premium',items.filter(i=>i.rarity==='epic'||i.rarity==='mythic')]]
for(const [name,group] of groups){const layers=[],size=180,cols=5;let n=0
 for(const i of group){if(!fs.existsSync(batch+'/'+i.thumbnail_path))continue
 const input=await sharp(batch+'/'+i.thumbnail_path).resize(size,size,{fit:'contain',background:n%2?'#30261c':'#fff8e8'}).png().toBuffer()
 layers.push({input,left:n%cols*size,top:Math.floor(n/cols)*size});n++}
 if(n)await sharp({create:{width:cols*size,height:Math.ceil(n/cols)*size,channels:4,background:'#e1ccb0'}}).composite(layers).png().toFile(`artifacts/previews/pharaoh/${name}-thumbnails.png`)
}
console.log('Prepared light/dark thumbnail QA sheets')
