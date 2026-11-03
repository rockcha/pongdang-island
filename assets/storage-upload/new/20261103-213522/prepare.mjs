import fs from 'node:fs'
import path from 'node:path'
import sharp from 'sharp'
import {fileURLToPath} from 'node:url'
import {createHash} from 'node:crypto'
const batch=path.dirname(fileURLToPath(import.meta.url)),file=path.join(batch,'manifest.json'),manifest=JSON.parse(fs.readFileSync(file,'utf8')),item=manifest.items[0]
const bytes=await sharp(path.join(batch,item.generatedSource)).resize(512,512,{fit:'contain',background:{r:0,g:0,b:0,alpha:0}}).png({compressionLevel:9}).toBuffer()
for(const dest of [path.join(batch,item.source),path.join(batch,item.thumbnail_path),path.join('public',item.thumbnail_path)]){fs.mkdirSync(path.dirname(dest),{recursive:true});fs.writeFileSync(dest,bytes)}
const {data,info}=await sharp(bytes).ensureAlpha().raw().toBuffer({resolveWithObject:true});let left=512,top=512,right=0,bottom=0
for(let y=0;y<512;y++)for(let x=0;x<512;x++)if(data[(y*512+x)*4+3]>0){left=Math.min(left,x);right=Math.max(right,x);top=Math.min(top,y);bottom=Math.max(bottom,y)}
const pad=12;left=Math.max(0,left-pad);top=Math.max(0,top-pad);right=Math.min(511,right+pad);bottom=Math.min(511,bottom+pad)
item.viewBox=`${left} ${top} ${right-left+1} ${bottom-top+1}`;item.sha256=createHash('sha256').update(bytes).digest('hex');item.normalization='Uniform contain resize to transparent 512px square; runtime viewBox contains all alpha plus 12px padding'
fs.writeFileSync(file,JSON.stringify(manifest,null,2)+'\n')
fs.writeFileSync('src/features/farm/discard-art.ts',`// Generated from assets/storage-upload/new/20261103-213522/manifest.json\nexport const farmDiscardArt=${JSON.stringify({path:'/'+item.thumbnail_path,viewBox:item.viewBox})} as const\n`)
console.log(JSON.stringify({width:info.width,height:info.height,viewBox:item.viewBox}))
