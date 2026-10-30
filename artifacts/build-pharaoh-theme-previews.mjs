import fs from 'node:fs'
import sharp from 'sharp'
import {createHash} from 'node:crypto'
const batch='assets/storage-upload/new/20261030-105924',m=JSON.parse(fs.readFileSync(batch+'/manifest.json','utf8')),file='assets/optimized-background-previews/manifest.json',manifest=JSON.parse(fs.readFileSync(file,'utf8')),runtimeFile='src/features/aquarium/background-preview-assets.json',runtime=JSON.parse(fs.readFileSync(runtimeFile,'utf8')),profile='webp-q90-inside-960-v1',hash=b=>createHash('sha256').update(b).digest('hex')
if(manifest.profile!==profile)throw Error('Wrong preview profile')
for(const f of m.files){
 const source=batch+'/'+f.local_path,input=fs.readFileSync(source),metadata=await sharp(input).metadata(),filename=hash(Buffer.concat([input,Buffer.from(profile)])).slice(0,24)+'-960.webp',result=await sharp(input).resize({width:960,height:960,fit:'inside',withoutEnlargement:true}).webp({quality:90,alphaQuality:100,smartSubsample:true,effort:5}).toBuffer({resolveWithObject:true}),url='/game-art/background-previews/'+filename,preview={url,bytes:result.data.length,width:result.info.width,height:result.info.height}
 fs.writeFileSync('public'+url,result.data);manifest.items=manifest.items.filter(i=>i.key!==f.storage_path);manifest.items.push({key:f.storage_path,source,sourceHash:hash(input),sourceBytes:input.length,sourceWidth:metadata.width,sourceHeight:metadata.height,preview});runtime[f.storage_path]={url,width:preview.width,height:preview.height}
}
const compare=(a,b)=>a<b?-1:a>b?1:0;manifest.items.sort((a,b)=>compare(a.key,b.key));const sourceBytes=manifest.items.reduce((n,r)=>n+r.sourceBytes,0),previewBytes=manifest.items.reduce((n,r)=>n+r.preview.bytes,0);manifest.summary={count:manifest.items.length,sourceBytes,previewBytes,reductionPercent:Number((100*(1-previewBytes/sourceBytes)).toFixed(2))}
fs.writeFileSync(file,JSON.stringify(manifest,null,2)+'\n');fs.writeFileSync(runtimeFile,JSON.stringify(Object.fromEntries(Object.entries(runtime).sort(([a],[b])=>compare(a,b))),null,2)+'\n');console.log('Built two uncropped shop previews')
