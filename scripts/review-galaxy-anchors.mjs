import fs from 'node:fs'
import sharp from 'sharp'
import {batch} from './prepare-galaxy-assets.mjs'
const read=p=>JSON.parse(fs.readFileSync(p,'utf8').replace(/^\uFEFF/,''))
const reviews=[...read(batch+'/anchor-review.json'),...read('tmp/galaxy-anchor-candidates.json'),...read('tmp/galaxy-extra-anchors.json')]
const grids=read(batch+'/source-grids.json'),selected=process.argv.includes('--unreviewed')?grids.filter(g=>!reviews.find(r=>r.id===g.id)?.reviewed):grids
for(let start=0;start<selected.length;start+=6){
 const layers=[]
 for(const [n,g] of selected.slice(start,start+6).entries()){
  const p=reviews.find(r=>r.id===g.id)?.patch
  const first=await sharp(g.file).extract({left:0,top:0,width:g.cell,height:g.cell}).png().toBuffer()
  const overlay=Buffer.from(`<svg width="${g.cell}" height="${g.cell}">${p?`<rect x="${p[0]}" y="${p[1]}" width="${p[2]}" height="${p[3]}" fill="none" stroke="#00ff00" stroke-width="2"/>`:''}</svg>`)
  const marked=await sharp(first).composite([{input:overlay}]).png().toBuffer()
  layers.push({input:await sharp(marked).resize(350,350).png().toBuffer(),left:n%3*360+5,top:Math.floor(n/3)*390})
  layers.push({input:Buffer.from(`<svg width="360" height="40"><text x="180" y="25" text-anchor="middle" font-family="Arial" font-size="14" fill="white">${g.id} (${g.cell})</text></svg>`),left:n%3*360,top:Math.floor(n/3)*390+350})
 }
 await sharp({create:{width:1080,height:780,channels:4,background:'#223844'}}).composite(layers).png().toFile(`${batch}/review/anchors-${start}.png`)
}
console.log(JSON.stringify({sheets:Math.ceil(selected.length/6),ids:selected.map(g=>g.id)}))
