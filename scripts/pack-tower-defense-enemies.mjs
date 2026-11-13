import fs from 'node:fs'
import sharp from 'sharp'
import {createHash} from 'node:crypto'
import {optimizePng} from './optimize-png-lossless.mjs'
const batch='assets/storage-upload/new/20261112-174500',ids=['crab','swift','armored','healer','boss'],path='arcade/tower-defense/enemies-v1.png',hash=b=>createHash('sha256').update(b).digest('hex')
const data=await sharp({create:{width:1024,height:1280,channels:4,background:{r:0,g:0,b:0,alpha:0}}}).composite(ids.map((id,i)=>({input:`${batch}/rows/${id}.png`,left:0,top:i*256}))).png().toBuffer(),bytes=optimizePng(data)
fs.writeFileSync(`${batch}/${path}`,bytes);fs.writeFileSync('public/'+path,bytes)
for(const [name,color]of [['light','#e4eddd'],['dark','#243e39']])await sharp(bytes).flatten({background:color}).png().toFile(`${batch}/review/enemies-${name}.png`)
const file=`${batch}/manifest.json`,m=JSON.parse(fs.readFileSync(file));m.rejected??=[];m.rejected.push({...m.files.find(f=>f.id==='enemies'),reason:'Initial multi-row generation was not aligned to equal cells; rejected before release.'});m.files=m.files.filter(f=>f.id!=='enemies');m.files.push({id:'enemies',path,sha256:hash(bytes),width:1024,height:1280,columns:4,rows:5,cell:256,tool:'built-in image_gen',processing:'Five independently generated 2x2 sheets, equal cell extraction, fixed uniform scale and padding, four poses packed per row',sources:m.enemySources,review:'pending'});fs.writeFileSync(file,JSON.stringify(m,null,2)+'\n');console.log('Packed five reviewed species into uniform 4x5 atlas')
