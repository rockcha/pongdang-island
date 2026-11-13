import fs from 'node:fs'
import sharp from 'sharp'
import {createHash} from 'node:crypto'
import {optimizePng} from './optimize-png-lossless.mjs'
const batch='assets/storage-upload/new/20261112-174500',file=`${batch}/manifest.json`,m=JSON.parse(fs.readFileSync(file))
for(const f of m.files.filter(f=>f.id!=='enemies'&&f.transparentPadding!==4)){
 const source=fs.readFileSync(`${batch}/${f.path}`),cells=[]
 for(let i=0;i<8;i++)cells.push({input:await sharp(source).extract({left:i%4*256,top:Math.floor(i/4)*256,width:256,height:256}).resize(248,248).extend({left:4,right:4,top:4,bottom:4,background:{r:0,g:0,b:0,alpha:0}}).png().toBuffer(),left:i%4*256,top:Math.floor(i/4)*256})
 const png=await sharp({create:{width:1024,height:512,channels:4,background:{r:0,g:0,b:0,alpha:0}}}).composite(cells).png().toBuffer(),bytes=optimizePng(png)
 fs.writeFileSync(`${batch}/${f.path}`,bytes);fs.writeFileSync('public/'+f.path,bytes);f.sha256=createHash('sha256').update(bytes).digest('hex');f.transparentPadding=4
 for(const [name,color]of [['light','#e4eddd'],['dark','#243e39']])await sharp(bytes).flatten({background:color}).png().toFile(`${batch}/review/${f.id}-${name}.png`)
}
fs.writeFileSync(file,JSON.stringify(m,null,2)+'\n');console.log('Applied fixed uniform 4px transparent turret cell padding')
