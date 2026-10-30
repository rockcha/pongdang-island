import fs from 'node:fs'
import sharp from 'sharp'
const batch=process.argv[2]??'assets/storage-upload/new/20261030-101406',tasks=JSON.parse(fs.readFileSync(process.argv[3]??'.cache/pharaoh-awakening-final-inputs.json','utf8')),m=JSON.parse(fs.readFileSync(batch+'/manifest.json','utf8')),audits=[]
for(const a of m.assets.filter(a=>a.role==='sprite-source'))a.status='rejected-insufficient-original-margins'
for(const t of tasks){
 const source='sources/'+t.id+'-compact-sheet.png';fs.copyFileSync(t.source,batch+'/'+source)
 const {data,info}=await sharp(t.source).ensureAlpha().raw().toBuffer({resolveWithObject:true}),cw=info.width/4,ch=info.height/2,bounds=[],cell=Math.ceil(Math.max(cw,ch)),out=Buffer.alloc(cell*cell*8*4)
 for(let n=0;n<8;n++){const ox=Math.round(n%4*cw),oy=Math.round(Math.floor(n/4)*ch),w=Math.round((n%4+1)*cw)-ox,h=Math.round((Math.floor(n/4)+1)*ch)-oy;let left=w,top=h,right=-1,bottom=-1;
  for(let y=0;y<h;y++)for(let x=0;x<w;x++){const p=((oy+y)*info.width+ox+x)*4;if(data[p+3]>=32){left=Math.min(left,x);top=Math.min(top,y);right=Math.max(right,x);bottom=Math.max(bottom,y)}data.copy(out,((Math.floor(n/4)*cell+y)*cell*4+n%4*cell+x)*4,p,p+4)}
  bounds.push({frame:n,left,top,right,bottom,minMargin:Math.min(left,top,w-1-right,h-1-bottom)/Math.min(w,h)})
 }
 const audit={id:t.id,source,width:info.width,height:info.height,cell,bounds,passed:bounds.every(b=>b.minMargin>=.08)};audits.push(audit)
 if(audit.passed){await sharp(out,{raw:{width:cell*4,height:cell*2,channels:4}}).png().toFile(batch+'/sources/'+t.id+'-normalized.png');await sharp(out,{raw:{width:cell*4,height:cell*2,channels:4}}).extract({left:0,top:0,width:cell,height:cell}).png().toFile(batch+'/sources/'+t.id+'-frame0.png')}
 m.assets=m.assets.filter(a=>!(a.id===t.id&&a.role==='sprite-source-current'))
 m.assets.push({...t,source,role:'sprite-source-current',frames:8,references:[m.assets.find(a=>a.id===t.id&&a.role==='thumbnail').target,batch+'/guides/'+t.id+'-compact.png']})
}
fs.writeFileSync(batch+'/raw-compact-audit.json',JSON.stringify(audits,null,2)+'\n');fs.writeFileSync(batch+'/manifest.json',JSON.stringify(m,null,2)+'\n')
console.log(JSON.stringify(audits.map(a=>({id:a.id,cell:a.cell,minMargin:Math.min(...a.bounds.map(b=>b.minMargin)),passed:a.passed}))))
