import fs from 'node:fs'
import sharp from 'sharp'
const root='assets/storage-upload/new/20261027-090400'
const m=JSON.parse(fs.readFileSync(root+'/manifest.json','utf8'))
fs.mkdirSync(root+'/guides',{recursive:true})
for(const i of m.items){
 const file=root+'/'+i.thumbnail_path;if(!fs.existsSync(file))continue
 const art=await sharp(file).resize(256,256,{fit:'contain',background:{r:0,g:0,b:0,alpha:0}}).png().toBuffer()
 const background={r:0,g:0,b:0,alpha:0},columns=i.columns,cell=512
 await sharp({create:{width:cell*columns,height:cell*2,channels:4,background}}).composite(Array.from({length:i.frames},(_,n)=>({input:art,left:n%columns*cell+128,top:Math.floor(n/columns)*cell+128}))).png().toFile(root+'/guides/'+i.id+'-sprite.png')
 const large=await sharp(file).resize(560,560,{fit:'contain',background}).png().toBuffer()
 await sharp({create:{width:1024,height:1024,channels:4,background}}).composite([{input:large,left:232,top:232}]).png().toFile(root+'/guides/'+i.id+'-thumbnail.png')
}
console.log('Prepared centered placement guides for available thumbnails')
