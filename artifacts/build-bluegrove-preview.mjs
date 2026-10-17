import {readFileSync,writeFileSync} from 'node:fs'
import ts from 'typescript'
const root='assets/storage-upload/new/20261017-095349'
const plan=JSON.parse(readFileSync('artifacts/bluegrove-expansion-plan.json','utf8'))
const catalog=JSON.parse(readFileSync('supabase/catalog/catalog.json','utf8'))
const cards=plan.map(s=>({...s,...catalog.collectible_species.find(c=>c.id===s.id)}))
cards.unshift({...catalog.collectible_species.find(c=>c.id==='atlantean-sentinel'),scope:'existing'})
const layouts=readFileSync('src/features/aquarium/bluegrove-frame-layouts.json','utf8')
const shared=['mythic-swim.ts','swim-frame-layout.ts'].map(file=>ts.transpileModule(readFileSync('src/features/aquarium/'+file,'utf8'),{compilerOptions:{target:ts.ScriptTarget.ES2022,module:ts.ModuleKind.ESNext}}).outputText.replace(/^export /gm,'').replace(/^import .*\r?\n/gm,'')).join('\n')
const body=`
let manual=null,flip=false,scope='all';
document.getElementById('auto').onclick=()=>manual=null;
document.getElementById('flip').onclick=()=>flip=!flip;
document.getElementById('frame').oninput=e=>manual=Number(e.target.value);
document.getElementById('scope').onchange=e=>{scope=e.target.value;for(const c of cards)c.element.hidden=scope!=='all'&&scope!==c.spec.scope};
const cards=specs.map(spec=>{const element=document.createElement('section'),title=document.createElement('h2'),caption=document.createElement('p'),canvas=document.createElement('canvas'),image=new Image();title.textContent=spec.name;caption.textContent=(spec.scope==='shared'?'모든 해역':spec.scope==='bluegrove'?'푸른골 전용':'고정 자세 교체')+' · '+spec.rarity;canvas.width=640;canvas.height=440;element.append(title,caption,canvas);document.getElementById('cards').append(element);image.src='../${root}/'+(spec.sprite_sheet_path||spec.thumbnail_path);const enhanced=mythicSwimAsset(spec.sprite_sheet_path||'',spec.rarity);return{spec,element,canvas,image,path:enhanced?.path??spec.sprite_sheet_path,columns:spec.rarity==='mythic'?4:2}});
function tick(ms){for(const c of cards){if(c.element.hidden)continue;const decoration=!c.spec.sprite_sheet_path,f=decoration?0:(manual===null?(mythicSwimFrame(c.path,ms/1000,0)??Math.floor(ms/1000*3)%4):manual%(c.columns*2));const l=decoration?{originX:.5,originY:.5,scale:1}:mythicSwimLayout(c.path,f)??swimFrameLayout(c.path,f),ctx=c.canvas.getContext('2d'),size=Math.min(c.spec.size,180)*l.scale;ctx.setTransform(2,0,0,2,0,0);ctx.clearRect(0,0,320,220);ctx.save();ctx.translate(160,110);ctx.scale(flip?-1:1,1);ctx.globalAlpha=1;if(decoration)ctx.drawImage(c.image,-size/2,-size/2,size,size);else ctx.drawImage(c.image,f%c.columns*c.image.width/c.columns,Math.floor(f/c.columns)*c.image.height/2,c.image.width/c.columns,c.image.height/2,-size*l.originX,-size*l.originY,size,size);ctx.restore()}document.getElementById('phase').textContent=manual===null?'자동 · '+((ms/1000)%6).toFixed(1)+' / 6초':(manual+1)+'/8';requestAnimationFrame(tick)}
Promise.all(cards.map(c=>c.image.decode())).then(()=>{document.getElementById('status').textContent='';requestAnimationFrame(tick)}).catch(()=>document.getElementById('status').textContent='이미지 경로를 확인해주세요.');
`
writeFileSync('artifacts/bluegrove-expansion-preview.js',`const bluegroveLayouts=${layouts},primalLayouts=${readFileSync('src/features/aquarium/primal-frame-layouts.json','utf8')};\n${shared}\nconst specs=${JSON.stringify(cards)};\n${body}`)
for(const p of ['artifacts/mythic-actions-preview.js','artifacts/lunea-turn-preview.js']){
 let s=readFileSync(p,'utf8'),marker=p.includes('mythic-actions')?'let manual=null':'const image=new Image()'
 s=s.slice(s.indexOf(marker));if(p.includes('mythic-actions'))s=s.replace("'Dawn narwhal']","'Dawn narwhal','Seila']")
 const mythic=ts.transpileModule(readFileSync('src/features/aquarium/mythic-swim.ts','utf8'),{compilerOptions:{target:ts.ScriptTarget.ES2022,module:ts.ModuleKind.ESNext}}).outputText.replace(/^export /gm,'')
 writeFileSync(p,mythic+'\n'+s)
}
