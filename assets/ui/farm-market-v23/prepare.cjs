const fs=require('fs'),sharp=require('sharp'),crypto=require('crypto');
const ids=['market'];
(async()=>{
 const results=[];fs.mkdirSync('public/farm/art/v23/buildings',{recursive:true});
 for(const id of ids){
  const source=`assets/ui/farm-market-v23/source/${id}.png`;if(!fs.existsSync(source))continue;
  const {data,info}=await sharp(source).ensureAlpha().raw().toBuffer({resolveWithObject:true}),{width:w,height:h}=info;
  const seen=new Uint8Array(w*h),queue=new Int32Array(w*h),components=[];let largest=0;
  for(let i=0;i<w*h;i++)if(!seen[i]&&data[i*4+3]>32){
   let head=0,tail=1;queue[0]=i;seen[i]=1;
   while(head<tail){const index=queue[head++],x=index%w,y=Math.floor(index/w);
    for(const next of [x>0?index-1:-1,x<w-1?index+1:-1,y>0?index-w:-1,y<h-1?index+w:-1])if(next>=0&&!seen[next]&&data[next*4+3]>32){seen[next]=1;queue[tail++]=next}
   }
   largest=Math.max(largest,tail);components.push(Array.from(queue.subarray(0,tail)));
  }
  const keep=new Uint8Array(w*h);let minX=w,minY=h,maxX=0,maxY=0;
  for(const component of components)if(component.length>=Math.max(32,largest*.0001))for(const i of component){const x=i%w,y=Math.floor(i/w);minX=Math.min(minX,x);maxX=Math.max(maxX,x);minY=Math.min(minY,y);maxY=Math.max(maxY,y);
   for(let dy=-1;dy<=1;dy++)for(let dx=-1;dx<=1;dx++)if(x+dx>=0&&x+dx<w&&y+dy>=0&&y+dy<h)keep[i+dy*w+dx]=1;
  }
  for(let i=0;i<w*h;i++)if(!keep[i])data[i*4+3]=0;
  const left=Math.max(0,minX-1),top=Math.max(0,minY-1),crop={left,top,width:Math.min(w,maxX+2)-left,height:Math.min(h,maxY+2)-top};
  const runtime=`public/farm/art/v23/buildings/${id}.png`;
  await sharp(data,{raw:info}).extract(crop).resize(488,488,{fit:'contain',position:'south',background:'#00000000'}).extend({left:12,right:12,top:12,bottom:12,background:'#00000000'}).png().toFile(runtime);
  results.push({id,source,runtime,crop,width:512,height:512,viewBox:'12 12 488 488',sha256:crypto.createHash('sha256').update(fs.readFileSync(runtime)).digest('hex')});
 }
 fs.writeFileSync('tmp/farm-market-v23-assets.json',JSON.stringify(results,null,2));console.log(JSON.stringify(results.map(({id,crop})=>({id,crop}))));
})();
