import fs from 'node:fs'
import sharp from 'sharp'
const root='assets/storage-upload/new/20261026-033245'
const manifest=JSON.parse(fs.readFileSync(root+'/manifest.json','utf8'))
const patches={
 'dreamabyss-hallucination-coral-crab':[300,300,45,45],
 'dreamabyss-reverie-whelk':[295,315,45,45],
 'dreamabyss-dream-clam':[104,395,36,36],
 'dreamabyss-violet-ghost-shark':[550,395,38,38],
 'dreamabyss-slumber-curtain':[470,225,40,40],
 'dreamabyss-moon-dream-wings':[520,382,40,40],
 'dreamabyss-reverie-seadragon':[547,295,35,35],
 'dreamabyss-somnambulist':[500,350,40,40],
 'dreamabyss-lilac-sea-cucumber':[285,345,42,42],
 'dreamabyss-ancient-sleeper':[358,265,24,24],
}
const audit=[],configs=[],previews=[]
fs.mkdirSync('artifacts/dreamabyss-edge-review',{recursive:true})
for(const item of manifest.items){
 if(!item.sheetSource)continue
 const {data,info}=await sharp(item.sheetSource).ensureAlpha().raw().toBuffer({resolveWithObject:true})
 const columns=item.frames===8?4:2,cw=info.width/columns,ch=info.height/2
 if(cw!==ch)throw Error('Non-square cells: '+item.id)
 const bounds=[]
 for(let frame=0;frame<item.frames;frame++){
  let minX=cw,minY=ch,maxX=-1,maxY=-1,count=0
  const ox=Math.round(frame%columns*cw),oy=Math.round(Math.floor(frame/columns)*ch)
  for(let y=0;y<Math.floor(ch);y++)for(let x=0;x<Math.floor(cw);x++)if(data[((oy+y)*info.width+ox+x)*4+3]>=32){minX=Math.min(minX,x);minY=Math.min(minY,y);maxX=Math.max(maxX,x);maxY=Math.max(maxY,y);count++}
  if(count<100||Math.min(minX,minY,cw-1-maxX,ch-1-maxY)<(item.frames===8?cw*.08:2))throw Error('Clipped/insufficient margin original frame: '+item.id+' '+frame+' '+[minX,minY,maxX,maxY])
  bounds.push([minX,minY,maxX-minX+1,maxY-minY+1])
 }
 audit.push({id:item.id,file:item.sheetSource,cell:cw,frames:bounds})
 if(patches[item.id]){
  const patch=patches[item.id]
  configs.push({file:item.sheetSource,storage_path:item.sprite_sheet_path,patch})
  const [x,y,w,h]=patch
  const overlay=Buffer.from(`<svg width="${Math.floor(cw)}" height="${Math.floor(ch)}"><rect x="${x}" y="${y}" width="${w}" height="${h}" fill="none" stroke="red" stroke-width="3"/></svg>`)
  const crop=await sharp(item.sheetSource).extract({left:0,top:0,width:Math.floor(cw),height:Math.floor(ch)}).flatten({background:'#fff8ee'}).png().toBuffer()
  const marked=await sharp(crop).composite([{input:overlay}]).png().toBuffer()
  const preview=await sharp(marked).resize(400).png().toBuffer()
  previews.push({input:preview,left:(previews.length%3)*400,top:Math.floor(previews.length/3)*400})
 }
}
fs.writeFileSync(root+'/raw-audit.json',JSON.stringify(audit,null,2)+'\n')
fs.writeFileSync(root+'/anchor-config.json',JSON.stringify(configs,null,2)+'\n')
fs.writeFileSync(root+'/anchor-config-four.json',JSON.stringify(configs.filter(c=>!c.storage_path.includes('_swim8')),null,2)+'\n')
fs.writeFileSync(root+'/anchor-config-eight.json',JSON.stringify(configs.filter(c=>c.storage_path.includes('_swim8')),null,2)+'\n')
if(previews.length)await sharp({create:{width:1200,height:Math.ceil(previews.length/3)*400,channels:4,background:'#fff8ee'}}).composite(previews).png().toFile('artifacts/dreamabyss-edge-review/anchor-patches.png')
console.log(JSON.stringify(audit))
