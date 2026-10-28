import sharp from 'sharp'
import {createHash} from 'node:crypto'
import {readdir,readFile,writeFile,mkdir} from 'node:fs/promises'
import path from 'node:path'

const profile='rod-shop-q90-320-v1'
const geometry=JSON.parse(await readFile('src/features/fishing/rod-artwork.json','utf8'))
const candidates=new Map()
async function walk(dir){
 for(const entry of await readdir(dir,{withFileTypes:true})){
  const file=path.join(dir,entry.name).replaceAll('\\','/')
  if(entry.isDirectory())await walk(file)
  else {
   const key=file.match(/(equipment\/rods\/[^/]+\/(?:thumbnail|reel-frame|reel-rotor)\.png)$/)?.[1]
   if(key){const files=candidates.get(key)??[];files.push(file);candidates.set(key,files)}
  }
 }
}
await walk('assets/storage-upload')
const hash=bytes=>createHash('sha256').update(bytes).digest('hex')
const items=[],runtime={}
for(const id of Object.keys(geometry).sort()){
 const folder=id==='basic'?'starter':id==='swift'?'swift-v2':id,spec=geometry[id]
 const sources={}
 for(const part of ['thumbnail','reel-frame','reel-rotor']){
  const key=`equipment/rods/${folder}/${part}.png`
  const source=(candidates.get(key)??[]).sort().at(-1)
  if(!source)throw Error('Missing local rod artwork: '+key)
  const bytes=await readFile(source)
  sources[part]={source,sourceHash:hash(bytes),sourceBytes:bytes.length,bytes}
 }
 // Use the same axle geometry as gameplay, with both layers static and uncropped.
 const scale=4,canvas=104*scale,parts=[]
 for(const part of ['frame','rotor']){
  const width=part==='frame'?84:spec.rotorWidth
  const bytes=await sharp(sources['reel-'+part].bytes).resize(Math.round(width*scale),Math.round(width*scale)).png().toBuffer()
  parts.push({input:bytes,left:Math.round((52-width*(part==='rotor'?(spec.rotorX??.5):.5))*scale),top:Math.round((52-width*spec[part])*scale)})
 }
 const reel=await sharp({create:{width:canvas,height:canvas,channels:4,background:'#00000000'}}).composite(parts).png().toBuffer()
 const record={id,sources:Object.fromEntries(Object.entries(sources).map(([part,{bytes,...source}])=>[part,source]))}
 runtime[id]={}
 for(const [part,input] of [['thumbnail',sources.thumbnail.bytes],['reel',reel]]){
  const digest=hash(Buffer.concat([input,Buffer.from(profile)] )).slice(0,24)
  const url=`/game-art/rod-shop/${part}/${digest}-320.webp`
  const output=await sharp(input).resize({width:320,height:320,fit:'inside',withoutEnlargement:true}).webp({quality:90,alphaQuality:100,effort:5}).toBuffer({resolveWithObject:true})
  await mkdir('public'+path.posix.dirname(url),{recursive:true})
  await writeFile('public'+url,output.data)
  record[part]={url,bytes:output.data.length,width:output.info.width,height:output.info.height}
  runtime[id][part]=url
 }
 items.push(record)
}
const summary={count:items.length,sourceBytes:items.reduce((sum,item)=>sum+Object.values(item.sources).reduce((n,s)=>n+s.sourceBytes,0),0),displayBytes:items.reduce((sum,item)=>sum+item.thumbnail.bytes+item.reel.bytes,0)}
await mkdir('assets/optimized-rod-shop',{recursive:true})
await writeFile('assets/optimized-rod-shop/manifest.json',JSON.stringify({profile,summary,items},null,2)+'\n')
await writeFile('src/features/fishing/rod-shop-assets.json',JSON.stringify(runtime,null,2)+'\n')
console.log(summary)
