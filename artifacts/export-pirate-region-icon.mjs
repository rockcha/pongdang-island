import fs from 'node:fs'
import sharp from 'sharp'
const {root}=JSON.parse(fs.readFileSync('artifacts/pirate-rod-root.json','utf8'))
const m=JSON.parse(fs.readFileSync(root+'/manifest.json','utf8')),i=m.items.find(i=>i.type==='region-icon')
await sharp(root+'/sources/'+i.id+'.source').resize(384,384).png().toFile(i.publicPath)
i.export={width:384,height:384,method:'Uniform resolution optimization; original generated transparent PNG preserved in sources.'}
fs.writeFileSync(root+'/manifest.json',JSON.stringify(m,null,2)+'\n')
console.log(i.publicPath)
