import sharp from 'sharp'
import {readFileSync,writeFileSync,mkdirSync,existsSync} from 'node:fs'
import {batch,items} from './prepare-firefly-assets.mjs'

const manifest=JSON.parse(readFileSync(batch+'/manifest.json','utf8'))
const audit=[]
for(const asset of manifest.assets){
 if(!existsSync(asset.target))throw Error('Missing generated asset: '+asset.target)
 const input=asset.id.endsWith('-sprite')?asset.original:asset.target
 const {data,info}=await sharp(input).ensureAlpha().raw().toBuffer({resolveWithObject:true})
 const columns=asset.id.endsWith('-sprite')?(asset.id.includes('swim8')?4:2):1,rows=columns===1?1:2
 const cw=Math.floor(info.width/columns),ch=Math.floor(info.height/rows),frames=[]
 for(let f=0;f<columns*rows;f++){
  let left=cw,top=ch,right=-1,bottom=-1,opaque=0,edgeAlpha=0
  for(let y=0;y<ch;y++)for(let x=0;x<cw;x++){
   const a=data[((y+Math.floor(f/columns)*ch)*info.width+x+(f%columns)*cw)*4+3]
   if(x===0||y===0||x===cw-1||y===ch-1)edgeAlpha=Math.max(edgeAlpha,a)
   if(a<32)continue
   left=Math.min(left,x);top=Math.min(top,y);right=Math.max(right,x);bottom=Math.max(bottom,y);opaque++
  }
  frames.push({frame:f,left,top,width:right-left+1,height:bottom-top+1,margin:Math.min(left,top,cw-right-1,ch-bottom-1),opaque,edgeAlpha})
 }
 audit.push({id:asset.id,file:asset.target,width:info.width,height:info.height,columns,cellWidth:cw,cellHeight:ch,frames})
}
mkdirSync('artifacts/previews/firefly',{recursive:true})
writeFileSync(batch+'/image-audit.json',JSON.stringify({scope:'Local generated files only. Bounds are not proof of visual quality or remote upload.',assets:audit},null,2)+'\n')
for(const rarity of ['common','rare','epic','mythic']){
 const group=items.filter(i=>i.rarity===rarity&&existsSync(batch+'/'+i.thumbnail_path))
 if(!group.length)continue
 const cell=200,cols=5,rows=Math.ceil(group.length/cols),layers=[]
 for(let n=0;n<group.length;n++){
  const input=await sharp(batch+'/'+group[n].thumbnail_path).resize(180,170,{fit:'inside'}).png().toBuffer({resolveWithObject:true})
  layers.push({input:input.data,left:n%cols*cell+Math.floor((cell-input.info.width)/2),top:Math.floor(n/cols)*cell+Math.floor((176-input.info.height)/2)})
  const label=Buffer.from(`<svg width="200" height="24"><text x="100" y="17" font-size="12" text-anchor="middle" fill="#263a2a">${group[n].name}</text></svg>`)
  layers.push({input:label,left:n%cols*cell,top:Math.floor(n/cols)*cell+176})
 }
 await sharp({create:{width:cols*cell,height:rows*cell,channels:4,background:'#eceddb'}}).composite(layers).png().toFile(`artifacts/previews/firefly/${rarity}-contact.png`)
}
console.log(JSON.stringify({generated:manifest.assets.length,thumbnails:items.filter(i=>existsSync(batch+'/'+i.thumbnail_path)).length,sprites:items.filter(i=>i.sprite_sheet_path&&existsSync(batch+'/'+i.sprite_sheet_path)).length,edgeWarnings:audit.filter(a=>a.frames.some(f=>f.edgeAlpha>32)).map(a=>a.id)}))
