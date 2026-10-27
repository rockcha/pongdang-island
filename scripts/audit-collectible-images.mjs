import fs from 'node:fs'
import path from 'node:path'
import sharp from 'sharp'

const root=process.argv[2], partial=process.argv.includes('--partial')
if(!root)throw Error('Usage: node scripts/audit-collectible-images.mjs <batch> [--partial]')
const manifest=JSON.parse(fs.readFileSync(path.join(root,'manifest.json'),'utf8'))
const results=[], thumbs=[]
for(const item of manifest.items){
  for(const type of ['thumbnail',...(item.frames>1?['sprite']:[])]){
    const relative=type==='thumbnail'?item.thumbnail_path:item.sprite_sheet_path
    const source=path.join(root,'sources',`${item.id}-${type}.source`)
    const file=fs.existsSync(source)?source:path.join(root,relative)
    if(!fs.existsSync(file)){results.push({id:item.id,type,missing:true});continue}
    const {data,info}=await sharp(file).ensureAlpha().raw().toBuffer({resolveWithObject:true})
    const columns=type==='thumbnail'?1:item.frames===8?4:2, rows=type==='thumbnail'?1:2
    const cw=info.width/columns,ch=info.height/rows
    const warnings=[], frames=[]
    if(Math.abs(cw-ch)>1)warnings.push('non-square-cell')
    for(let frame=0;frame<columns*rows;frame++){
      let minX=cw,minY=ch,maxX=-1,maxY=-1,opaque=0,transparent=0,soft=0
      const ox=Math.round(frame%columns*cw),oy=Math.round(Math.floor(frame/columns)*ch)
      for(let y=0;y<Math.floor(ch);y++)for(let x=0;x<Math.floor(cw);x++){
        const a=data[((y+oy)*info.width+x+ox)*4+3]
        if(a===0)transparent++;else if(a<255)soft++
        if(a>=32){opaque++;minX=Math.min(minX,x);maxX=Math.max(maxX,x);minY=Math.min(minY,y);maxY=Math.max(maxY,y)}
      }
      const margin=Math.min(minX,minY,cw-maxX-1,ch-maxY-1)
      const minimum=type==='sprite'&&item.frames===8?cw*.08:2
      if(!opaque)warnings.push(`empty-frame-${frame}`)
      if(transparent<cw*ch*.01)warnings.push(`missing-alpha-${frame}`)
      if(margin<minimum)warnings.push(`unsafe-margin-${frame}`)
      frames.push({frame,bounds:[minX,minY,maxX-minX+1,maxY-minY+1],margin,occupancy:Math.max((maxX-minX+1)/cw,(maxY-minY+1)/ch),opaque,transparent,soft})
    }
    results.push({id:item.id,type,file,width:info.width,height:info.height,cell:cw,frames,warnings})
    if(type==='thumbnail')thumbs.push({item,file})
  }
}
const previewRoot=path.join(root,'review')
fs.mkdirSync(previewRoot,{recursive:true})
for(let start=0;start<thumbs.length;start+=6){
  for(const [background,name] of [['#fff7e6','light'],['#203c46','dark']]){
    const canvas=sharp({create:{width:900,height:640,channels:4,background}}),layers=[]
    for(let index=start;index<Math.min(start+6,thumbs.length);index++){
      const {item,file}=thumbs[index],cell=index-start,x=cell%3*300,y=Math.floor(cell/3)*320
      layers.push({input:await sharp(file).resize(270,270,{fit:'contain',background:{r:0,g:0,b:0,alpha:0}}).png().toBuffer(),left:x+15,top:y+5})
      const label=item.id.replace('plunder-','')
      layers.push({input:Buffer.from(`<svg width="300" height="35"><text x="150" y="23" text-anchor="middle" font-family="Arial" font-size="13" fill="${name==='dark'?'#e8e5cf':'#52644e'}">${label}</text></svg>`),left:x,top:y+280})
    }
    await canvas.composite(layers).png().toFile(path.join(previewRoot,`thumbs-${start}-${name}.png`))
  }
}
fs.writeFileSync(path.join(root,'audit.json'),JSON.stringify({results},null,2)+'\n')
const missing=results.filter(r=>r.missing).length, flagged=results.filter(r=>r.warnings?.length)
console.log(JSON.stringify({checked:results.length-missing,missing,flagged:flagged.map(r=>({id:r.id,type:r.type,warnings:r.warnings})),contactSheets:Math.ceil(thumbs.length/6)*2}))
if(!partial&&(missing||flagged.length))process.exitCode=1
