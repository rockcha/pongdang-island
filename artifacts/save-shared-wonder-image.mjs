import fs from 'node:fs'
import path from 'node:path'
const {root}=JSON.parse(fs.readFileSync('artifacts/shared-wonders-root.json','utf8'))
const [id,type,source,promptFile]=process.argv.slice(2)
if(!['thumbnail','sprite'].includes(type))throw Error('Unknown image type')
const i=JSON.parse(fs.readFileSync(root+'/manifest.json','utf8')).items.find(i=>i.id===id);if(!i)throw Error('Unknown species')
const raw=root+'/sources/'+id+'-'+type+'.source',destination=root+'/'+(type==='thumbnail'?i.thumbnail_path:i.sprite_sheet_path)
if(fs.existsSync(raw))fs.copyFileSync(raw,raw.replace('.source','-previous.source'))
fs.mkdirSync(path.dirname(destination),{recursive:true});fs.copyFileSync(source,raw);fs.copyFileSync(source,destination)
fs.writeFileSync(root+'/generation/'+id+'-'+type+'.json',JSON.stringify({id,type,source,raw,destination,tool:'image_gen',prompt:promptFile?fs.readFileSync(promptFile,'utf8'):i[type+'Prompt'],styleReference:i.styleReference,biologySource:i.biologySource},null,2)+'\n')
console.log('Saved '+id+' '+type)
