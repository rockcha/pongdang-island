import fs from 'node:fs/promises'
import path from 'node:path'
import sharp from 'sharp'
const manifest=JSON.parse(await fs.readFile('assets/exploration/boss-backgrounds/manifest.json','utf8'))
const selected=new Set(process.argv.slice(2))
for(const image of manifest.images.filter(image=>!selected.size||selected.has(image.id))){
 await fs.mkdir(path.dirname(image.public),{recursive:true})
 await sharp(image.original).resize(1536,1024,{fit:'cover'}).webp({quality:82,effort:6}).toFile(image.public)
 const meta=await sharp(image.public).metadata()
 if(meta.width!==1536||meta.height!==1024)throw Error('Invalid boss arena: '+image.id)
 console.log(image.id)
}
