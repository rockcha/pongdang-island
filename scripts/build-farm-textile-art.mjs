import sharp from 'sharp'
import {readFileSync,writeFileSync,existsSync,copyFileSync,mkdirSync} from 'node:fs'
import {dirname,resolve} from 'node:path'
import {createHash} from 'node:crypto'

const manifestPath='assets/ui/farm-textiles-v1/manifest.json',manifest=JSON.parse(readFileSync(manifestPath,'utf8'))
for(const entry of manifest.entries){
 const original=resolve(dirname(manifestPath),entry.original)
 if(!existsSync(original))copyFileSync(entry.source,original)
 const building=entry.id==='textileMill'||entry.id==='sewingWorkshop',crop=entry.id==='cotton-ready',size=building||crop?512:256,padding=building||crop?16:12
 const source=sharp(original),metadata=await source.metadata()
 if(!metadata.hasAlpha)throw Error('Expected generated alpha: '+entry.id)
 const {data,info}=await source.trim().resize(size-padding*2,size-padding*2,{fit:'inside',withoutEnlargement:true}).png().toBuffer({resolveWithObject:true})
 const left=Math.floor((size-info.width)/2),top=building||crop?size-padding-info.height:Math.floor((size-info.height)/2)
 mkdirSync(dirname(entry.output),{recursive:true})
 await sharp(data).extend({left,right:size-info.width-left,top,bottom:size-info.height-top,background:{r:0,g:0,b:0,alpha:0}}).png({compressionLevel:9,effort:10}).toFile(entry.output)
 entry.sha256=createHash('sha256').update(readFileSync(entry.output)).digest('hex');entry.width=size;entry.height=size
}
writeFileSync(manifestPath,JSON.stringify(manifest,null,2)+'\n')
console.log(`Prepared ${manifest.entries.length} farm textile images`)
