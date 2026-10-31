import fs from 'node:fs/promises'
import path from 'node:path'
import sharp from 'sharp'

const manifest=JSON.parse(await fs.readFile('assets/exploration/monsters/manifest.json','utf8'))
for(const image of manifest.images){
 await fs.mkdir(path.dirname(image.output),{recursive:true})
 await sharp(image.source).resize(768,768,{fit:'contain',background:'#00000000'}).png({compressionLevel:9}).toFile(image.output)
 const metadata=await sharp(image.output).metadata()
 if(metadata.width!==768||metadata.height!==768||!metadata.hasAlpha)throw Error('Invalid monster thumbnail: '+image.id)
}
console.log('Prepared '+manifest.images.length+' transparent monster thumbnails.')
