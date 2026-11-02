import fs from 'node:fs/promises'
import sharp from 'sharp'
const manifest=JSON.parse(await fs.readFile('assets/exploration/monsters/deep-manifest.json','utf8'))
const tiles=[],measurements={}
for(let i=0;i<manifest.images.length;i++){
 const item=manifest.images[i],{data,info}=await sharp(item.output).ensureAlpha().raw().toBuffer({resolveWithObject:true})
 let minX=info.width,minY=info.height,maxX=-1,maxY=-1,opaque=0
 for(let y=0;y<info.height;y++)for(let x=0;x<info.width;x++)if(data[(y*info.width+x)*4+3]>50){opaque++;minX=Math.min(minX,x);minY=Math.min(minY,y);maxX=Math.max(maxX,x);maxY=Math.max(maxY,y)}
 if(!opaque||minX<2||minY<2||maxX>info.width-3||maxY>info.height-3)throw Error('Missing transparent clearance: '+item.id)
 measurements[item.id]={aspect:info.width/info.height,bottomGap:Number(((info.height-1-maxY)/info.height).toFixed(4)),bounds:[minX,minY,maxX,maxY]}
 tiles.push({input:await sharp(item.output).resize(240,240).toBuffer(),left:i%3*260+10,top:Math.floor(i/3)*260+10})
}
await fs.mkdir('artifacts',{recursive:true})
for(const [label,background]of [['dark','#17221f'],['light','#fff5df']])await sharp({create:{width:780,height:Math.ceil(manifest.images.length/3)*260,channels:4,background}}).composite(tiles).png().toFile(`artifacts/deep-monsters-${label}.png`)
await sharp('public/exploration/combat-backgrounds/sunken-sandstone.webp').resize(780,Math.ceil(manifest.images.length/3)*260,{fit:'cover'}).composite(tiles).png().toFile('artifacts/deep-monsters-arena.png')
await fs.writeFile('artifacts/deep-monster-grounding.json',JSON.stringify(measurements,null,2)+'\n')
console.log(JSON.stringify(measurements))
