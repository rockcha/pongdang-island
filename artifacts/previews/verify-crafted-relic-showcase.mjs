import {chromium} from 'file:///C:/Users/user/Desktop/holoseogi-counsel/node_modules/playwright-core/index.mjs'
import fs from 'node:fs'
const catalog=JSON.parse(fs.readFileSync('supabase/catalog/catalog.json','utf8'))
const base=catalog.fishing_relics.find(r=>r.id==='eternal-water-clock'),attached=catalog.fishing_relics.find(r=>r.id==='sea-king-summoning-bell')
const species={...base,id:'crafted-preview',kind:'relic',crafted:true,name:base.name+' · '+attached.name,description:base.description+' / '+attached.description,attached:{id:attached.id,name:attached.name,thumbnail_path:attached.thumbnail_path}}
const browser=await chromium.launch({headless:true,executablePath:'C:/Users/user/AppData/Local/ms-playwright/chromium-1243/chrome-win64/chrome.exe'})
try{
 const page=await browser.newPage({viewport:{width:390,height:440}})
 await page.goto('http://127.0.0.1:5173/artifacts/previews/relic-atelier.html')
 const result=await page.evaluate(async species=>{
  const {paintCatchMoment}=await import('/src/features/showcase/moment-art.ts')
  document.body.replaceChildren();const canvas=document.createElement('canvas');document.body.append(canvas)
  canvas.style.cssText='width:390px;height:390px;display:block'
  await paintCatchMoment(canvas,{species,regionName:'유물 세공',caughtAt:'2026-10-29T14:45:00Z'})
  return {width:canvas.width,height:canvas.height}
 },species)
 await page.locator('canvas').screenshot({path:'artifacts/previews/crafted-relic-showcase.png'})
 console.log(JSON.stringify(result))
}finally{await browser.close()}
