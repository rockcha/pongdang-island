import fs from 'node:fs/promises'
import path from 'node:path'
import sharp from 'sharp'
const manifest=JSON.parse(await fs.readFile('assets/exploration/equipment-manifest.json','utf8'))
for(const item of manifest.images){
 await fs.mkdir(path.dirname(item.output),{recursive:true})
 await sharp(item.source).resize(512,512,{fit:'contain',background:'#00000000'}).png({compressionLevel:9}).toFile(item.output)
 const {width,height,hasAlpha}=await sharp(item.output).metadata()
 if(width!==512||height!==512||!hasAlpha)throw Error('Invalid artwork: '+item.id)
}
console.log('Prepared '+manifest.images.length+' transparent equipment and magic images.')
