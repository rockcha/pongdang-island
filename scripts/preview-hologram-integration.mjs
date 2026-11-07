import fs from 'node:fs'
import path from 'node:path'
import {build} from 'vite'
import {batch,items} from './prepare-hologram-assets.mjs'
const output='artifacts/hologram';fs.mkdirSync(output,{recursive:true})
const fish=items.filter(i=>i.frames).map(i=>({...i,size:({common:56,rare:76,epic:110,mythic:165})[i.rarity],speed:Number(i.speed)}))
fs.writeFileSync(`${output}/integration-entry.tsx`,
`import React from 'react';import {createRoot} from 'react-dom/client';
import {createTankRenderer} from '../../src/features/aquarium/phaser-tank';
import {CollectiblePreview} from '../../src/features/collection/collectible-preview';
import {FishingStandby,FishingSea} from '../../src/features/fishing/fishing-environment';
import {RodSkinFloat} from '../../src/features/fishing/rod-skin-art';
const fish=${JSON.stringify(fish)},batch=${JSON.stringify(batch)};
window.reviewErrors=[];window.frames=[];window.tanks=[];
const groups=[fish.filter(i=>i.rarity==='mythic'),fish.filter(i=>i.rarity!=='mythic')];
for(const [n,group] of groups.entries()){
 const parent=document.getElementById('tank'+n);
 const owned=group.map((species,j)=>({id:species.id,species_id:species.id,tank_id:null,animation_seed:j*71,position_x:species.movement_type==='fixed'?.7:null,position_y:species.movement_type==='fixed'?.87:null,acquired_at:new Date().toISOString(),species}));
 const tank=createTankRenderer(parent,owned,false,m=>window.reviewErrors.push(m),undefined,undefined,undefined,undefined,undefined,{columns:1,assetUrl:p=>p.endsWith('_swim8_sprite.png')?'/aquarium/swim/'+p.split('/').pop().replace('_swim8_sprite.png','_swim8_v1_sprite.png'):p.startsWith('/')?p:'/'+batch+'/'+p,onFrame:f=>{window.frames[n]=f}});
 window.tanks.push(tank);new ResizeObserver(()=>tank.resize(parent.clientWidth,parent.clientHeight)).observe(parent);
}
createRoot(document.getElementById('previews')).render(<>{fish.filter(i=>i.rarity==='mythic').map(i=><section key={i.id}><CollectiblePreview species={i}/><p>{i.name}</p></section>)}</>);
createRoot(document.getElementById('scenes')).render(<><div className="fishing-preview"><FishingStandby regionId="hologram"/></div><div className="fishing-preview"><FishingSea regionId="hologram"/><svg viewBox="0 0 400 600" className="absolute inset-0 size-full"><g transform="translate(200 280)"><RodSkinFloat id="hologram"/></g></svg></div></>);
window.reviewState=()=>({errors:window.reviewErrors,stats:window.tanks.map(t=>t.getStats()),frames:window.frames,previews:document.querySelectorAll('#previews canvas[role="img"]').length,busy:document.querySelectorAll('#previews [aria-busy="true"]').length,width:document.documentElement.scrollWidth});
`)
const result=await build({configFile:false,publicDir:false,logLevel:'silent',define:{'process.env.NODE_ENV':'"production"'},esbuild:{jsx:'automatic'},resolve:{alias:{'@':path.resolve('src')}},build:{write:false,minify:true,lib:{entry:`${output}/integration-entry.tsx`,name:'HologramIntegration',formats:['iife']}}})
fs.writeFileSync(`${output}/integration-runtime.js`,(Array.isArray(result)?result[0]:result).output.find(c=>c.type==='chunk').code)
fs.writeFileSync(`${output}/integration.html`,`<!doctype html><html lang="ko"><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>홀로그램 심해도시 · 어항 검수</title><style>body{margin:0;background:#06101e;color:#d5edf3;font:14px sans-serif}h1,p{padding:0 12px}.tank{position:relative;width:100%;height:550px;background:linear-gradient(#06101e88,#06101ecc),center/cover url('/${batch}/fishing/scenery/hologram-v1.png');margin-bottom:16px;overflow:hidden}#previews{display:flex;flex-wrap:wrap;gap:12px}section{width:160px;min-height:210px}.size-40{width:160px;height:160px}.size-full,.h-full{height:100%}.size-full,.w-full{width:100%}.relative{position:relative}.absolute{position:absolute}.inset-0{inset:0}.inset-x-0{left:0;right:0}.bottom-0{bottom:0}.opacity-0{opacity:0}.opacity-100{opacity:1}canvas{max-width:100%}#scenes{display:flex;gap:16px;flex-wrap:wrap}.fishing-preview{position:relative;width:400px;max-width:100%;height:600px;overflow:hidden}@media(max-width:500px){.tank{height:520px}}</style><h1>홀로그램 심해도시</h1><p>실제 어항·도감 렌더러의 유영과 고정 개체 검수</p><div class="tank" id="tank0"></div><div class="tank" id="tank1"></div><div id="previews"></div><h2>낚시터</h2><div id="scenes"></div><script src="integration-runtime.js"></script></html>`)
console.log(`${output}/integration.html`)
