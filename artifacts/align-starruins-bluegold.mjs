import fs from 'node:fs'
import sharp from 'sharp'
const root='assets/storage-upload/new/20261029-055051'
const read=p=>JSON.parse(fs.readFileSync(p,'utf8').replace(/^\uFEFF/,''))
const list=p=>{const value=read(p);return Array.isArray(value)?value:[value]}
const write=(p,v)=>fs.writeFileSync(p,JSON.stringify(v,null,2)+'\n')
const manifest=read(root+'/manifest.json')
const command=process.argv[2]
if(command==='config'){
 const patches=read(root+'/anchor-patches.json'),configs={four:[],eight:[]}
 for(const s of manifest.items.filter(s=>s.frames>1)){
  let file=root+'/sources/'+s.id+'-sprite.source'
  let meta=await sharp(file).metadata()
  const columns=s.frames===8?4:2
  if(Math.abs(meta.width/columns-meta.height/2)>1)throw Error('Non-square cells: '+s.id)
  if(meta.width%columns||meta.height%2){
   const targetCell=Math.round(meta.width/columns),normalized=root+'/sources/'+s.id+'-sprite-grid.source'
   await sharp(file).resize(targetCell*columns,targetCell*2).png().toFile(normalized)
   file=normalized;meta=await sharp(file).metadata()
  }
  const cell=meta.width/columns
  const p=patches[s.id];if(!p)throw Error('Missing visually chosen patch '+s.id)
  configs[s.frames===8?'eight':'four'].push({file,storage_path:s.sprite_sheet_path,patch:p.map(v=>Math.round(v*cell))})
 }
 for(const [n,c] of Object.entries(configs))write(root+'/anchor-config-'+n+'.json',c)
}
if(command==='align'||command==='align-four'){
 const registrations=[...list(root+'/anchor-results-four.json'),...(command==='align'?list(root+'/anchor-results-eight.json'):[])]
 const report=[]
 for(const s of manifest.items.filter(s=>s.frames>1&&(command==='align'||s.frames===4))){
  const reg=registrations.find(r=>r.storage_path===s.sprite_sheet_path)
  if(!reg||reg.frames.length!==s.frames||reg.frames.some(f=>!Number.isFinite(f.rmse)||f.rmse>60))throw Error('Bad registration '+s.id)
  const source=reg.file,meta=await sharp(source).metadata(),columns=s.frames===8?4:2,cell=meta.width/columns
  const frames=[];let minX=cell,minY=cell,maxX=0,maxY=0
  for(let f=0;f<s.frames;f++){
   const raw=await sharp(source).extract({left:f%columns*cell,top:Math.floor(f/columns)*cell,width:cell,height:cell}).ensureAlpha().raw().toBuffer()
   const r=reg.frames[f];let l=cell,t=cell,rr=0,b=0
   for(let y=0;y<cell;y++)for(let x=0;x<cell;x++)if(raw[(y*cell+x)*4+3]>=32){l=Math.min(l,x);t=Math.min(t,y);rr=Math.max(rr,x);b=Math.max(b,y)}
   const margin=Math.min(l,t,cell-1-rr,cell-1-b)
   if(margin<2||(s.frames===8&&margin<cell*.08))throw Error('RAW SOURCE CLIPPED/unsafe '+s.id+' frame '+f+' margin '+margin)
   minX=Math.min(minX,l-r.dx);minY=Math.min(minY,t-r.dy);maxX=Math.max(maxX,rr-r.dx);maxY=Math.max(maxY,b-r.dy)
   frames.push({f,raw,r,bounds:[l,t,rr,b],rawMargin:margin})
  }
  // One scale and one shared center shift for the union of ALL motion poses.
  const span=Math.max(maxX-minX+1,maxY-minY+1),scaledCell=Math.round(cell*Math.min(1,.82*cell/span)),scale=scaledCell/cell
  const tx=(cell-(minX+maxX)*scale)/2,ty=(cell-(minY+maxY)*scale)/2
  const layers=[]
  for(const {f,raw,r} of frames){
   const dx=Math.round(-r.dx*scale+tx),dy=Math.round(-r.dy*scale+ty)
   const cropped=await sharp(raw,{raw:{width:cell,height:cell,channels:4}}).resize(scaledCell,scaledCell).extract({left:Math.max(0,-dx),top:Math.max(0,-dy),width:Math.min(scaledCell-Math.max(0,-dx),cell-Math.max(0,dx)),height:Math.min(scaledCell-Math.max(0,-dy),cell-Math.max(0,dy))}).png().toBuffer()
   const aligned=await sharp({create:{width:cell,height:cell,channels:4,background:'#00000000'}}).composite([{input:cropped,left:Math.max(0,dx),top:Math.max(0,dy)}]).png().toBuffer()
   layers.push({input:aligned,left:f%columns*cell,top:Math.floor(f/columns)*cell})
  }
  await sharp({create:{width:cell*columns,height:cell*2,channels:4,background:'#00000000'}}).composite(layers).png().toFile(root+'/'+s.sprite_sheet_path)
  s.registration={method:'Visually selected opaque rigid anchor; RGB translation measured on source; one common scale and center for entire loop baked into final PNG',patch:reg.patch,cell,scale,displayScale:.82/(span*scale/cell),translate:[tx,ty],frames:reg.frames}
  report.push({id:s.id,cell,scale,translate:[tx,ty],rawMargins:frames.map(f=>f.rawMargin),maxRmse:Math.max(...reg.frames.map(f=>f.rmse))})
 }
 write(root+'/registration.json',report);write(root+'/manifest.json',manifest)
}
if(command==='final-config'||command==='final-four-config'){
 const configs={four:[],eight:[]}
 for(const s of manifest.items.filter(s=>s.frames>1&&(command==='final-config'||s.frames===4))){
  const r=s.registration;if(!r)throw Error('Missing registration '+s.id)
  const [x,y,w,h]=r.patch,[tx,ty]=r.translate
  configs[s.frames===8?'eight':'four'].push({file:root+'/'+s.sprite_sheet_path,storage_path:s.sprite_sheet_path,patch:[Math.round(x*r.scale+tx),Math.round(y*r.scale+ty),Math.round(w*r.scale),Math.round(h*r.scale)]})
 }
 for(const [n,c] of Object.entries(configs))write(root+'/final-anchor-config-'+n+'.json',c)
}
if(command==='verify'){
 const registrations=[...list(root+'/final-anchor-results-four.json'),...list(root+'/final-anchor-results-eight.json')]
 const results=[]
 for(const s of manifest.items.filter(s=>s.frames>1)){
  const r=registrations.find(r=>r.storage_path===s.sprite_sheet_path)
  if(!r||r.frames.some(f=>!Number.isFinite(f.rmse)||f.rmse>60||Math.abs(f.dx)>1||Math.abs(f.dy)>1))throw Error('Final rigid anchor drifts '+s.id)
  const columns=s.frames===8?4:2,meta=await sharp(root+'/'+s.sprite_sheet_path).metadata(),cell=meta.width/columns,frames=[]
  let first
  for(let f=0;f<s.frames;f++){
   const raw=await sharp(root+'/'+s.sprite_sheet_path).extract({left:f%columns*cell,top:Math.floor(f/columns)*cell,width:cell,height:cell}).ensureAlpha().raw().toBuffer()
   let l=cell,t=cell,right=0,b=0,changed=0
   for(let y=0;y<cell;y++)for(let x=0;x<cell;x++){
    const p=(y*cell+x)*4
    if(raw[p+3]>=32){l=Math.min(l,x);t=Math.min(t,y);right=Math.max(right,x);b=Math.max(b,y)}
    if(first&&Math.max(...[0,1,2,3].map(k=>Math.abs(raw[p+k]-first[p+k])))>20)changed++
   }
   if(!first)first=raw
   const margin=Math.min(l,t,cell-1-right,cell-1-b),occupancy=Math.max(right-l+1,b-t+1)/cell
   if(margin<cell*.075||occupancy>.84)throw Error('Bad final padding '+s.id+' frame '+f)
   if(f>0&&changed<cell*cell*.001)throw Error('No physical pose difference '+s.id+' frame '+f)
   frames.push({frame:f,margin,occupancy,changedPixelsFromFirst:changed,anchor:r.frames[f]})
  }
  results.push({id:s.id,cell,displayScale:s.registration.displayScale,patch:r.patch,frames})
 }
 write(root+'/final-verification.json',{passed:true,scope:'Measured final PNG anchors and complete silhouettes; translation only, same scale for all poses; original sources separately audited',results})
 console.log(JSON.stringify({sheets:results.length,maxVerticalResidual:Math.max(...results.flatMap(s=>s.frames.map(f=>Math.abs(f.anchor.dy))))}))
}
