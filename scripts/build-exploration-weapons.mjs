import fs from 'node:fs/promises'
import sharp from 'sharp'

const manifest=JSON.parse(await fs.readFile('assets/exploration/weapons/manifest.json','utf8'))
await fs.mkdir('public/exploration/weapons',{recursive:true})
for(const item of manifest.images){
 await sharp(item.source).resize(512,512,{fit:'contain',background:'#00000000'}).png({compressionLevel:9}).toFile(item.output)
 const {width,height,hasAlpha}=await sharp(item.output).metadata()
 if(width!==512||height!==512||!hasAlpha)throw Error(`Invalid weapon artwork: ${item.id}`)
}
console.log(`Prepared ${manifest.images.length} transparent weapon images.`)
