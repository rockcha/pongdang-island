import fs from 'node:fs'
import sharp from 'sharp'
const root='assets/storage-upload/new/20261029-055051'
const review='artifacts/starruins-bluegold-review'
const m=JSON.parse(fs.readFileSync(root+'/manifest.json','utf8'))
const type=process.argv[2]??'thumbnail'
const patches=fs.existsSync(root+'/anchor-patches.json')?JSON.parse(fs.readFileSync(root+'/anchor-patches.json')):{}
fs.mkdirSync(review,{recursive:true})
const items=m.items.filter(s=>fs.existsSync(root+'/'+(type==='thumbnail'?s.thumbnail_path:s.sprite_sheet_path??'missing')))
const layers=[]
for(let i=0;i<items.length;i++){
 const s=items[i],file=root+'/'+(type==='thumbnail'?s.thumbnail_path:s.sprite_sheet_path),meta=await sharp(file).metadata()
 let img=sharp(file)
 if(type!=='thumbnail')img=img.extract({left:0,top:0,width:Math.floor(meta.width/(s.frames===8?4:2)),height:Math.floor(meta.height/2)})
 layers.push({input:await img.resize(270,270,{fit:'contain'}).png().toBuffer(),left:i%4*300+15,top:Math.floor(i/4)*310})
 if(type==='patches'&&patches[s.id]){
  const p=patches[s.id]
  layers.push({input:Buffer.from(`<svg width="270" height="270"><rect x="${p[0]*270}" y="${p[1]*270}" width="${p[2]*270}" height="${p[3]*270}" fill="none" stroke="#ff4444" stroke-width="2"/></svg>`),left:i%4*300+15,top:Math.floor(i/4)*310})
 }
 layers.push({input:Buffer.from(`<svg width="300" height="30"><text x="150" y="20" text-anchor="middle" font-family="Arial" font-size="12" fill="#e6eeff">${s.id}</text></svg>`),left:i%4*300,top:Math.floor(i/4)*310+275})
}
await sharp({create:{width:1200,height:Math.ceil(items.length/4)*310||310,channels:4,background:'#233348'}}).composite(layers).png().toFile(review+'/'+type+'-contact.png')
console.log(JSON.stringify({count:items.length,file:review+'/'+type+'-contact.png'}))
