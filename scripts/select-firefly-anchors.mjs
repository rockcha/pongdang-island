import sharp from 'sharp'
import {readFileSync,writeFileSync,existsSync,mkdirSync} from 'node:fs'
import {batch,items} from './prepare-firefly-assets.mjs'

// Select candidates only; inspect the overlaid preview before registering them.
const configs={4:[],8:[]},previews=[]
for(const item of items.filter(i=>i.sprite_sheet_path)){
 const file=batch+'/'+item.sprite_sheet_path
 if(!existsSync(file))continue
 const cols=item.rarity==='mythic'?4:2,frames=cols*2
 const {data,info}=await sharp(file).ensureAlpha().raw().toBuffer({resolveWithObject:true})
 const cw=Math.floor(info.width/cols),ch=Math.floor(info.height/2)
 if(Math.abs(info.width/cols-info.height/2)>1)throw Error('Non-square animation cells: '+item.id)
 const n=Math.max(14,Math.floor(cw*.06)),candidates=[]
 for(let y=Math.floor(ch*.2);y<ch*.78-n;y+=Math.max(3,Math.floor(ch*.015)))for(let x=Math.floor(cw*.58);x<cw*.96-n;x+=Math.max(3,Math.floor(cw*.015))){
  let count=0,sum=0,sq=0,opaque=0,all=0
  for(let py=y;py<y+n;py+=3)for(let px=x;px<x+n;px+=3){
   const off=(py*info.width+px)*4;all++
   if(data[off+3]<180)continue
   const v=(data[off]+data[off+1]+data[off+2])/3
   opaque++;count++;sum+=v;sq+=v*v
  }
  if(opaque<20||opaque<all*.9)continue
  const variance=sq/count-(sum/count)**2
  // Prefer an opaque textured head/body feature in the right half, not a wing tip.
  candidates.push({x,y,n,score:variance-Math.abs(y/ch-.43)*80})
 }
 candidates.sort((a,b)=>b.score-a.score)
 if(!candidates.length)throw Error('No opaque anatomy anchor: '+item.id)
 const a=candidates[0],patch=[a.x,a.y,n,n]
 configs[frames].push({file,storage_path:item.sprite_sheet_path,patch})
 const frame=await sharp(file).extract({left:0,top:0,width:cw,height:ch}).png().toBuffer()
 const box=Buffer.from(`<svg width="${cw}" height="${ch}"><rect x="${a.x}" y="${a.y}" width="${n}" height="${n}" fill="none" stroke="#ff2359" stroke-width="3"/></svg>`)
 previews.push({id:item.id,file:frame,box,cw,ch})
}
for(const count of [4,8])writeFileSync(batch+`/anchors-${count}.json`,JSON.stringify(configs[count],null,2)+'\n')
const size=220,cols=5,layers=[]
for(let i=0;i<previews.length;i++){
 const p=previews[i],overlaid=await sharp(p.file).composite([{input:p.box}]).png().toBuffer()
 const input=await sharp(overlaid).resize(size,size,{fit:'contain',background:'#e8e5d7'}).png().toBuffer()
 layers.push({input,left:i%cols*size,top:Math.floor(i/cols)*size})
}
if(layers.length){mkdirSync('artifacts/previews/firefly',{recursive:true});await sharp({create:{width:cols*size,height:Math.ceil(previews.length/cols)*size,channels:4,background:'#e8e5d7'}}).composite(layers).png().toFile('artifacts/previews/firefly/anchor-candidates.png')}
console.log(JSON.stringify({four:configs[4].length,eight:configs[8].length,preview:'artifacts/previews/firefly/anchor-candidates.png'}))
