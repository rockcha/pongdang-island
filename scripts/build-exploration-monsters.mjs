import fs from 'node:fs/promises'
import path from 'node:path'
import sharp from 'sharp'

const paths=process.argv.slice(2)
const manifests=await Promise.all((paths.length?paths:['assets/exploration/monsters/manifest.json','assets/exploration/monsters/deep-manifest.json','assets/exploration/shield-gear/manifest.json']).map(async file=>JSON.parse(await fs.readFile(file,'utf8'))))
const images=manifests.flatMap(manifest=>manifest.images).filter(image=>image.output.startsWith('public/exploration/monsters/'))
for(const image of images){
 await fs.mkdir(path.dirname(image.output),{recursive:true})
 await sharp(image.source).resize(768,768,{fit:'contain',background:'#00000000'}).png({compressionLevel:9}).toFile(image.output)
 const metadata=await sharp(image.output).metadata()
 if(metadata.width!==768||metadata.height!==768||!metadata.hasAlpha)throw Error('Invalid monster thumbnail: '+image.id)
}
console.log('Prepared '+images.length+' transparent monster thumbnails.')
