import fs from 'node:fs'
import sharp from 'sharp'
import {createHash} from 'node:crypto'
const batch='assets/storage-upload/new/20261112-174500',[id,source]=process.argv.slice(2),hash=b=>createHash('sha256').update(b).digest('hex')
if(!['crab','swift','armored','healer','boss'].includes(id))throw Error('Unknown enemy')
const data=fs.readFileSync(source),meta=await sharp(data).metadata(),original=`sources/enemy-${id}-${hash(data).slice(0,12)}.source`
if(!meta.hasAlpha||Math.abs(meta.width/meta.height-1)>.01)throw Error('Square transparent sheet required')
fs.copyFileSync(source,`${batch}/${original}`)
// Equal cells, one uniform scale, identical transparent padding; never repair a clipped drawing by cropping it.
const grid=await sharp(data).resize(512,512).png().toBuffer(),cells=[]
for(let frame=0;frame<4;frame++)cells.push({input:await sharp(grid).extract({left:frame%2*256,top:Math.floor(frame/2)*256,width:256,height:256}).resize(224,224).extend({left:16,right:16,top:16,bottom:16,background:{r:0,g:0,b:0,alpha:0}}).png().toBuffer(),left:frame*256,top:0})
const row=await sharp({create:{width:1024,height:256,channels:4,background:{r:0,g:0,b:0,alpha:0}}}).composite(cells).png().toBuffer()
fs.mkdirSync(`${batch}/rows`,{recursive:true});fs.writeFileSync(`${batch}/rows/${id}.png`,row)
await sharp(row).flatten({background:'#e4eddd'}).png().toFile(`${batch}/review/enemy-${id}.png`)
const file=`${batch}/manifest.json`,m=JSON.parse(fs.readFileSync(file));m.enemySources??=[];m.enemySources=m.enemySources.filter(e=>e.id!==id);m.enemySources.push({id,original,sourceSha256:hash(data),row:`rows/${id}.png`,prompt:fs.readFileSync(`${batch}/prompts/enemy-${id}.txt`,'utf8'),tool:'built-in image_gen'});fs.writeFileSync(file,JSON.stringify(m,null,2)+'\n');console.log(id,'row recorded')
