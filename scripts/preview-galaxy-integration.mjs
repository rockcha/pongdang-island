import fs from 'node:fs'
import path from 'node:path'
import {build} from 'vite'
import {items,batch} from './prepare-galaxy-assets.mjs'
const fish=items.filter(i=>i.frames>1).map(i=>({...i,size:({common:56,rare:76,epic:110,mythic:165})[i.rarity],speed:i.movement_type==='fixed'?0:i.movement_type==='crawl'?.012:i.movement_type==='pulse'?.014:.024}))
fs.writeFileSync('artifacts/galaxy-integration-entry.tsx',`
import React from 'react';import {createRoot} from 'react-dom/client';
import {createTankRenderer} from '../src/features/aquarium/phaser-tank';
import {CollectiblePreview} from '../src/features/collection/collectible-preview';
const fish=${JSON.stringify(fish)},batch=${JSON.stringify(batch)};
window.reviewErrors=[];window.frames=[];window.tanks=[];
const groups=[fish.filter(i=>i.rarity==='mythic'),fish.filter(i=>i.rarity!=='mythic')];
for(const [n,group] of groups.entries()){
 const parent=document.getElementById('tank'+n);
 const owned=group.map((species,j)=>({id:species.id,species_id:species.id,tank_id:null,animation_seed:j*71,position_x:species.movement_type==='fixed'?(j===5?.2:.7):null,position_y:species.movement_type==='fixed'?.85:null,acquired_at:new Date().toISOString(),species}));
 const tank=createTankRenderer(parent,owned,false,m=>window.reviewErrors.push(m),undefined,undefined,undefined,undefined,undefined,{columns:1,assetUrl:p=>p.endsWith('_swim8_sprite.png')?'/aquarium/swim/'+p.split('/').pop().replace('_swim8_sprite.png','_swim8_v1_sprite.png'):p.startsWith('/')?p:'/'+batch+'/'+p,onFrame:f=>{window.frames[n]=f}});
 window.tanks.push(tank);new ResizeObserver(()=>tank.resize(parent.clientWidth,parent.clientHeight)).observe(parent);
}
createRoot(document.getElementById('previews')).render(<>{fish.filter(i=>i.rarity==='mythic').map(i=><section key={i.id}><CollectiblePreview species={i}/><p>{i.name}</p></section>)}</>);
window.reviewState=()=>({errors:window.reviewErrors,stats:window.tanks.map(t=>t.getStats()),frames:window.frames,previews:document.querySelectorAll('#previews canvas[role="img"]').length,busy:document.querySelectorAll('#previews [aria-busy="true"]').length,width:document.documentElement.scrollWidth});
`)
const result=await build({configFile:false,publicDir:false,logLevel:'silent',define:{'process.env.NODE_ENV':'"production"'},esbuild:{jsx:'automatic'},resolve:{alias:{'@':path.resolve('src')}},build:{write:false,minify:true,lib:{entry:'artifacts/galaxy-integration-entry.tsx',name:'GalaxyIntegration',formats:['iife']}}})
fs.writeFileSync('artifacts/galaxy-integration-runtime.js',(Array.isArray(result)?result[0]:result).output.find(c=>c.type==='chunk').code)
fs.writeFileSync('artifacts/galaxy-integration.html',`<!doctype html><meta charset="utf-8"><title>은하 어항 · 도감 검수</title><style>body{margin:0;background:#090e20;color:#eee;font:14px sans-serif}h1,p{padding:0 12px}.tank{position:relative;width:100%;height:550px;background:center/cover url('/${batch}/aquarium-backgrounds/galaxy-space-station-panorama-v1.png');margin-bottom:16px;overflow:hidden}#previews{display:flex;flex-wrap:wrap;gap:12px}section{width:160px;min-height:210px}.size-40{width:160px;height:160px}.size-full{width:100%;height:100%}.relative{position:relative}.opacity-0{opacity:0}.opacity-100{opacity:1}canvas{max-width:100%}</style><h1>실제 어항 / 도감 컴포넌트</h1><p>신화 7종 · 기본 이동 35종</p><div class="tank" id="tank0"></div><div class="tank" id="tank1"></div><div id="previews"></div><script src="galaxy-integration-runtime.js"></script>`)
console.log('artifacts/galaxy-integration.html')
