import {readFile,writeFile} from 'node:fs/promises'
import sharp from 'sharp'
const specs=JSON.parse((await readFile('assets/exploration/rooms/generation-specs.json','utf8')).replace(/^\uFEFF/,''))
const images=[]
for(const spec of specs){
 const source=`assets/exploration/rooms/originals/${spec.id}.png`,output=`public/exploration/rooms/${spec.id}.${spec.kind==='portrait'?'png':'webp'}`
 const pipeline=sharp(source).resize(spec.kind==='portrait'?768:1536,spec.kind==='portrait'?768:1024,{fit:spec.kind==='portrait'?'contain':'cover',background:'#00000000'})
 if(spec.kind==='portrait')await pipeline.png({compressionLevel:9}).toFile(output);else await pipeline.webp({quality:88}).toFile(output)
 images.push({...spec,source,output})
}
await writeFile('assets/exploration/rooms/manifest.json',JSON.stringify({generator:'built-in image_gen',purpose:'Local exploration event rooms and characters; not aquarium collectibles.',images},null,2)+'\n')
