import sharp from 'sharp'
import fs from 'node:fs/promises'
const dir='assets/ui/island-front-v2',files=(await fs.readdir(dir)).filter(f=>f.endsWith('.png')).sort()
const cols=8,cell=150,rows=Math.ceil(files.length/cols),composite=[],report=[]
for(const [i,file] of files.entries()){
 const {data,info}=await sharp(`${dir}/${file}`).ensureAlpha().raw().toBuffer({resolveWithObject:true})
 let transparent=0,semi=0,opaque=0,edge=0
 for(let y=0;y<info.height;y++)for(let x=0;x<info.width;x++){
  const a=data[(y*info.width+x)*4+3];if(a===0)transparent++;else if(a<240)semi++;else opaque++
  if(a>16&&(x===0||y===0||x===info.width-1||y===info.height-1))edge++
 }
 report.push({id:file.slice(0,-4),width:info.width,height:info.height,transparent,semi,opaque,edge,softFraction:+(semi/(semi+opaque)).toFixed(3)})
 const thumb=await sharp(`${dir}/${file}`).resize(132,120,{fit:'contain',background:'#00000000'}).png().toBuffer()
 composite.push({input:thumb,left:(i%cols)*cell+9,top:Math.floor(i/cols)*cell+4})
 const label=Buffer.from(`<svg width="150" height="24"><text x="75" y="16" font-family="Arial" font-size="10" text-anchor="middle" fill="#534334">${file.slice(0,-4)}</text></svg>`)
 composite.push({input:label,left:(i%cols)*cell,top:Math.floor(i/cols)*cell+123})
}
await fs.mkdir('artifacts/previews',{recursive:true})
await sharp({create:{width:cols*cell,height:rows*cell,channels:4,background:'#fff5e6'}}).composite(composite).png().toFile('artifacts/previews/island-front-contact.png')
await fs.writeFile('artifacts/previews/island-front-alpha.json',JSON.stringify(report,null,2)+'\n')
console.log(JSON.stringify({count:files.length,attention:report.filter(r=>!r.id.startsWith('floor-')&&(r.softFraction>.08||r.edge>0))}))
