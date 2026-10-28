import {readFileSync,writeFileSync,mkdirSync} from 'node:fs'
import {resolve} from 'node:path'
import {pathToFileURL} from 'node:url'
import {createHash} from 'node:crypto'
const species=JSON.parse(readFileSync('supabase/catalog/catalog.json','utf8')).collectible_species.filter(s=>s.native_region_id==='firefly'&&s.kind==='fish').map(s=>({...s,is_native:true,speed:Number(s.speed),swim_y_min:Number(s.swim_y_min),swim_y_max:Number(s.swim_y_max)}))
const root='artifacts/previews/firefly'
mkdirSync(root+'/renderers',{recursive:true})
writeFileSync(root+'/renderers.html',`<!doctype html><html lang="ko"><meta charset="utf-8"><title>요정여울 실제 렌더러 검수</title><style>body{margin:0;padding:20px;background:#e7eddc;color:#253c2d;font:15px system-ui}h1{font-size:22px}#tank{height:520px;width:1100px;max-width:100%;background:linear-gradient(#78b6a3,#285f5b);border-radius:20px;overflow:hidden}#catalog{display:flex;gap:16px;margin-top:16px}.card{width:240px;background:#fff9e9;border-radius:14px;padding:10px;text-align:center}.card>div{margin:auto}.size-40{width:160px;height:160px}.size-full{width:100%;height:100%}.relative{position:relative}.opacity-0{opacity:0}.opacity-100{opacity:1}canvas{display:block}</style><h1>반딧불 요정여울 · 실제 어항 / 도감 렌더러</h1><div id="tank"></div><div id="catalog"></div><script type="module">
import Phaser from 'phaser';import {createElement as h}from'react';import{createRoot}from'react-dom/client';import{createTankRenderer}from'/src/features/aquarium/phaser-tank.ts';import{CollectiblePreview}from'/src/features/collection/collectible-preview.tsx';
const species=${JSON.stringify(species).replaceAll('<','\\u003c')};const history={},sprites=new Map();const old=Phaser.GameObjects.Sprite.prototype.setTexture;Phaser.GameObjects.Sprite.prototype.setTexture=function(...args){const result=old.apply(this,args),id=this.getData?.('collectibleId');if(id?.startsWith('firefly-qa-')){sprites.set(id,this);const value=Number(String(this.frame?.name).replace('swim-',''));if(Number.isFinite(value))(history[id]??=new Set()).add(value)}return result};
const items=species.map((s,i)=>({id:'firefly-qa-'+s.id,species_id:s.id,tank_id:'qa-only',animation_seed:i*10909,position_x:.1+(i%8)*.11,position_y:.18+Math.floor(i/8)*.13,rotation:0,scale:1,flipped:false,position_locked:false,acquired_at:'2026-10-29T00:00:00Z',species:s}));
const qa=window.fireflyQA={errors:[],history,sprites,ready:false};qa.renderer=createTankRenderer(document.querySelector('#tank'),items,false,message=>qa.errors.push(message),undefined,undefined,undefined,undefined,undefined,undefined,ready=>qa.ready=ready);
qa.showcase=()=>qa.renderer.setItems(items.filter(i=>i.species.rarity==='mythic'||i.species.id==='firefly-waterlily-jellyfish'||i.species.id==='firefly-acorn-lantern-hermit').map((i,n)=>({...i,animation_seed:0,position_x:.12+n%3*.3,position_y:n<3?.25:.7,scale:1.1})));
qa.snapshot=()=>[...sprites].filter(([,s])=>s.active&&s.scene).map(([id,s])=>({id,frame:Number(String(s.frame?.name).replace('swim-','')),texture:s.texture.key,origin:[s.originX,s.originY],size:[s.displayWidth,s.displayHeight]}));
createRoot(document.querySelector('#catalog')).render(h('div',{style:{display:'flex',gap:16}},species.filter(s=>s.rarity==='mythic').map(s=>h('div',{className:'card',key:s.id},h(CollectiblePreview,{species:s}),h('p',null,s.name)))));
</script></html>`)
const {chromium}=await import(pathToFileURL(resolve(process.argv[2])).href)
const browser=await chromium.launch({executablePath:`${process.env['ProgramFiles(x86)']}/Microsoft/Edge/Application/msedge.exe`,headless:true})
try{
 const page=await browser.newPage({viewport:{width:1200,height:1100},deviceScaleFactor:1}),errors=[]
 page.on('pageerror',e=>errors.push(e.message))
 await page.goto((process.argv[3]??'http://127.0.0.1:5187')+'/'+root+'/renderers.html')
 await page.waitForFunction(()=>window.fireflyQA?.ready&&window.fireflyQA.renderer.getStats().count===37,{timeout:45000})
 const all=await page.evaluate(()=>window.fireflyQA.renderer.getStats())
 await page.screenshot({path:root+'/renderers/all-37.png',fullPage:true})
 await page.evaluate(()=>window.fireflyQA.showcase())
 await page.waitForFunction(()=>window.fireflyQA.renderer.getStats().count===6)
 await page.waitForTimeout(6500)
 await page.waitForFunction(()=>document.querySelectorAll('#catalog canvas').length===4&&!document.querySelector('#catalog [aria-busy="true"]'))
 const phase=await page.evaluate(()=>window.fireflyQA.renderer.getStats().clock%6)
 await page.waitForTimeout(((4.7-phase+6)%6)*1000)
 await page.screenshot({path:root+'/renderers/mythic-action-and-catalog.png',fullPage:true})
 const animated=await page.evaluate(()=>({stats:window.fireflyQA.renderer.getStats(),errors:window.fireflyQA.errors,frames:window.fireflyQA.snapshot(),history:Object.fromEntries(Object.entries(window.fireflyQA.history).map(([id,values])=>[id,[...values].sort((a,b)=>a-b)]))}))
 for(const s of species.filter(s=>s.rarity==='mythic'))if(![0,1,2,3,4,5,6,7].every(f=>animated.history['firefly-qa-'+s.id]?.includes(f)))throw Error('Missing real tank action frame: '+s.id)
 await page.emulateMedia({reducedMotion:'reduce'});await page.evaluate(()=>window.fireflyQA.renderer.setReduced(true));await page.waitForTimeout(300)
 const reduced=await page.evaluate(()=>window.fireflyQA.snapshot())
 if(reduced.some(s=>s.texture.includes('/mythic/')&&s.frame!==0))throw Error('Reduced motion did not freeze mythics at frame zero')
 const first=await page.locator('#catalog canvas').evaluateAll(nodes=>nodes.map(n=>n.toDataURL()))
 await page.waitForTimeout(300)
 const second=await page.locator('#catalog canvas').evaluateAll(nodes=>nodes.map(n=>n.toDataURL()))
 if(JSON.stringify(first)!==JSON.stringify(second))throw Error('Catalog preview keeps animating under reduced motion')
 if(errors.length||animated.errors.length)throw Error(JSON.stringify({errors,rendererErrors:animated.errors}))
 const hash=s=>createHash('sha256').update(s).digest('hex')
 writeFileSync(root+'/renderers/verification.json',JSON.stringify({verifiedAt:new Date().toISOString(),scope:'Real Phaser tank and real CollectiblePreview with synthetic local specimens only; no player writes.',all,animated,reduced,catalogReducedHashes:first.map(hash)},null,2)+'\n')
 console.log(JSON.stringify({all:all.count,textures:all.textures,renderer:all.renderer,mythicsWithAllEightFrames:4,catalogCanvases:first.length,reducedFrameZero:true,errors:0}))
 await page.evaluate(()=>window.fireflyQA.renderer.destroy())
}finally{await browser.close()}
