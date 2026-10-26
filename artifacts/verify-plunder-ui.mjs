import {chromium} from 'file:///C:/Users/user/Desktop/holoseogi-counsel/node_modules/playwright-core/index.mjs'
import fs from 'node:fs'
import path from 'node:path'
const root='assets/storage-upload/new/20261027-034411',out='artifacts/plunder-previews'
const browser=await chromium.launch({headless:true,executablePath:'C:/Users/user/AppData/Local/ms-playwright/chromium-1243/chrome-win64/chrome.exe'})
try{
 const page=await browser.newPage({viewport:{width:1100,height:1000},deviceScaleFactor:2})
 const errors=[],missing=[]
 page.on('pageerror',e=>errors.push(e.message));page.on('response',r=>{if(r.status()>=400)missing.push(r.status()+' '+r.url())})
 await page.route('**/storage/v1/object/public/collectibles/**',route=>route.fulfill({path:path.resolve(root,new URL(route.request().url()).pathname.split('/collectibles/')[1]),contentType:'image/png'}))
 await page.goto('http://localhost:5173/artifacts/plunder-review.html')
 await page.waitForFunction(()=>document.querySelectorAll('canvas').length>=4)
 await page.locator('[data-tank-ready]').scrollIntoViewIfNeeded()
 await page.locator('[data-tank-ready="true"]').waitFor({timeout:30000}).catch(async e=>{
  await page.screenshot({path:out+'/tank-failure.png',fullPage:true})
  console.log(JSON.stringify({errors,missing,text:await page.locator('body').innerText()}));throw e
 })
 await page.waitForFunction(()=>[...document.querySelectorAll('img')].every(i=>i.complete&&i.naturalWidth>0))
 await page.waitForTimeout(1800)
 await page.screenshot({path:out+'/desktop.png',fullPage:true})
 await page.locator('[data-tank-ready]').screenshot({path:out+'/aquarium.png'})
 // Keep all three collection previews visible for the entire six-second action loop.
 await page.locator('canvas').last().scrollIntoViewIfNeeded()
 for(let frame=0;frame<25;frame++){
  await page.waitForTimeout(250)
  for(let i=1;i<4;i++)await page.locator('canvas').nth(i).screenshot({path:out+`/mythic-${i}-${frame}.png`})
 }
 await page.setViewportSize({width:390,height:844});await page.evaluate(()=>window.scrollTo(0,0));await page.waitForTimeout(600)
 await page.screenshot({path:out+'/mobile.png',fullPage:true})
 await page.emulateMedia({reducedMotion:'reduce'});await page.locator('canvas').last().scrollIntoViewIfNeeded();await page.waitForTimeout(300)
 const canvas=page.locator('canvas').last(),a=await canvas.screenshot();await page.waitForTimeout(500);const b=await canvas.screenshot()
 if(!a.equals(b))throw Error('Reduced motion still animates')
 if(errors.length||missing.length)throw Error(JSON.stringify({errors,missing}))
 fs.writeFileSync(root+'/preview-verification.json',JSON.stringify({testedAt:new Date().toISOString(),viewports:[1100,390],dpr:2,fullCycleFrames:25,reducedMotionStatic:true,errors,missing,note:'Actual Phaser aquarium and React collection previews; local image routing; no player writes'},null,2)+'\n')
 console.log('PASS: actual aquarium + 3 collection previews; six-second loop, mobile, reduced motion; no missing assets or browser errors')
}finally{await browser.close()}
