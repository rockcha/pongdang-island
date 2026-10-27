import fs from 'node:fs'
import path from 'node:path'
const root='assets/storage-upload/new/20261027-090400'
const [id,type,source,promptFile]=process.argv.slice(2)
if(!['thumbnail','sprite'].includes(type))throw Error('Unknown image type')
const item=JSON.parse(fs.readFileSync(root+'/manifest.json','utf8')).items.find(i=>i.id===id)
if(!item)throw Error('Unknown species')
const destination=root+'/'+(type==='thumbnail'?item.thumbnail_path:item.sprite_sheet_path)
const raw=root+'/sources/'+id+'-'+type+'.source'
if(fs.existsSync(raw))fs.copyFileSync(raw,raw.replace('.source','-previous.source'))
fs.mkdirSync(path.dirname(destination),{recursive:true});fs.copyFileSync(source,destination);fs.copyFileSync(source,raw)
fs.mkdirSync(root+'/generation',{recursive:true})
fs.writeFileSync(root+'/generation/'+id+'-'+type+'.json',JSON.stringify({id,type,source,destination,raw,tool:'image_gen',prompt:promptFile?fs.readFileSync(promptFile,'utf8'):type==='thumbnail'?item.thumbnailPrompt:item.spritePrompt},null,2)+'\n')
console.log('Saved '+id+' '+type)
