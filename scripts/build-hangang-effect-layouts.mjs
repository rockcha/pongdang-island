import fs from 'node:fs'
import sharp from 'sharp'
const sheets=JSON.parse(fs.readFileSync('src/features/aquarium/hangang-mythic-action-layouts.json')),result={}
for(const sheet of sheets){
 const file=`public/aquarium/swim/${sheet.id}_swim8_v${sheet.assetVersion??1}_sprite.png`,{data,info}=await sharp(file).ensureAlpha().raw().toBuffer({resolveWithObject:true}),cell=info.width/4
 let left=cell,top=cell,right=0,bottom=0
 for(let frame=0;frame<8;frame++)for(let y=0;y<cell;y++)for(let x=0;x<cell;x++)if(data[((Math.floor(frame/4)*cell+y)*info.width+frame%4*cell+x)*4+3]>=32){left=Math.min(left,x);top=Math.min(top,y);right=Math.max(right,x);bottom=Math.max(bottom,y)}
 const box={left:left/cell,top:top/cell,width:(right-left+1)/cell,height:(bottom-top+1)/cell}
 result[sheet.id]=box
 if(sheet.id==='hangang-mago-creator'){
  box.hands=[]
  for(let frame=0;frame<8;frame++){
   const points=[]
   for(let y=Math.ceil(top+(bottom-top)*.22);y<top+(bottom-top)*.52;y++)for(let x=Math.ceil(left+(right-left)*.62);x<=right;x++){
    const at=((Math.floor(frame/4)*cell+y)*info.width+frame%4*cell+x)*4,[r,g,b,a]=data.subarray(at,at+4)
    if(a>=128&&r>170&&g>110&&g<225&&b>85&&r>g*1.05&&g>b*1.07)points.push([x,y])
   }
   if(points.length<8)throw Error('No visible hand anchor for Mago frame '+frame)
   points.sort((a,b)=>b[0]-a[0]);const tip=points.slice(0,Math.max(8,Math.ceil(points.length*.15)))
   box.hands.push([tip.reduce((s,p)=>s+p[0],0)/tip.length/cell-box.width*.02,tip.reduce((s,p)=>s+p[1],0)/tip.length/cell])
  }
 }
}
fs.writeFileSync('src/features/aquarium/hangang-effect-layouts.json',JSON.stringify(result,null,2)+'\n')
console.log(JSON.stringify({effectLayouts:Object.keys(result).length}))
