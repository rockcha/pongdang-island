import {copyFileSync,mkdirSync,readFileSync,writeFileSync} from 'node:fs'
import {dirname,resolve} from 'node:path'
import {batch,items} from './prepare-firefly-assets.mjs'
const receipt=JSON.parse(Buffer.from(process.argv[2],'base64').toString('utf8'))
const manifest=JSON.parse(readFileSync(batch+'/manifest.json','utf8'))
manifest.items=items
for(const asset of [...manifest.assets,...(manifest.superseded_assets??[])]){
 asset.original=`artifacts/previews/firefly/originals/${asset.id}.png`
 if(asset.source&&/^[A-Za-z]:/.test(asset.source)){asset.generation_file=asset.source.split(/[\\/]/).at(-1);asset.source=asset.original}
}
const target=resolve(receipt.target)
if(!target.startsWith(resolve(batch)+'/')&&!target.startsWith(resolve(batch)+'\\')&&!target.startsWith(resolve('public')+'/')&&!target.startsWith(resolve('public')+'\\'))throw Error('Image destination outside asset roots')
mkdirSync(dirname(target),{recursive:true})
copyFileSync(receipt.source,target)
const original=resolve('artifacts/previews/firefly/originals',receipt.id+'.png')
mkdirSync(dirname(original),{recursive:true})
copyFileSync(receipt.source,original)
const superseded=manifest.assets.filter(a=>a.target===receipt.target&&a.id!==receipt.id)
if(superseded.length)manifest.superseded_assets=[...(manifest.superseded_assets??[]),...superseded.map(a=>({...a,status:'superseded-before-release'}))]
manifest.assets=manifest.assets.filter(a=>a.id!==receipt.id&&a.target!==receipt.target)
manifest.assets.push({...receipt,source:`artifacts/previews/firefly/originals/${receipt.id}.png`,generation_file:receipt.source.split(/[\\/]/).at(-1),original:`artifacts/previews/firefly/originals/${receipt.id}.png`,tool:'image_gen.imagegen',generated_at:new Date().toISOString()})
writeFileSync(batch+'/manifest.json',JSON.stringify(manifest,null,2)+'\n')
console.log(JSON.stringify({id:receipt.id,target:receipt.target,count:manifest.assets.length}))
