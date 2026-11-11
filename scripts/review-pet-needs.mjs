import fs from 'node:fs'
import sharp from 'sharp'
const {batch,sheets}=await import(process.argv.includes('--blink') ? './prepare-pet-needs-blink.mjs' : './prepare-pet-needs.mjs')
const patches = {
  'sand-golem-needs': [198,127,60,25],
  'wave-cat-needs': [240,130,40,25],
  'mochi-dragon-needs': [181,113,40,25],
  'jelly-seal-needs': [162,100,55,25],
}
const entries=[]
for (const s of sheets) {
  const file=`${batch}/normalized/${s.id}.png`, meta=await sharp(file).metadata(),cell=meta.width / 4,patch=patches[s.id.replace('-blink','')]
  const [x,y,w,h]=patch
  await sharp(file).extract({left:0,top:0,width:cell,height:cell}).flatten({background:'#faf6ef'}).composite([{input:Buffer.from(`<svg width="${cell}" height="${cell}"><rect x="${x}" y="${y}" width="${w}" height="${h}" fill="none" stroke="#ff00b9" stroke-width="2"/></svg>`)}]).png().toFile(`${batch}/review/${s.id}-anchor.png`)
  entries.push({id:s.id,file,storage_path:s.sprite_sheet_path,patch,reviewed:false})
  for (const [theme,color] of [['light','#faf6ef'],['dark','#193744']]) await sharp(file).flatten({background:color}).resize(1200).png().toFile(`${batch}/review/${s.id}-${theme}.png`)
}
fs.writeFileSync(`${batch}/anchor-review.json`,JSON.stringify(entries,null,2)+'\n')
