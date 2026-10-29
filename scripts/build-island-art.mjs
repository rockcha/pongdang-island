import sharp from 'sharp'
import {createHash} from 'node:crypto'
import {readFile, writeFile, mkdir} from 'node:fs/promises'

const dir='assets/ui/island-front-v2'
const manifest=JSON.parse(await readFile(`${dir}/manifest.json`,'utf8'))
const runtime={}
await mkdir('public/game-art/island',{recursive:true})
for(const asset of manifest.assets){
 const size=asset.category==='building'?384:256
 const input=await readFile(`${dir}/${asset.source}`)
 let pipeline=sharp(input)
 if(asset.category!=='floor')pipeline=pipeline.trim({background:'#00000000',threshold:1})
 const {data,info}=await pipeline.resize({width:size,height:size,fit:'inside',withoutEnlargement:true}).png({palette:true,quality:95,effort:10,compressionLevel:9}).toBuffer({resolveWithObject:true})
 const hash=createHash('sha256').update(data).digest('hex').slice(0,24)
 const url=`/game-art/island/${hash}-${size}.png`
 await writeFile(`public${url}`,data)
 runtime[asset.id]=url
 asset.output={url,bytes:data.length,width:info.width,height:info.height}
}
manifest.outputDirectory='public/game-art/island'
manifest.displayMirror=false
await writeFile(`${dir}/manifest.json`,JSON.stringify(manifest,null,2)+'\n')
await writeFile('src/features/my-island/island-png-manifest.json',JSON.stringify(runtime,null,2)+'\n')
console.log({count:manifest.assets.length,bytes:manifest.assets.reduce((sum,a)=>sum+a.output.bytes,0)})
