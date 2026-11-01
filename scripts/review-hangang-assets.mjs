import fs from 'node:fs'
import sharp from 'sharp'
import {batch,items} from './prepare-hangang-assets.mjs'
fs.mkdirSync(batch+'/review',{recursive:true})
const available=items.filter(i=>fs.existsSync(batch+'/'+i.thumbnail_path))
for(let start=0;start<available.length;start+=8)for(const [background,name] of [['#fff7e6','light'],['#18343f','dark']]){
 const layers=[]
 for(const [position,item] of available.slice(start,start+8).entries()){
  const x=position%4*240,y=Math.floor(position/4)*270
  layers.push({input:await sharp(batch+'/'+item.thumbnail_path).resize(230,230,{fit:'contain',background:'#00000000'}).png().toBuffer(),left:x+5,top:y+2})
  layers.push({input:Buffer.from(`<svg width="240" height="35"><text x="120" y="23" text-anchor="middle" font-family="Arial" font-size="11" fill="${name==='dark'?'#f5edda':'#35474c'}">${item.id.replace('hangang-','')}</text></svg>`),left:x,top:y+232})
 }
 await sharp({create:{width:960,height:540,channels:4,background}}).composite(layers).png().toFile(`${batch}/review/thumbnails-${start}-${name}.png`)
}
console.log(JSON.stringify({available:available.length,expected:items.length,review:`${batch}/review`}))
