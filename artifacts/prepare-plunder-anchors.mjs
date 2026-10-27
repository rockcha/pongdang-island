import fs from 'node:fs'
import sharp from 'sharp'
const root=process.argv[2]??'assets/storage-upload/new/20261027-034411'
const reports=JSON.parse(fs.readFileSync(root+'/registration.json','utf8').replace(/^\uFEFF/,''))
const configs={4:[],8:[]},layers=[]
for(let index=0;index<reports.length;index++){
 const r=reports[index],columns=r.storage_path.includes('swim8')?4:2,cell=r.cell
 const file=root+'/'+r.storage_path
 const {data,info}=await sharp(file).ensureAlpha().raw().toBuffer({resolveWithObject:true})
 const w=Math.max(24,Math.round(cell*.07)),h=w
 let best=-Infinity,patch
 for(let y=Math.round(cell*.28);y<cell*.65;y+=5)for(let x=Math.round(cell*.52);x<cell*.79;x+=5){
  let n=0,sum=0,squares=0,opaque=0
  for(let py=y;py<y+h;py+=3)for(let px=x;px<x+w;px+=3){
   const p=(py*info.width+px)*4,a=data[p+3];n++;if(a>200)opaque++
   const v=(data[p]+data[p+1]+data[p+2])/3;sum+=v;squares+=v*v
  }
  if(opaque<n*.95)continue
  const score=squares/n-(sum/n)**2
  if(score>best){best=score;patch=[x,y,w,h]}
 }
 if(!patch)throw Error('No opaque head/body patch: '+r.id)
 r.patch=patch
 configs[columns*2].push({file,storage_path:r.storage_path,patch})
 const svg=Buffer.from(`<svg width="${cell}" height="${cell}"><rect x="${patch[0]}" y="${patch[1]}" width="${w}" height="${h}" fill="none" stroke="#ff1fb5" stroke-width="4"/></svg>`)
 const crop=await sharp(file).extract({left:0,top:0,width:cell,height:cell}).png().toBuffer()
 const marked=await sharp(crop).composite([{input:svg}]).png().toBuffer()
 const thumb=await sharp(marked).resize(210,210).png().toBuffer()
 const label=Buffer.from(`<svg width="230" height="24"><text x="115" y="18" text-anchor="middle" font-size="10" fill="#243a40">${r.id.replace('plunder-','')}</text></svg>`)
 layers.push({input:thumb,left:index%5*230+10,top:Math.floor(index/5)*240},{input:label,left:index%5*230,top:Math.floor(index/5)*240+210})
}
fs.mkdirSync(root+'/review',{recursive:true})
await sharp({create:{width:1150,height:Math.ceil(reports.length/5)*240,channels:4,background:'#f6ecd7'}}).composite(layers).png().toFile(root+'/review/anchor-patches.png')
for(const frames of [4,8])fs.writeFileSync(root+`/anchors-${frames===4?'four':'eight'}.json`,JSON.stringify(configs[frames],null,2)+'\n')
fs.writeFileSync(root+'/registration.json',JSON.stringify(reports,null,2)+'\n')
