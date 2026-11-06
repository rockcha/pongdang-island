const fs=require('fs'),sharp=require('sharp'),crypto=require('crypto');
(async()=>{
 const files=[],art={};const frameSize=512;
 for(const id of ['cow','chicken','duck','sheep']){
  const source='assets/ui/farm-animal-idle-v26/source/'+id+'.png',meta=await sharp(source).metadata(),cellW=Math.floor(meta.width/2),cellH=Math.floor(meta.height/2),parts=[];
  for(let frame=0;frame<4;frame++){
   const {data,info}=await sharp(source).extract({left:(frame%2)*cellW,top:Math.floor(frame/2)*cellH,width:cellW,height:cellH}).ensureAlpha().raw().toBuffer({resolveWithObject:true});
   const w=info.width,h=info.height,seen=new Uint8Array(w*h),queue=new Int32Array(w*h),components=[];let largest=0;
   for(let i=0;i<w*h;i++)if(!seen[i]&&data[i*4+3]>40){
    let head=0,tail=1;queue[0]=i;seen[i]=1;
    while(head<tail){const j=queue[head++],x=j%w,y=Math.floor(j/w);for(const n of [x>0?j-1:-1,x<w-1?j+1:-1,y>0?j-w:-1,y<h-1?j+w:-1])if(n>=0&&!seen[n]&&data[n*4+3]>40){seen[n]=1;queue[tail++]=n}}
    components.push(Array.from(queue.subarray(0,tail)));largest=Math.max(largest,tail);
   }
   const keep=new Uint8Array(w*h);let minX=w,minY=h,maxX=0,maxY=0;
   for(const component of components)if(component.length>=Math.max(24,largest*.001))for(const i of component){const x=i%w,y=Math.floor(i/w);minX=Math.min(minX,x);maxX=Math.max(maxX,x);minY=Math.min(minY,y);maxY=Math.max(maxY,y);for(let dy=-1;dy<=1;dy++)for(let dx=-1;dx<=1;dx++)if(x+dx>=0&&x+dx<w&&y+dy>=0&&y+dy<h)keep[i+dy*w+dx]=1}
   for(let i=0;i<w*h;i++)if(!keep[i])data[i*4+3]=0;
   const left=Math.max(0,minX-2),top=Math.max(0,minY-2),bounds={left,top,width:Math.min(w,maxX+3)-left,height:Math.min(h,maxY+3)-top};
   if(left===0||top===0||left+bounds.width>=w||top+bounds.height>=h)throw Error(id+' frame '+frame+' touches the cell edge');
   parts.push({data,info,bounds});
  }
  const scale=Math.min(448/Math.max(...parts.map(p=>p.bounds.width)),448/Math.max(...parts.map(p=>p.bounds.height))),frames=[],placements=[];
  for(const part of parts){const width=Math.round(part.bounds.width*scale),height=Math.round(part.bounds.height*scale),left=Math.round((512-width)/2),top=488-height;
   const input=await sharp(part.data,{raw:part.info}).extract(part.bounds).resize(width,height).png().toBuffer();
   frames.push(await sharp({create:{width:512,height:512,channels:4,background:'#00000000'}}).composite([{input,left,top}]).png().toBuffer());placements.push({left,top,width,height});
  }
  const minX=Math.max(0,Math.min(...placements.map(p=>p.left))-8),minY=Math.max(0,Math.min(...placements.map(p=>p.top))-8),maxX=Math.min(512,Math.max(...placements.map(p=>p.left+p.width))+8),maxY=496;
  const runtime='public/farm/art/v26/animals/'+id+'-idle.png';
  await sharp({create:{width:1024,height:1024,channels:4,background:'#00000000'}}).composite(frames.map((input,i)=>({input,left:(i%2)*512,top:Math.floor(i/2)*512}))).png().toFile(runtime);
  const viewBox=[minX,minY,maxX-minX,maxY-minY].join(' ');art[id]={path:'/farm/art/v26/animals/'+id+'-idle.png',viewBox};
  files.push({id,source,runtime,frameSize,columns:2,rows:2,frames:4,scale,placements,viewBox,sha256:crypto.createHash('sha256').update(fs.readFileSync(runtime)).digest('hex')});
  const checks=[];for(const [row,bg]of ['#fff9ee','#223a32','#99a879'].entries())for(let i=0;i<4;i++)checks.push({input:await sharp(frames[i]).resize(128,128).flatten({background:bg}).png().toBuffer(),left:i*128,top:row*128});
  await sharp({create:{width:512,height:384,channels:3,background:'#fff9ee'}}).composite(checks).png().toFile('assets/ui/farm-animal-idle-v26/'+id+'-review.png');
 }
 fs.writeFileSync('src/features/farm/animal-idle-art.json',JSON.stringify(art,null,2));fs.writeFileSync('tmp/farm-animal-idle-v26-assets.json',JSON.stringify(files,null,2));console.log(JSON.stringify(files.map(({id,viewBox})=>({id,viewBox}))));
})();

