import fs from 'node:fs'
import path from 'node:path'
import sharp from 'sharp'
import {fileURLToPath} from 'node:url'
import {createHash} from 'node:crypto'
const batch=path.dirname(fileURLToPath(import.meta.url)),file=path.join(batch,'manifest.json'),manifest=JSON.parse(fs.readFileSync(file,'utf8')),normalized=[],art={},partial=process.argv.includes('--partial')
manifest.items=manifest.items.filter(item=>item.id!=='early')
for(const entry of JSON.parse(fs.readFileSync(path.join(batch,'centering-plan.json'),'utf8'))){
 if(entry.id==='early')continue
 let item=manifest.items.find(item=>item.id===entry.id)
 if(!item){item={id:entry.id,frames:1,generatedSource:`sources/${entry.id}-generated.source`,source:`sources/${entry.id}-thumbnail.source`,thumbnail_path:`farm/art/v7/plots/${entry.id}.png`};manifest.items.push(item)}
 item.prompt=entry.prompt;item.referenceImage=entry.reference
}
let left=512,top=512,right=0,bottom=0
for(const item of manifest.items){
 if(!fs.existsSync(path.join(batch,item.generatedSource))){if(!partial)throw Error(`Missing ${item.id}`);art[item.id]=null;continue}
 const bytes=await sharp(path.join(batch,item.generatedSource)).resize(512,512,{fit:'contain',background:{r:0,g:0,b:0,alpha:0}}).png().toBuffer()
 const {data}=await sharp(bytes).ensureAlpha().raw().toBuffer({resolveWithObject:true})
 for(let y=0;y<512;y++)for(let x=0;x<512;x++)if(data[(y*512+x)*4+3]>=32){left=Math.min(left,x);right=Math.max(right,x);top=Math.min(top,y);bottom=Math.max(bottom,y)}
 normalized.push({item,bytes})
}
left=Math.max(0,left-2);top=Math.max(0,top-2);right=Math.min(511,right+2);bottom=Math.min(511,bottom+2)
const crop={left,top,width:right-left+1,height:bottom-top+1}
for(const {item,bytes} of normalized){
 const packed=await sharp(bytes).extract(crop).resize(504,504,{fit:'fill'}).extend({top:4,bottom:4,left:4,right:4,background:{r:0,g:0,b:0,alpha:0}}).png({compressionLevel:9}).toBuffer()
 for(const dest of [path.join(batch,item.source),path.join(batch,item.thumbnail_path),path.join('public',item.thumbnail_path)]){fs.mkdirSync(path.dirname(dest),{recursive:true});fs.writeFileSync(dest,packed)}
 item.sha256=createHash('sha256').update(packed).digest('hex');art[item.id]='/'+item.thumbnail_path
}
manifest.normalization={commonCrop:crop,outputSize:512,padding:4,method:'Normalize generated canvases to 512; use one shared union of visible alpha >=32 with 2px margin; fill 504x504 and add 4px transparent padding. Intentional common vertical fit makes the earth occupy a square game cell. Same crop/fit for all stages; no separate per-stage scaling. Originals preserved.'}
fs.writeFileSync(file,JSON.stringify(manifest,null,2)+'\n')
fs.writeFileSync('src/features/farm/plot-art-assets.ts',`// Generated from assets/storage-upload/new/20261103-231501/manifest.json\nexport const farmPlotViewBox='0 0 512 512'\nexport const farmPlotImages=${JSON.stringify(art,null,2)} as const\n`)
console.log(JSON.stringify({images:manifest.items.length,crop,padding:4}))
