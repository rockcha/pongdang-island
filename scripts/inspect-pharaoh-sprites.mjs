import fs from 'node:fs'
import sharp from 'sharp'
import {batch,items} from './prepare-pharaoh-assets.mjs'
const manifest=JSON.parse(fs.readFileSync(batch+'/manifest.json','utf8')),audit=[],configs={4:[],8:[]},previews=[]
for(const item of items.filter(i=>i.sprite_sheet_path)){
 const asset=manifest.assets.find(a=>a.path===item.sprite_sheet_path)
 if(!asset)continue
 const file=asset.original,columns=item.frames/2
 const {data,info}=await sharp(file).ensureAlpha().raw().toBuffer({resolveWithObject:true})
 const cw=Math.floor(info.width/columns),ch=Math.floor(info.height/2),frames=[]
 if(Math.abs(info.width/columns-info.height/2)>1)throw Error('Non-square original cells: '+item.id)
 for(let f=0;f<item.frames;f++){
  let left=cw,top=ch,right=-1,bottom=-1,opaque=0,transparent=0,edgeAlpha=0
  const ox=Math.round(f%columns*info.width/columns),oy=Math.round(Math.floor(f/columns)*info.height/2)
  for(let y=0;y<ch;y++)for(let x=0;x<cw;x++){
   const a=data[((y+oy)*info.width+x+ox)*4+3]
   if(a===0)transparent++
   if(x===0||y===0||x===cw-1||y===ch-1)edgeAlpha=Math.max(edgeAlpha,a)
   if(a<32)continue;left=Math.min(left,x);top=Math.min(top,y);right=Math.max(right,x);bottom=Math.max(bottom,y);opaque++
  }
  frames.push({frame:f,left,top,width:right-left+1,height:bottom-top+1,margin:Math.min(left,top,cw-right-1,ch-bottom-1),opaque,transparent,edgeAlpha})
 }
 audit.push({id:item.id,storage_path:item.sprite_sheet_path,original:file,width:info.width,height:info.height,cell:cw,frames,valid:frames.every(f=>f.opaque>50&&f.transparent>cw*ch*.05&&f.margin>=cw*(item.frames===8?.08:.02))})
 // A measured candidate is only adopted after inspecting the overlay sheet.
 const body=frames[0],n=Math.max(15,Math.floor(Math.min(cw*.05,body.width*.14))),candidates=[]
 const vertical=item.id.includes('anubis')||item.id.includes('horus')||item.id.includes('colossus')?.35:.48
 const regions={
  'pharaoh-gold-medaka':[.74,.98,.15,.7],
  'pharaoh-tomb-serpent-shark':[.76,.98,.25,.75],
  'pharaoh-solar-scarab':[.26,.62,.16,.65],
  'pharaoh-sarcophagus-crab':[.58,.94,.16,.63],
  'pharaoh-sand-spirit':[.7,.98,.3,.72],
  'pharaoh-sleepless-sphinx':[.6,.9,.03,.45],
  'pharaoh-gatekeeper-anubis':[.42,.74,.24,.55],
  'pharaoh-gold-wing-horus':[.45,.8,.35,.7],
 }
 const [minX,maxX,minY,maxY]=regions[item.id]??[.38,.85,.16,.8]
 for(let y=Math.floor(body.top+body.height*minY);y<body.top+body.height*maxY-n;y+=3)for(let x=Math.floor(body.left+body.width*minX);x<body.left+body.width*maxX-n;x+=3){
  let count=0,total=0,sum=0,sq=0
  for(let py=y;py<y+n;py+=3)for(let px=x;px<x+n;px+=3){total++;const off=(py*info.width+px)*4;if(data[off+3]<200)continue;const v=(data[off]+data[off+1]+data[off+2])/3;count++;sum+=v;sq+=v*v}
  if(count<20||count<total*.95)continue
  candidates.push({x,y,n,score:sq/count-(sum/count)**2-Math.abs(y/ch-vertical)*140-Math.abs(x/cw-.62)*80})
 }
 candidates.sort((a,b)=>b.score-a.score);if(!candidates.length)throw Error('No rigid patch candidate: '+item.id)
 const a=candidates[0],patch=[a.x,a.y,n,n]
 // Keep the original coordinate system for read-only registration. Export
 // rounds the grid only if fractional cell dimensions require it.
 const final=batch+'/'+item.sprite_sheet_path,finalMeta=await sharp(final).metadata()
 const factor=(finalMeta.width/columns)/(info.width/columns)
 configs[item.frames].push({file:final,storage_path:item.sprite_sheet_path,patch:patch.map(v=>Math.round(v*factor))})
 const f0=await sharp(file).extract({left:0,top:0,width:cw,height:ch}).png().toBuffer()
 const overlay=Buffer.from(`<svg width="${cw}" height="${ch}"><rect x="${a.x}" y="${a.y}" width="${n}" height="${n}" fill="none" stroke="#ff0055" stroke-width="3"/></svg>`)
 const marked=await sharp(f0).composite([{input:overlay}]).png().toBuffer()
 const thumb=await sharp(marked).resize(200,200).png().toBuffer()
 previews.push({id:item.id,thumb})
}
fs.writeFileSync(batch+'/raw-sprite-audit.json',JSON.stringify({scope:'Generated source before alignment; not production delivery',assets:audit},null,2)+'\n')
for(const n of [4,8])fs.writeFileSync(batch+`/anchors-${n}.json`,JSON.stringify(configs[n],null,2)+'\n')
if(previews.length)await sharp({create:{width:1000,height:Math.ceil(previews.length/5)*230,channels:4,background:'#fff2db'}}).composite(previews.flatMap((p,n)=>[{input:p.thumb,left:n%5*200,top:Math.floor(n/5)*230},{input:Buffer.from(`<svg width="200" height="30"><text x="100" y="18" text-anchor="middle" font-size="10">${p.id.slice(8)}</text></svg>`),left:n%5*200,top:Math.floor(n/5)*230+200}])).png().toFile('artifacts/previews/pharaoh/anchor-candidates.png')
console.log(JSON.stringify({count:audit.length,unsafe:audit.filter(a=>!a.valid).map(a=>({id:a.id,margins:a.frames.map(f=>f.margin),cell:a.cell}))}))
if(!process.argv.includes('--partial')&&(audit.length!==30||audit.some(a=>!a.valid)))process.exitCode=1
