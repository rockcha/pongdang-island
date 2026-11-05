import sharp from 'sharp'
import {readFileSync,writeFileSync,mkdirSync} from 'node:fs'
import {createHash} from 'node:crypto'
import {batch} from './prepare-galaxy-assets.mjs'
import {themes} from './galaxy-scene-specs.mjs'
const manifestPath='assets/optimized-background-previews/manifest.json',runtimePath='src/features/aquarium/background-preview-assets.json'
const manifest=JSON.parse(readFileSync(manifestPath,'utf8')),runtime=JSON.parse(readFileSync(runtimePath,'utf8')),profile='webp-q90-inside-960-v1'
if(manifest.profile!==profile)throw Error('Unexpected background preview profile')
const keys=new Set(themes.map(t=>t.id+'-panorama-v1.png')),records=manifest.items.filter(r=>!keys.has(r.key)),hash=b=>createHash('sha256').update(b).digest('hex')
mkdirSync('public/game-art/background-previews',{recursive:true})
for(const key of keys){
 const source=batch+'/aquarium-backgrounds/'+key,input=readFileSync(source),metadata=await sharp(input).metadata()
 const result=await sharp(input).resize({width:960,height:960,fit:'inside',withoutEnlargement:true}).webp({quality:90,alphaQuality:100,smartSubsample:true,effort:5}).toBuffer({resolveWithObject:true})
 const url='/game-art/background-previews/'+hash(Buffer.concat([input,Buffer.from(profile)])).slice(0,24)+'-960.webp'
 writeFileSync('public'+url,result.data)
 const preview={url,bytes:result.data.length,width:result.info.width,height:result.info.height}
 records.push({key,source,sourceHash:hash(input),sourceBytes:input.length,sourceWidth:metadata.width,sourceHeight:metadata.height,preview})
 runtime[key]={url,width:preview.width,height:preview.height}
}
records.sort((a,b)=>a.key<b.key?-1:a.key>b.key?1:0)
const sourceBytes=records.reduce((s,r)=>s+r.sourceBytes,0),previewBytes=records.reduce((s,r)=>s+r.preview.bytes,0)
manifest.items=records;manifest.summary={count:records.length,sourceBytes,previewBytes,reductionPercent:Number((100*(1-previewBytes/sourceBytes)).toFixed(2))}
writeFileSync(manifestPath,JSON.stringify(manifest,null,2)+'\n')
writeFileSync(runtimePath,JSON.stringify(Object.fromEntries(Object.entries(runtime).sort(([a],[b])=>a<b?-1:a>b?1:0)),null,2)+'\n')
console.log('Built three galaxy theme previews; existing preview records preserved')
