import fs from 'node:fs'
import path from 'node:path'
import {pathToFileURL} from 'node:url'
import sharp from 'sharp'
import {build} from 'vite'
const refinement=process.argv.includes('--refinement')
const effects=process.argv.includes('--effects')
const {batch,items}=await import(refinement?'./prepare-hangang-refinement.mjs':'./prepare-hangang-assets.mjs')
const original=refinement?await import('./prepare-hangang-assets.mjs'):null
fs.mkdirSync('artifacts',{recursive:true})
const fish=items.filter(i=>i.frames>1).map(i=>({...i,sourceBatch:batch}))
if(original)fish.push(...original.items.filter(i=>i.frames===8&&!items.some(n=>n.id===i.id)).map(i=>({...i,sourceBatch:original.batch})))
if(effects)fish.splice(0,fish.length,...fish.filter(i=>['hangang-mago-creator','hangang-hunmin-spirit','hangang-ungnyeo-mother','hangang-immortal-turtle-ship'].includes(i.id)))
const sprite=i=>i.sourceBatch+'/'+i.sprite_sheet_path
for(let start=0;!effects&&start<fish.length;start+=4){
 const layers=[]
 for(const [n,i] of fish.slice(start,start+4).entries())layers.push({input:await sharp(sprite(i)).resize(500,500,{fit:'contain',background:'#173744'}).png().toBuffer(),left:n%2*512+6,top:Math.floor(n/2)*512+6})
 await sharp({create:{width:1024,height:1024,channels:4,background:'#173744'}}).composite(layers).png().toFile(`${batch}/review/sprite-sheets-${start}.png`)
}
fs.writeFileSync('artifacts/hangang-preview-entry.ts',"export {mythicSwimAsset,mythicSwimFrame,mythicSwimLayout} from '../src/features/aquarium/mythic-swim';export {swimFrameLayout} from '../src/features/aquarium/swim-frame-layout';export {drawHangangMythicCanvas} from '../src/features/aquarium/hangang-mythic-effects'")
const result=await build({configFile:false,publicDir:false,logLevel:'silent',build:{write:false,minify:false,lib:{entry:'artifacts/hangang-preview-entry.ts',name:'HangangPreview',formats:['iife'],fileName:'hangang-preview-runtime'}}})
fs.writeFileSync('artifacts/hangang-preview-runtime.js',(Array.isArray(result)?result[0]:result).output.find(c=>c.type==='chunk').code)
const file=p=>pathToFileURL(path.resolve(p)).href
const rows=fish.map(i=>({...i,url:file(sprite(i))}))
fs.writeFileSync('artifacts/hangang-preview.html',`<!doctype html><meta charset="utf-8"><title>한강의 불빛나루 검수</title><style>body{margin:0;background:#112e40;color:#fff5dc;font:14px sans-serif}h1,p{margin:12px}.hero{display:flex;gap:8px;height:260px}.hero img{min-width:0;width:50%;object-fit:cover}.grid{display:grid;grid-template-columns:repeat(auto-fit,minmax(170px,1fr));gap:8px;padding:8px}.card{text-align:center;background:#193f53;border-radius:12px;overflow:hidden}canvas{max-width:100%;display:block;margin:auto}button,input{margin:8px}</style><h1>한강의 불빛나루</h1><p>일반 2 · 희귀 2 · 특급 2 지도 / 태극 물결 낚싯대 2,500골드</p><div class="hero"><img src="${file('public/fishing/scenery/hangang-v1.png')}"><img src="${file('public/regions/hangang/map-v1.png')}"></div><button onclick="window.playing=!window.playing">재생 / 일시정지</button><label><input type="checkbox" id="reduce">동작 줄이기</label><div class="grid" id="grid"></div><script src="hangang-preview-runtime.js"></script><script>
const data=${JSON.stringify(rows)},api=HangangPreview,entries=[];window.playing=true;window.previewTime=0;
const ready=Promise.all(data.map(async i=>{const img=new Image();img.src=i.url;await img.decode();const card=document.createElement('div');card.className='card';const canvas=document.createElement('canvas');canvas.width=200;canvas.height=200;card.append(canvas,document.createTextNode(i.name));grid.append(card);entries.push({i,img,canvas});}));
window.renderAt=async function(time,reduced=false){await ready;window.previewTime=time;for(const {i,img,canvas} of entries){const c=canvas.getContext('2d'),asset=api.mythicSwimAsset(i.sprite_sheet_path,i.rarity),p=asset?.path??i.sprite_sheet_path,frame=asset?api.mythicSwimFrame(p,time,0,reduced):reduced?0:[0,1,2,3,2,1][Math.floor(time*3)%6],layout=(asset?api.mythicSwimLayout(p,frame):api.swimFrameLayout(p,frame)),cols=i.frames/2,cell=img.width/cols,size=170*layout.scale,x=100-size*layout.originX,y=100-size*layout.originY;c.clearRect(0,0,200,200);api.drawHangangMythicCanvas(c,i.id,time,0,reduced,x,y,size,'back');c.drawImage(img,frame%cols*cell,Math.floor(frame/cols)*cell,cell,cell,x,y,size,size);api.drawHangangMythicCanvas(c,i.id,time,0,reduced,x,y,size);}return {count:entries.length,width:document.documentElement.scrollWidth,viewport:innerWidth}};
let prev=performance.now();function tick(now){if(window.playing)window.previewTime+=(now-prev)/1000;prev=now;window.renderAt(window.previewTime,reduce.checked);requestAnimationFrame(tick)}ready.then(()=>requestAnimationFrame(tick));
</script>`)
console.log((effects?'Generated focused four-mythic effect review':'Generated all-frame contact sheets and runtime animation review')+': artifacts/hangang-preview.html')
