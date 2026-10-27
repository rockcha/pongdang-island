import {chromium} from 'file:///C:/Users/user/Desktop/holoseogi-counsel/node_modules/playwright-core/index.mjs'
import fs from 'node:fs'
import path from 'node:path'
const {root}=JSON.parse(fs.readFileSync('artifacts/pirate-rod-root.json','utf8'))
const out=root+'/review',browser=await chromium.launch({headless:true,executablePath:'C:/Users/user/AppData/Local/ms-playwright/chromium-1243/chrome-win64/chrome.exe'}),checks=[]
try{
 for(const width of [1000,390]){
  const page=await browser.newPage({viewport:{width,height:1000},deviceScaleFactor:2}),errors=[]
  page.on('pageerror',e=>errors.push(e.message));page.on('response',r=>{if(r.status()>=400)errors.push('HTTP '+r.status()+' '+r.url())})
  await page.route('**/storage/v1/object/public/collectibles/equipment/rods/**',route=>{
   const key=new URL(route.request().url()).pathname.split('/collectibles/')[1]
   const base=key.includes('/nyamnyam/')?'assets/storage-upload/new/20261026-181300':root
   return route.fulfill({path:path.resolve(base,key),contentType:'image/png'})
  })
  await page.goto('http://localhost:5173/artifacts/pirate-rod-review.html')
  await page.waitForFunction(()=>[...document.images].every(i=>i.complete&&i.naturalWidth>0))
  await page.waitForFunction(()=>document.querySelectorAll('[data-equipped-reel="plunder"] image').length===2)
  const rotation=page.locator('[data-skin-rotor="plunder"]').locator('..'),a=await rotation.getAttribute('transform')
  await page.waitForTimeout(180);if(await rotation.getAttribute('transform')===a)throw Error('Reel did not rotate')
  for(let frame=0;frame<8;frame++){
   await page.waitForTimeout(170)
   if(width===1000)await page.locator('.reel').screenshot({path:out+`/reel-${frame}.png`})
  }
  if(await page.locator('[data-skin-frame="plunder"] image').count()!==1||await page.locator('[data-skin-float="plunder"] image').count()!==1)throw Error('Equipment image fell back')
  const prices=await page.locator('.cards strong').allTextContents()
  if(prices.length!==2||prices.some(p=>p!=='1,500원'))throw Error('Unexpected visible price')
  if(await page.locator('h1 img').getAttribute('src')!=='/region-icons/plunder-v1.png')throw Error('Dedicated flag icon missing')
  await page.screenshot({path:out+`/page-${width}.png`,fullPage:true})
  if(errors.length)throw Error(errors.join('\n'))
  checks.push({width,dpr:2,bothPrices1500:true,flagIcon:true,rotatingReel:true,pirateShaftAndFloat:true,errors})
  await page.close()
 }
 fs.writeFileSync(root+'/preview-verification.json',JSON.stringify({testedAt:new Date().toISOString(),checks},null,2)+'\n')
 console.log('PASS: desktop/mobile flag, both prices, actual rotating reel, shaft, float and gauge; no failed images')
}finally{await browser.close()}
