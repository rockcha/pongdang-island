import sharp from 'sharp'
import {createHash} from 'node:crypto'
import {readdir,readFile,writeFile,mkdir} from 'node:fs/promises'
import path from 'node:path'

const profile='webp-q90-inside-960-v1',out='public/game-art/background-previews'
const catalog=JSON.parse(await readFile('supabase/catalog/catalog.json','utf8'))
const panoramas=JSON.parse(await readFile('src/features/aquarium/theme-panoramas.json','utf8'))
const candidates=new Map()
async function walk(dir){
 for(const entry of await readdir(dir,{withFileTypes:true})){
  const file=path.join(dir,entry.name).replaceAll('\\','/')
  if(entry.isDirectory())await walk(file)
  else if(file.includes('/aquarium-backgrounds/')&&file.endsWith('.png')){
   const files=candidates.get(entry.name)??[];files.push(file);candidates.set(entry.name,files)
  }
 }
}
await walk('assets/storage-upload')
await mkdir(out,{recursive:true})
await mkdir('assets/optimized-background-previews',{recursive:true})
const hash=bytes=>createHash('sha256').update(bytes).digest('hex')
const items=[],runtime={}
for(const key of [...new Set(catalog.aquarium_backgrounds.map(item=>item.image_path))].sort()){
 const panorama=panoramas[key],filename=typeof panorama==='string'?panorama:panorama?.file??key
 const source=panorama?.localPath??(candidates.get(filename)??[]).sort().at(-1)
 if(!source)throw Error('Missing local background source: '+filename)
 const input=await readFile(source),metadata=await sharp(input).metadata()
 const sourceHash=hash(input),filenameHash=hash(Buffer.concat([input,Buffer.from(profile)])).slice(0,24)
 const result=await sharp(input).resize({width:960,height:960,fit:'inside',withoutEnlargement:true}).webp({quality:90,alphaQuality:100,smartSubsample:true,effort:5}).toBuffer({resolveWithObject:true})
 const url='/game-art/background-previews/'+filenameHash+'-960.webp'
 await writeFile('public'+url,result.data)
 const preview={url,bytes:result.data.length,width:result.info.width,height:result.info.height}
 items.push({key,source,sourceHash,sourceBytes:input.length,sourceWidth:metadata.width,sourceHeight:metadata.height,preview})
 runtime[key]={url,width:preview.width,height:preview.height}
}
const sourceBytes=items.reduce((sum,item)=>sum+item.sourceBytes,0),previewBytes=items.reduce((sum,item)=>sum+item.preview.bytes,0)
const summary={count:items.length,sourceBytes,previewBytes,reductionPercent:Number((100*(1-previewBytes/sourceBytes)).toFixed(2))}
await writeFile('assets/optimized-background-previews/manifest.json',JSON.stringify({profile,summary,items},null,2)+'\n')
await writeFile('src/features/aquarium/background-preview-assets.json',JSON.stringify(runtime,null,2)+'\n')
console.log(summary)
