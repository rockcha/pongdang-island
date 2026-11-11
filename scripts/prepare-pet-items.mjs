import fs from 'node:fs/promises'
import sharp from 'sharp'
import {createHash} from 'node:crypto'
const root=process.argv[2]??'assets/storage-upload/new/20261111-193000'
const manifest=JSON.parse(await fs.readFile(root+'/manifest.json','utf8'))
await fs.mkdir('public/pets/items',{recursive:true})
for(const item of manifest.items){
 const source=await fs.readFile(root+'/'+item.source)
 const output=await sharp(source).resize(384,384,{fit:'contain',background:{r:0,g:0,b:0,alpha:0}}).webp({quality:90,alphaQuality:100}).toBuffer()
 await fs.writeFile(item.output,output)
 item.sourceSha256=createHash('sha256').update(source).digest('hex')
 item.sha256=createHash('sha256').update(output).digest('hex')
 const meta=await sharp(output).metadata();if(!meta.hasAlpha)throw new Error('Transparency missing: '+item.id)
}
await fs.writeFile(root+'/manifest.json',JSON.stringify(manifest,null,2)+'\n')
console.log(`Prepared ${manifest.items.length} transparent pet item assets`)
