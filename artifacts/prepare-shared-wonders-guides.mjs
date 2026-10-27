import fs from 'node:fs'
import sharp from 'sharp'
const {root}=JSON.parse(fs.readFileSync('artifacts/shared-wonders-root.json','utf8'))
const m=JSON.parse(fs.readFileSync(root+'/manifest.json','utf8')),bg={r:0,g:0,b:0,alpha:0}
for(const i of m.items){
 const file=root+'/'+i.thumbnail_path;if(!fs.existsSync(file))continue
 // Trim only the temporary placement guide, never the source or animation poses.
 const art=await sharp(file).trim({threshold:8}).resize(256,256,{fit:'contain',background:bg}).png().toBuffer()
 await sharp({create:{width:512*i.columns,height:1024,channels:4,background:bg}}).composite(Array.from({length:i.frames},(_,n)=>({input:art,left:n%i.columns*512+128,top:Math.floor(n/i.columns)*512+128}))).png().toFile(root+'/guides/'+i.id+'-sprite.png')
 const one=await sharp(file).resize(560,560,{fit:'contain',background:bg}).png().toBuffer()
 await sharp({create:{width:1024,height:1024,channels:4,background:bg}}).composite([{input:one,left:232,top:232}]).png().toFile(root+'/guides/'+i.id+'-thumbnail.png')
}
console.log('Prepared fixed-size placement guides for available subjects')
