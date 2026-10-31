import fs from 'node:fs/promises'
import path from 'node:path'
import sharp from 'sharp'
const manifest=JSON.parse(await fs.readFile('assets/exploration/backgrounds/manifest.json','utf8'))
for(const image of manifest.images){
 await fs.mkdir(path.dirname(image.output),{recursive:true})
 await sharp(image.source).resize(1536,1024,{fit:'cover'}).flatten({background:'#15202b'}).png({compressionLevel:9}).toFile(image.output)
 const metadata=await sharp(image.output).metadata()
 if(metadata.width!==1536||metadata.height!==1024)throw Error('Invalid room backdrop: '+image.id)
}
console.log('Prepared '+manifest.images.length+' exploration room backgrounds.')
