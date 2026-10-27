import fs from 'node:fs'
const {root}=JSON.parse(fs.readFileSync('artifacts/pirate-rod-root.json','utf8'))
const [id,source]=process.argv.slice(2),m=JSON.parse(fs.readFileSync(root+'/manifest.json','utf8')),i=m.items.find(i=>i.id===id)
if(!i)throw Error('Unknown asset')
fs.mkdirSync(root+'/'+i.path.split('/').slice(0,-1).join('/'),{recursive:true})
fs.copyFileSync(source,root+'/'+i.path);fs.copyFileSync(source,root+'/sources/'+id+'.source')
fs.writeFileSync(root+'/generation/'+id+'.json',JSON.stringify({id,tool:'built-in image_gen',source,raw:'sources/'+id+'.source',destination:i.path,prompt:i.prompt,inputReferences:i.references},null,2)+'\n')
console.log('Saved '+id)
