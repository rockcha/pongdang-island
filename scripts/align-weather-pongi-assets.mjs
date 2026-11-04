import fs from 'node:fs'
import path from 'node:path'
import sharp from 'sharp'
import {batch} from './prepare-weather-pongi-assets.mjs'

const manifest=JSON.parse(fs.readFileSync(`${batch}/manifest.json`,'utf8'))
const anchors=JSON.parse(fs.readFileSync(`${batch}/anchors-original.json`,'utf8').replace(/^\uFEFF/,''))
for(const item of manifest.items){
 const anchor=anchors.find(a=>a.storage_path===item.sprite_sheet_path)
 if(!anchor)throw Error(`Missing anchor ${item.id}`)
 const source=path.join(batch,'sources',`${item.id}-sprite.source`)
 const meta=await sharp(source).metadata(),cell=meta.width/2,pad=24,finalCell=cell+pad*2
 if(meta.height!==meta.width||!Number.isInteger(cell))throw Error(`Invalid sprite grid ${item.id}`)
 const layers=[]
 for(let i=0;i<4;i++){
  const frame=anchor.frames[i]
  if(!Number.isFinite(frame.rmse)||frame.rmse>35||Math.abs(frame.dx)>pad||Math.abs(frame.dy)>pad)throw Error(`Unstable head anchor ${item.id} frame ${i}`)
  const input=await sharp(source).extract({left:i%2*cell,top:Math.floor(i/2)*cell,width:cell,height:cell}).png().toBuffer()
  layers.push({input,left:i%2*finalCell+pad-frame.dx,top:Math.floor(i/2)*finalCell+pad-frame.dy})
 }
 await sharp({create:{width:finalCell*2,height:finalCell*2,channels:4,background:'#00000000'}}).composite(layers).png({compressionLevel:9}).toFile(path.join(batch,item.sprite_sheet_path))
 item.review={...item.review,sprite:'right-facing four-frame paddle loop; head anchor measured and translated in PNG; uniform 24px cell padding',originalAnchor:anchor.frames,cell:finalCell}
}
fs.writeFileSync(`${batch}/manifest.json`,JSON.stringify(manifest,null,2)+'\n')
