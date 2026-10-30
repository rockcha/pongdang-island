import fs from 'node:fs'
import sharp from 'sharp'
import {batch,items} from './prepare-pharaoh-assets.mjs'
const m=JSON.parse(fs.readFileSync(batch+'/manifest.json','utf8')),records=[]
for(const i of items){
 const a=m.assets.find(a=>a.path===i.thumbnail_path),meta=await sharp(a.original).metadata()
 // Technical canvas export only: no cropping, repainting, edge cleanup or
 // per-character rescaling. Preserve every source RGBA pixel on a square.
 const side=Math.max(meta.width,meta.height),left=Math.floor((side-meta.width)/2),top=Math.floor((side-meta.height)/2)
 const png=await sharp(a.original).extend({left,right:side-meta.width-left,top,bottom:side-meta.height-top,background:'#00000000'}).png().toBuffer()
 fs.writeFileSync(batch+'/'+i.thumbnail_path,png)
 records.push({path:i.thumbnail_path,method:'equal-axis transparent canvas padding; source artwork unchanged',original:[meta.width,meta.height],final:[side,side],offset:[left,top]})
 if(!i.sprite_sheet_path)continue
 const s=m.assets.find(a=>a.path===i.sprite_sheet_path);if(!s)continue
 const input=fs.readFileSync(s.original),v=await sharp(input).metadata(),cols=i.frames/2
 if(Math.abs(v.width/cols-v.height/2)>1)throw Error('Wrong original grid '+i.id)
 const cell=Math.ceil(Math.max(v.width/cols,v.height/2))
 const out=v.width===cell*cols&&v.height===cell*2?input:await sharp(input).resize(cell*cols,cell*2,{fit:'fill'}).png().toBuffer()
 fs.writeFileSync(batch+'/'+i.sprite_sheet_path,out)
 records.push({path:i.sprite_sheet_path,method:'whole-sheet fractional-grid normalization; same scale in all cells',original:[v.width,v.height],final:[cell*cols,cell*2]})
}
fs.writeFileSync(batch+'/canvas-export.json',JSON.stringify(records,null,2)+'\n')
console.log('Exported technical canvases without creative image changes: '+records.length)
