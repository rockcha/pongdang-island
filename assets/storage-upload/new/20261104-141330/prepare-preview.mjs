import fs from 'node:fs/promises'
import sharp from 'sharp'
const root='assets/storage-upload/new/20261104-141330'
const m=JSON.parse(await fs.readFile(`${root}/manifest.json`,'utf8'))
const composites=[]
for(const [row,s] of m.items.entries()){
 const source=`${root}/${s.sprite_sheet_path}`,{width}=await sharp(source).metadata(),cell=width/2
 for(let i=0;i<4;i++){
  const image=await sharp(source).extract({left:i%2*cell,top:Math.floor(i/2)*cell,width:cell,height:cell}).resize(260,260).png().toBuffer()
  composites.push({input:image,left:i*280+10,top:row*280+10})
 }
}
await sharp({create:{width:1120,height:1120,channels:4,background:'#203e46'}}).composite(composites).png().toFile(`${root}/review/frames-dark.png`)
await sharp({create:{width:1120,height:1120,channels:4,background:'#fff4e4'}}).composite(composites).png().toFile(`${root}/review/frames-light.png`)
const cards=m.items.map(s=>`<article><h2>${s.name}</h2><div class="viewport"><div class="sprite" style="--size:${s.size}px;background-image:url('${s.sprite_sheet_path}')"></div></div><p>${s.price.toLocaleString()} 골드</p></article>`).join('')
await fs.writeFile(`${root}/preview.html`,`<!doctype html><html lang="ko"><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>특급 고래 미리보기</title><style>body{margin:24px;background:#203e46;color:#fff4e4;font-family:system-ui}body.light{background:#fff4e4;color:#613e29}button{padding:10px;margin:6px;border:0;border-radius:8px}main{display:flex;flex-wrap:wrap;gap:24px}article{text-align:center;border:1px solid #8888;border-radius:18px;padding:20px;min-width:260px}h2{font-size:18px}.viewport{height:220px;display:grid;place-items:center}.sprite{width:var(--size);height:var(--size);background-size:200% 200%;background-position:0 0;animation:swim 1.2s steps(1) infinite}.flip .sprite{transform:scaleX(-1)}.paused .sprite{animation:none}@keyframes swim{0%{background-position:0 0}25%{background-position:100% 0}50%{background-position:0 100%}75%{background-position:100% 100%}}@media(prefers-reduced-motion:reduce){.sprite{animation:none}}</style><h1>특급 공통종 고래</h1><button onclick="document.body.classList.toggle('light')">밝은 배경 / 어두운 배경</button><button onclick="document.body.classList.toggle('flip')">방향 전환</button><button onclick="document.body.classList.toggle('paused')">정지 / 재생</button><main>${cards}</main></html>`)
await fs.mkdir('tmp/whale-upload/fish/epic',{recursive:true})
for(const s of m.items)for(const key of ['thumbnail_path','sprite_sheet_path'])await fs.copyFile(`${root}/${s[key]}`,`tmp/whale-upload/${s[key]}`)
console.log('Created light/dark frame reviews, playback preview and upload staging.')
