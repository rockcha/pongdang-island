import fs from 'node:fs'
import sharp from 'sharp'
import {createHash} from 'node:crypto'
import {batch,art} from './prepare-tower-defense-art.mjs'
import {optimizePng} from './optimize-png-lossless.mjs'
const [id,source]=process.argv.slice(2),a=art.find(a=>a.id===id);if(!a)throw Error('Unknown sheet')
const original=fs.readFileSync(source),hash=b=>createHash('sha256').update(b).digest('hex'),sourcePath=`sources/${id}-${hash(original).slice(0,12)}.source`,meta=await sharp(original).metadata(),rows=id==='enemies'?5:2
if(!meta.hasAlpha)throw Error('Actual transparent sheet required')
fs.copyFileSync(source,`${batch}/${sourcePath}`)
const normalized=await sharp(original).resize(1024,rows*256).png().toBuffer(),bytes=optimizePng(normalized)
if(!(await sharp(bytes).raw().toBuffer()).equals(await sharp(normalized).raw().toBuffer()))throw Error('Lossless mismatch')
const path=`arcade/tower-defense/${a.file}`;fs.writeFileSync(`${batch}/${path}`,bytes);fs.mkdirSync('public/arcade/tower-defense',{recursive:true});fs.writeFileSync('public/'+path,bytes)
for(const [name,color]of [['light','#e4eddd'],['dark','#243e39']])await sharp(bytes).flatten({background:color}).png().toFile(`${batch}/review/${id}-${name}.png`)
const f=`${batch}/manifest.json`,m=JSON.parse(fs.readFileSync(f));if(m.files.some(f=>f.id===id))throw Error('Existing sheet')
m.files.push({id,path,source:sourcePath,sourceSha256:hash(original),sha256:hash(bytes),width:1024,height:rows*256,columns:4,rows,cell:256,tool:'built-in image_gen',review:'pending'});fs.writeFileSync(f,JSON.stringify(m,null,2)+'\n');console.log(id,'recorded')
