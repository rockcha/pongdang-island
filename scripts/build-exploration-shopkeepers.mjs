import {readFile} from 'node:fs/promises'
import sharp from 'sharp'
const manifest=JSON.parse(await readFile('assets/exploration/shopkeepers/manifest.json','utf8'))
for(const image of manifest.images){
 const size=image.kind==='portrait'?[768,768]:[1536,1024]
 await sharp(image.source).resize(...size,{fit:image.kind==='portrait'?'contain':'cover',background:'#00000000'}).png({compressionLevel:9}).toFile(image.output)
}
