import {chromium} from 'file:///C:/Users/user/Desktop/holoseogi-counsel/node_modules/playwright-core/index.mjs'
import fs from 'node:fs'
import path from 'node:path'
import {createHash} from 'node:crypto'
const {root}=JSON.parse(fs.readFileSync('artifacts/shared-wonders-root.json','utf8')),out=root+'/review'
const m=JSON.parse(fs.readFileSync(root+'/manifest.json','utf8')),known=new Set(m.items.flatMap(i=>[i.thumbnail_path,i.sprite_sheet_path]))
const browser=await chromium.launch({headless:true,executablePath:'C:/Users/user/AppData/Local/ms-playwright/chromium-1243/chrome-win64/chrome.exe'})
const errors=[],missing=[],checks=[]
try{
 for(const [width,height,dpr] of [[1100,1120,2],[390,844,1],[390,844,2],[390,844,3]]){
  const page=await browser.newPage({viewport:{width,height},deviceScaleFactor:dpr})
  page.on('pageerror',e=>errors.push(e.message));page.on('response',r=>{if(r.status()>=400)missing.push(r.status()+' '+r.url())})
  await page.route('**/storage/v1/object/public/collectibles/**',route=>{
   const key=new URL(route.request().url()).pathname.split('/collectibles/')[1]
   if(!known.has(key))throw Error('Unexpected texture '+key)
   return route.fulfill({path:path.resolve(root,key),contentType:'image/png'})
  })
  await page.goto('http://localhost:5173/artifacts/shared-common-review.html')
  await page.locator('[data-tank-ready]').scrollIntoViewIfNeeded()
  await page.locator('[data-tank-ready="true"]').waitFor({timeout:30000})
  await page.waitForFunction(()=>document.querySelectorAll('[data-previews] canvas').length===7)
  await page.locator('[data-tank]').screenshot({path:out+`/tank-${width}-dpr${dpr}.png`})
  const animated=[]
  for(const item of m.items){
   const card=page.locator(`[data-species="${item.id}"]`)
   await card.scrollIntoViewIfNeeded()
   await card.locator('[aria-busy="false"]').waitFor()
   const hashes=new Set()
   for(let frame=0;frame<8;frame++){
    await page.waitForTimeout(180)
    const png=await card.locator('canvas').screenshot()
    hashes.add(createHash('sha256').update(png).digest('hex'))
    if(width===1100)fs.writeFileSync(out+`/${item.id}-cycle-${frame}.png`,png)
   }
   if(hashes.size<3)throw Error('Insufficient animation poses '+item.id)
   animated.push({id:item.id,distinctPoses:hashes.size})
  }
  await page.emulateMedia({reducedMotion:'reduce'})
  for(const item of m.items){
   const canvas=page.locator(`[data-species="${item.id}"] canvas`);await canvas.scrollIntoViewIfNeeded();await page.waitForTimeout(150)
   const a=await canvas.screenshot();await page.waitForTimeout(300)
   if(!a.equals(await canvas.screenshot()))throw Error('Reduced motion moved '+item.id)
  }
  await page.evaluate(()=>window.scrollTo(0,0));await page.screenshot({path:out+`/page-${width}-dpr${dpr}.png`,fullPage:true})
  checks.push({width,height,dpr,actualAquariumReady:true,animated,reducedMotionStatic:true})
  await page.close()
 }
 if(errors.length||missing.length)throw Error(JSON.stringify({errors,missing}))
 fs.writeFileSync(root+'/preview-verification.json',JSON.stringify({testedAt:new Date().toISOString(),checks,errors,missing,note:'Actual Phaser aquarium and React collection preview with local image routing; no remote player mutations.'},null,2)+'\n')
 console.log('PASS: seven animated creatures in actual tank/collection, desktop and mobile DPR1/2/3, reduced motion, no missing textures')
}finally{await browser.close()}
