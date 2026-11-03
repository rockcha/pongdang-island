import fs from 'node:fs'
import path from 'node:path'
import sharp from 'sharp'
const batch=path.dirname(new URL(import.meta.url).pathname.replace(/^\/(.:\/)/,'$1'))
const manifest=JSON.parse(fs.readFileSync(path.join(batch,'manifest.json'),'utf8'))
const bounds=async file=>{
 const {data,info}=await sharp(file).ensureAlpha().raw().toBuffer({resolveWithObject:true})
 let minX=info.width,minY=info.height,maxX=-1,maxY=-1
 for(let y=0;y<info.height;y++)for(let x=0;x<info.width;x++)if(data[(y*info.width+x)*4+3]>=32){minX=Math.min(minX,x);maxX=Math.max(maxX,x);minY=Math.min(minY,y);maxY=Math.max(maxY,y)}
 return {width:info.width,height:info.height,box:[minX,minY,maxX-minX+1,maxY-minY+1]}
}
for(const item of manifest.items){
 const source=path.join(batch,'sources',item.id+'-thumbnail.source'),output=path.join(batch,item.thumbnail_path)
 const b=await bounds(source),extent=Math.max(b.box[2],b.box[3]),padding=extent/b.width>.88?Math.ceil((extent/.85-b.width)/2):0
 if(padding)await sharp(source).extend({top:padding,bottom:padding,left:padding,right:padding,background:'#00000000'}).png().toFile(output)
 else fs.copyFileSync(source,output)
 item.thumbnailPreparation={source:'sources/'+item.id+'-thumbnail.source',padding,method:'Uniform transparent padding only; original RGBA pixels unchanged',original:b}
 if(item.frames===4){
  const thumb=await sharp(output).resize(512,512).png().toBuffer()
  const guide=await sharp({create:{width:1024,height:1024,channels:4,background:'#00000000'}}).composite([0,1,2,3].map(i=>({input:thumb,left:i%2*512,top:Math.floor(i/2)*512}))).png().toBuffer()
  fs.writeFileSync(path.join(batch,'sources',item.id+'-placement-guide.source'),guide)
  fs.mkdirSync('artifacts/previews/cute-common-species',{recursive:true})
  fs.writeFileSync('artifacts/previews/cute-common-species/'+item.id+'-guide.png',guide)
 }
}
fs.writeFileSync(path.join(batch,'manifest.json'),JSON.stringify(manifest,null,2)+'\n')
console.log(manifest.items.map(i=>({id:i.id,padding:i.thumbnailPreparation.padding})))
