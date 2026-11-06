const fs=require('node:fs'),sharp=require('sharp'),crypto=require('node:crypto');
(async()=>{
 const manifest=JSON.parse(fs.readFileSync('assets/ui/farm-medium-bakery-v29/manifest.json','utf8'));
 for(const item of manifest.files){
  const {data,info}=await sharp(item.source).ensureAlpha().raw().toBuffer({resolveWithObject:true});
  let minX=info.width,minY=info.height,maxX=0,maxY=0;
  for(let i=0;i<info.width*info.height;i++){
   if(data[i*4+3]<12)data[i*4+3]=0;
   if(data[i*4+3]>16){const x=i%info.width,y=Math.floor(i/info.width);minX=Math.min(minX,x);minY=Math.min(minY,y);maxX=Math.max(maxX,x);maxY=Math.max(maxY,y)}
  }
  const crop={left:Math.max(0,minX-2),top:Math.max(0,minY-2),width:Math.min(info.width,maxX+3)-Math.max(0,minX-2),height:Math.min(info.height,maxY+3)-Math.max(0,minY-2)};
  await sharp(data,{raw:info}).extract(crop).resize(480,480,{fit:'contain',position:'south',background:'#00000000'}).extend({left:16,right:16,top:16,bottom:16,background:'#00000000'}).png().toFile(item.runtime);
  Object.assign(item,{crop,width:512,height:512,sha256:crypto.createHash('sha256').update(fs.readFileSync(item.runtime)).digest('hex')});
 }
 fs.writeFileSync('assets/ui/farm-medium-bakery-v29/manifest.json',JSON.stringify(manifest,null,2)+'\n');
})();
