import fs from 'node:fs'
import sharp from 'sharp'
import {batch,items} from './prepare-hologram-assets.mjs'
const grids=JSON.parse(fs.readFileSync(`${batch}/source-grids.json`,'utf8'))
const previous=fs.existsSync(`${batch}/anchor-review.json`)?JSON.parse(fs.readFileSync(`${batch}/anchor-review.json`,'utf8')):[]
const candidates=[]
for(const g of grids){
 const item=items.find(i=>i.id===g.id),b=g.rawBounds[0],patchSize=Math.max(24,Math.round(g.cell*.045))
 const target=item.movement_type==='fixed'?[.5,.88]:item.id.endsWith('-eve')?[.70,.20]:item.id.endsWith('-masquerade')?[.86,.24]:item.id.includes('jellyfish')||item.id.endsWith('-simula')?[.60,.30]:item.id.includes('octopus')||item.id.endsWith('-memoria')?[.60,.34]:[.80,.44]
 const tx=b.left+b.width*target[0],ty=b.top+b.height*target[1]
 const {data,info}=await sharp(g.file).extract({left:0,top:0,width:g.cell,height:g.cell}).ensureAlpha().raw().toBuffer({resolveWithObject:true})
 let best=null
 for(let y=Math.max(b.top,Math.round(ty-patchSize*2));y<Math.min(g.cell-patchSize,ty+patchSize);y+=3)for(let x=Math.max(b.left,Math.round(tx-patchSize*2));x<Math.min(g.cell-patchSize,tx+patchSize);x+=3){
  let opaque=0,total=0,sum=0,square=0
  for(let py=0;py<patchSize;py+=3)for(let px=0;px<patchSize;px+=3){const p=((y+py)*info.width+x+px)*4;total++;if(data[p+3]<128)continue;opaque++;const v=(data[p]+data[p+1]+data[p+2])/3;sum+=v;square+=v*v}
  if(opaque<20||opaque<total*.8)continue
  const variance=square/opaque-(sum/opaque)**2,distance=Math.hypot(x+patchSize/2-tx,y+patchSize/2-ty),score=Math.sqrt(Math.max(0,variance))-distance*.45
  if(!best||score>best.score)best={patch:[x,y,patchSize,patchSize],score}
 }
 if(!best)throw Error(`No sufficiently opaque candidate patch: ${g.id}`)
 const old=previous.find(r=>r.id===g.id)
 candidates.push({id:g.id,file:g.file,storage_path:g.storage_path,frames:g.frames,patch:old?.patch??best.patch,reviewed:old?.reviewed??false})
}
fs.writeFileSync(`${batch}/anchor-candidates.json`,JSON.stringify(candidates,null,2)+'\n')
for(const frames of [4,8])fs.writeFileSync(`${batch}/anchor-config-${frames}.json`,JSON.stringify(candidates.filter(c=>c.frames===frames),null,2)+'\n')
fs.mkdirSync(`${batch}/review`,{recursive:true})
for(let start=0;start<candidates.length;start+=6){
 const layers=[]
 for(const [n,c] of candidates.slice(start,start+6).entries()){
  const g=grids.find(g=>g.id===c.id),p=c.patch
  const overlay=Buffer.from(`<svg width="${g.cell}" height="${g.cell}"><rect x="${p[0]}" y="${p[1]}" width="${p[2]}" height="${p[3]}" fill="none" stroke="#4cff64" stroke-width="2"/></svg>`)
  const first=await sharp(c.file).extract({left:0,top:0,width:g.cell,height:g.cell}).png().toBuffer()
  const marked=await sharp(first).composite([{input:overlay}]).png().toBuffer()
  layers.push({input:await sharp(marked).resize(350,350).png().toBuffer(),left:n%3*360+5,top:Math.floor(n/3)*390})
  layers.push({input:Buffer.from(`<svg width="360" height="40"><text x="8" y="24" font-size="13" font-family="Arial" fill="white">${c.id} (${g.cell})</text></svg>`),left:n%3*360,top:Math.floor(n/3)*390+350})
 }
 await sharp({create:{width:1080,height:780,channels:4,background:'#102438'}}).composite(layers).png().toFile(`${batch}/review/anchors-${start}.png`)
}
console.log(JSON.stringify({candidates:candidates.length,reviewed:candidates.filter(c=>c.reviewed).length}))
