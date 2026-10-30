import fs from 'node:fs'
import path from 'node:path'
import {createHash} from 'node:crypto'
import {batch,items} from './prepare-pharaoh-assets.mjs'
const r=JSON.parse(Buffer.from(process.argv[2],'base64').toString('utf8'))
const dest=path.resolve(r.target),roots=[path.resolve(batch)+path.sep,path.resolve('public')+path.sep]
if(!roots.some(root=>dest.startsWith(root)))throw Error('Invalid asset target')
fs.mkdirSync(path.dirname(dest),{recursive:true});fs.copyFileSync(r.source,dest)
const original=`assets/generated/pharaoh-20261030/${r.id}.png`
fs.mkdirSync(path.dirname(original),{recursive:true});fs.copyFileSync(r.source,original)
const m=JSON.parse(fs.readFileSync(batch+'/manifest.json','utf8'))
m.items=items
const replaced=m.assets.filter(a=>a.target===r.target&&a.id!==r.id)
if(replaced.length)m.superseded_assets=[...(m.superseded_assets??[]),...replaced.map(a=>({...a,status:'rejected-before-upload'}))]
m.assets=m.assets.filter(a=>a.id!==r.id&&a.target!==r.target)
m.assets.push({...r,original,tool:'built-in image_gen',generated_at:new Date().toISOString(),sha256:createHash('sha256').update(fs.readFileSync(dest)).digest('hex')})
fs.writeFileSync(batch+'/manifest.json',JSON.stringify(m,null,2)+'\n')
console.log(r.id+' saved ('+m.assets.length+')')
