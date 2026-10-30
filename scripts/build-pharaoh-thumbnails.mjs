import sharp from 'sharp'
import {readFileSync,writeFileSync,mkdirSync} from 'node:fs'
import {createHash} from 'node:crypto'
import {batch,items} from './prepare-pharaoh-assets.mjs'
const read=p=>JSON.parse(readFileSync(p,'utf8'))
const profile='webp-q88-alpha100-inside-v1',manifestPath='assets/optimized-thumbnails/manifest.json',runtimePath='src/features/collection/thumbnail-assets.json'
const manifest=read(manifestPath),runtime=read(runtimePath),keys=new Set(items.map(i=>i.thumbnail_path))
const records=manifest.items.filter(r=>!keys.has(r.key)),hash=b=>createHash('sha256').update(b).digest('hex')
if(manifest.profile!==profile)throw Error('Unexpected thumbnail export profile')
mkdirSync('public/game-art/thumbnails',{recursive:true})
for(const item of items){
 const key=item.thumbnail_path,source=batch+'/'+key,input=readFileSync(source),metadata=await sharp(input).metadata()
 const record={key,source,sourceHash:hash(input),sourceBytes:input.length,sourceWidth:metadata.width,sourceHeight:metadata.height,small:null,large:null}
 for(const [label,size] of [['small',320],['large',640]]){
  const filename=hash(Buffer.concat([input,Buffer.from(profile+':'+size)])).slice(0,24)+'-'+size+'.webp'
  const result=await sharp(input).resize({width:size,height:size,fit:'inside',withoutEnlargement:true}).webp({quality:88,alphaQuality:100,smartSubsample:true,effort:5}).toBuffer({resolveWithObject:true})
  writeFileSync('public/game-art/thumbnails/'+filename,result.data)
  record[label]={url:'/game-art/thumbnails/'+filename,bytes:result.data.length,width:result.info.width,height:result.info.height}
 }
 records.push(record);runtime[key]={small:record.small.url,large:record.large.url}
}
records.sort((a,b)=>a.key<b.key?-1:a.key>b.key?1:0)
const sourceBytes=records.reduce((s,r)=>s+r.sourceBytes,0),smallBytes=records.reduce((s,r)=>s+r.small.bytes,0),largeBytes=records.reduce((s,r)=>s+r.large.bytes,0)
manifest.items=records;manifest.summary={count:records.length,sourceBytes,smallBytes,largeBytes,smallReductionPercent:Number((100*(1-smallBytes/sourceBytes)).toFixed(2))}
writeFileSync(manifestPath,JSON.stringify(manifest,null,2)+'\n')
writeFileSync(runtimePath,JSON.stringify(Object.fromEntries(Object.entries(runtime).sort(([a],[b])=>a<b?-1:a>b?1:0)),null,2)+'\n')
console.log(JSON.stringify({added:items.length,profile,scope:'Pharaoh thumbnails only; existing optimized records preserved.'}))
