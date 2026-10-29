import sharp from 'sharp'
import {readFileSync,mkdirSync} from 'node:fs'
const root='assets/storage-upload/new/20261028-232704',m=JSON.parse(readFileSync(root+'/manifest.json'))
mkdirSync('artifacts/previews/nyamnyam-pongi',{recursive:true})
for(const i of m.items){
 for(const type of ['thumbnail','sprite']){
  const p=root+'/'+(type==='thumbnail'?i.thumbnail_path:i.sprite_sheet_path)
  const {data,info}=await sharp(p).ensureAlpha().raw().toBuffer({resolveWithObject:true})
  const seen=new Uint8Array(info.width*info.height),parts=[]
  for(let start=0;start<seen.length;start++){
   if(seen[start]||data[start*4+3]<8)continue
   const queue=[start];seen[start]=1;let minX=info.width,minY=info.height,maxX=0,maxY=0,maxAlpha=0
   for(let n=0;n<queue.length;n++){const p=queue[n],x=p%info.width,y=Math.floor(p/info.width);minX=Math.min(minX,x);minY=Math.min(minY,y);maxX=Math.max(maxX,x);maxY=Math.max(maxY,y);maxAlpha=Math.max(maxAlpha,data[p*4+3]);for(const next of [x>0?p-1:-1,x<info.width-1?p+1:-1,y>0?p-info.width:-1,y<info.height-1?p+info.width:-1])if(next>=0&&!seen[next]&&data[next*4+3]>=8){seen[next]=1;queue.push(next)}}
   parts.push({pixels:queue.length,bounds:[minX,minY,maxX-minX+1,maxY-minY+1],maxAlpha})
  }
  parts.sort((a,b)=>b.pixels-a.pixels)
  console.log(i.id,type,JSON.stringify(parts.slice(0,8)))
  for(const [name,color] of [['light','#fff5e8'],['dark','#203c46']])await sharp(p).flatten({background:color}).resize(900,900).png().toFile('artifacts/previews/nyamnyam-pongi/'+i.id+'-'+type+'-'+name+'.png')
 }
}
