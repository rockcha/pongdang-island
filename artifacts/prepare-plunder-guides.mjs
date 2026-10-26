import fs from 'node:fs'
import sharp from 'sharp'
const root='assets/storage-upload/new/20261027-034411', manifest=JSON.parse(fs.readFileSync(root+'/manifest.json','utf8'))
fs.mkdirSync('artifacts/plunder-guides',{recursive:true})
for(const item of manifest.items.filter(i=>i.frames>1)){
  const columns=item.frames===8?4:2, cell=512, art=await sharp(root+'/'+item.thumbnail_path).resize(348,348,{fit:'contain',background:{r:0,g:0,b:0,alpha:0}}).png().toBuffer()
  await sharp({create:{width:cell*columns,height:cell*2,channels:4,background:{r:0,g:0,b:0,alpha:0}}}).composite(Array.from({length:item.frames},(_,i)=>({input:art,left:i%columns*cell+82,top:Math.floor(i/columns)*cell+82}))).png().toFile('artifacts/plunder-guides/'+item.id+'.png')
  item.layoutGuide='artifacts/plunder-guides/'+item.id+'.png'
}
fs.writeFileSync(root+'/manifest.json',JSON.stringify(manifest,null,2)+'\n')
console.log('Prepared 28 right-facing placement guides with shared scale and padding')
