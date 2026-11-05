import fs from 'node:fs'
import path from 'node:path'
import {pathToFileURL} from 'node:url'
import {build} from 'vite'
import {batch} from './prepare-galaxy-assets.mjs'
import {themes} from './galaxy-scene-specs.mjs'
const url=p=>pathToFileURL(path.resolve(p)).href
const publicRoot=url('public')+'/'
fs.writeFileSync('artifacts/galaxy-scenes-entry.tsx',`
import React from 'react';import {createRoot} from 'react-dom/client';
import {FishingStandby,FishingSea} from '../src/features/fishing/fishing-environment';
import {galaxyArt} from '../src/features/regions/galaxy-art';
for(const k of Object.keys(galaxyArt.fishing))galaxyArt.fishing[k]=${JSON.stringify(publicRoot)}+galaxyArt.fishing[k].slice(1);
createRoot(document.getElementById('standby')).render(<FishingStandby regionId="galaxy"/>);
createRoot(document.getElementById('water')).render(<FishingSea regionId="galaxy"/>);
`)
const result=await build({configFile:false,publicDir:false,logLevel:'silent',define:{'process.env.NODE_ENV':'"production"'},esbuild:{jsx:'automatic'},resolve:{alias:{'@':path.resolve('src')}},build:{write:false,minify:false,lib:{entry:'artifacts/galaxy-scenes-entry.tsx',name:'GalaxyScenePreview',formats:['iife']}}})
fs.writeFileSync('artifacts/galaxy-scenes-runtime.js',(Array.isArray(result)?result[0]:result).output.find(c=>c.type==='chunk').code)
fs.writeFileSync('artifacts/galaxy-scenes.html',`<!doctype html><meta charset="utf-8"><title>은하 낚시터 · 테마 검수</title><style>body{margin:0;background:#090e20;color:#eee;font:14px sans-serif}h1,h2,p{padding:0 12px}.scenes{display:flex;gap:12px;flex-wrap:wrap;padding:12px}.scene{position:relative;width:360px;height:560px;overflow:hidden;border-radius:16px}.absolute{position:absolute}.inset-0{inset:0}.inset-x-0{left:0;right:0}.bottom-0{bottom:0}.h-full{height:100%}.w-full{width:100%}.pointer-events-none{pointer-events:none}.theme{margin:12px}.theme img{width:100%;max-width:960px;display:block;border-radius:12px}@media(max-width:400px){.scene{width:100%}}</style><h1>은하수의 끝자락</h1><p>실제 낚시터 배경 컴포넌트 / 수중 스페셜 테마</p><div class="scenes"><div class="scene" id="standby"></div><div class="scene" id="water"></div></div>${themes.map(t=>`<div class="theme"><h2>${t.name} · ${t.price}골드</h2><img src="${url(batch+'/aquarium-backgrounds/'+t.id+'-panorama-v1.png')}"></div>`).join('')}<script src="galaxy-scenes-runtime.js"></script>`)
console.log('artifacts/galaxy-scenes.html')
