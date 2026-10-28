import sharp from 'sharp'
import {readFileSync,writeFileSync} from 'node:fs'
import {batch,items} from './prepare-firefly-assets.mjs'
const manifest=JSON.parse(readFileSync(batch+'/manifest.json','utf8'))
for(const item of items.filter(i=>i.sprite_sheet_path)){
 const asset=manifest.assets.find(a=>a.path===item.sprite_sheet_path)
 if(!asset)continue
 const columns=item.rarity==='mythic'?4:2,input=readFileSync(asset.original),meta=await sharp(input).metadata()
 if(Math.abs(meta.width/columns-meta.height/2)>1)throw Error('Regenerate incorrect sprite grid: '+item.id)
 const cell=Math.ceil(Math.max(meta.width/columns,meta.height/2))
 // A single canvas export transform aligns fractional source cells to integer
 // pixels. Every pose receives exactly the same scale; source PNG is immutable.
 if(meta.width!==cell*columns||meta.height!==cell*2){
  const output=await sharp(input).resize(cell*columns,cell*2,{fit:'fill'}).png().toBuffer()
  const target=batch+'/'+item.sprite_sheet_path
  if(!readFileSync(target).equals(output))writeFileSync(target,output)
  console.log('Aligned fractional canvas: '+item.id)
 }
}
