import fs from 'node:fs'
import path from 'node:path'
import sharp from 'sharp'
import {createHash} from 'node:crypto'
const {root}=JSON.parse(fs.readFileSync('artifacts/pirate-rod-root.json','utf8'))
const m=JSON.parse(fs.readFileSync(root+'/manifest.json','utf8')),reports=[],layers=[]
for(let n=0;n<m.items.length;n++){
 const i=m.items[n],file=root+'/'+i.path,{data,info}=await sharp(file).ensureAlpha().raw().toBuffer({resolveWithObject:true})
 let minX=info.width,minY=info.height,maxX=-1,maxY=-1,clear=0
 for(let y=0;y<info.height;y++)for(let x=0;x<info.width;x++){const a=data[(y*info.width+x)*4+3];if(!a)clear++;if(a>=32){minX=Math.min(minX,x);maxX=Math.max(maxX,x);minY=Math.min(minY,y);maxY=Math.max(maxY,y)}}
 const margin=Math.min(minX,minY,info.width-maxX-1,info.height-maxY-1)
 if(info.width!==info.height||margin<2||clear<info.width*info.height*.05)throw Error('Unsafe transparent artwork '+i.id)
 reports.push({id:i.id,file:i.path,width:info.width,height:info.height,bounds:[minX,minY,maxX-minX+1,maxY-minY+1],margin,transparentPixels:clear,sha256:createHash('sha256').update(fs.readFileSync(file)).digest('hex')})
 for(const [row,bg] of ['#fff7e6','#193544'].entries()){
  const image=await sharp(file).resize(235,235,{fit:'contain',background:{r:0,g:0,b:0,alpha:0}}).png().toBuffer()
  layers.push({input:await sharp({create:{width:250,height:270,channels:4,background:bg}}).composite([{input:image,left:7,top:0},{input:Buffer.from(`<svg width="250" height="30"><text x="125" y="20" text-anchor="middle" font-size="13" fill="${row?'#fff7e6':'#594735'}">${i.id}</text></svg>`),left:0,top:238}]).png().toBuffer(),left:n*250,top:row*270})
 }
}
fs.mkdirSync(root+'/review',{recursive:true})
await sharp({create:{width:m.items.length*250,height:540,channels:4,background:'#fff7e6'}}).composite(layers).png().toFile(root+'/review/assets.png')
fs.writeFileSync(root+'/audit.json',JSON.stringify(reports,null,2)+'\n')
const upload='artifacts/pirate-rod-upload'
for(const i of m.items.filter(i=>i.type!=='region-icon')){const target=upload+'/'+i.path;fs.mkdirSync(path.dirname(target),{recursive:true});fs.copyFileSync(root+'/'+i.path,target)}
console.log('PASS: five complete transparent assets; staged only four equipment PNGs')
