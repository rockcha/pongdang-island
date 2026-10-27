import {chromium} from 'file:///C:/Users/user/Desktop/holoseogi-counsel/node_modules/playwright-core/index.mjs'
import fs from 'node:fs'
import path from 'node:path'
const root='assets/storage-upload/new/20261027-090400',out=root+'/review'
const m=JSON.parse(fs.readFileSync(root+'/manifest.json','utf8')),known=new Set(m.items.flatMap(i=>[i.thumbnail_path,i.sprite_sheet_path]))
const browser=await chromium.launch({headless:true,executablePath:'C:/Users/user/AppData/Local/ms-playwright/chromium-1243/chrome-win64/chrome.exe'})
try{
 const page=await browser.newPage({viewport:{width:1100,height:1200},deviceScaleFactor:2}),errors=[],missing=[]
 page.on('pageerror',e=>errors.push(e.message));page.on('response',r=>{if(r.status()>=400)missing.push(r.status()+' '+r.url())})
 await page.route('**/storage/v1/object/public/collectibles/**',route=>{
  const key=new URL(route.request().url()).pathname.split('/collectibles/')[1]
  if(!known.has(key))throw Error('Unexpected texture '+key)
  return route.fulfill({path:path.resolve(root,key),contentType:'image/png'})
 })
 await page.goto('http://localhost:5173/artifacts/pirate-refactor-review.html')
 await page.locator('[data-tank-ready]').scrollIntoViewIfNeeded()
 await page.locator('[data-tank-ready="true"]').waitFor({timeout:30000})
 await page.waitForFunction(()=>document.querySelectorAll('[data-previews] canvas').length===9)
 await page.locator('[data-tank]').screenshot({path:out+'/aquarium.png'})
 await page.locator('[data-previews]').scrollIntoViewIfNeeded()
 await page.waitForFunction(()=>[...document.querySelectorAll('[data-previews] [aria-busy]')].every(e=>e.getAttribute('aria-busy')==='false'))
 const samples=[]
 for(let step=0;step<25;step++){
  await page.waitForTimeout(250)
  for(const id of ['plunder-bloodsail','plunder-barca'])await page.locator(`[data-species="${id}"] canvas`).screenshot({path:out+`/${id}-cycle-${step}.png`})
  if(step%4===0)await page.locator('[data-previews]').screenshot({path:out+`/all-poses-${step}.png`})
  samples.push(step)
 }
 await page.evaluate(()=>window.scrollTo(0,0));await page.screenshot({path:out+'/desktop.png',fullPage:true})
 await page.setViewportSize({width:390,height:844});await page.evaluate(()=>window.scrollTo(0,0));await page.waitForTimeout(400)
 await page.screenshot({path:out+'/mobile.png',fullPage:true})
 await page.emulateMedia({reducedMotion:'reduce'});const hand=page.locator('[data-species="plunder-bloodsail"] canvas');await hand.scrollIntoViewIfNeeded();await page.waitForTimeout(400)
 const a=await hand.screenshot();await page.waitForTimeout(600);if(!a.equals(await hand.screenshot()))throw Error('Reduced motion moved')
 if(errors.length||missing.length)throw Error(JSON.stringify({errors,missing}))
 fs.writeFileSync(root+'/preview-verification.json',JSON.stringify({testedAt:new Date().toISOString(),viewports:[1100,390],dpr:2,actualAquariumReady:true,collectionPreviews:9,fullCycleSamples:samples.length,reducedMotionStatic:true,errors,missing,note:'Actual Phaser tank and React collection; local image routing, no remote player writes'},null,2)+'\n')
 console.log('PASS: aquarium ready, nine collection previews, full six-second cycle, desktop/mobile DPR2, reduced motion, no missing assets')
}finally{await browser.close()}
