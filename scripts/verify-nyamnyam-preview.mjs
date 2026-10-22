import {chromium} from 'file:///C:/Users/user/Desktop/holoseogi-counsel/node_modules/playwright-core/index.mjs'
import {readFileSync,writeFileSync} from 'node:fs'
import {resolve} from 'node:path'

const root='assets/storage-upload/new/20261023-034400'
const manifest=JSON.parse(readFileSync(root+'/manifest.json','utf8'))
const known=new Set(manifest.items.flatMap(p=>[p.thumbnail_path,p.sprite_sheet_path,p.catalog_sprite_sheet_path].filter(Boolean)))
const browser=await chromium.launch({headless:true,executablePath:'C:/Users/user/AppData/Local/ms-playwright/chromium-1243/chrome-win64/chrome.exe'})
try{
 const page=await browser.newPage({viewport:{width:1100,height:900},deviceScaleFactor:1})
 const errors=[],missing=[]
 page.on('pageerror',e=>errors.push(e.message))
 page.on('response',r=>{if(r.status()>=400)missing.push(r.status()+' '+r.url())})
 await page.route('**/storage/v1/object/public/collectibles/**',async route=>{
  const key=new URL(route.request().url()).pathname.split('/collectibles/')[1]
  if(!known.has(key))throw Error('Unexpected collectible texture '+key)
  await route.fulfill({path:resolve(root,key),contentType:'image/png'})
 })
 await page.goto('http://127.0.0.1:5174/'+root+'/review.html')
 await page.waitForFunction(()=>document.querySelectorAll('[data-species]').length===48)
 await page.waitForFunction(()=>Array.from(document.querySelectorAll('article img')).every(img=>img.complete&&img.naturalWidth>0))
 await page.waitForFunction(()=>document.querySelectorAll('canvas').length===5)
 await page.waitForFunction(()=>Array.from(document.querySelectorAll('canvas')).every(c=>c.clientHeight>=300&&c.height>=300))
 await page.evaluate(()=>document.fonts.ready)
 await page.screenshot({path:'artifacts/previews/nyamnyam-desktop.png',fullPage:true})
 // Capture a complete action cycle in the real aquarium renderer.
 for(let n=0;n<4;n++){
  await page.locator('canvas').first().scrollIntoViewIfNeeded()
  await page.waitForTimeout(1500)
  await page.locator('canvas').first().screenshot({path:`artifacts/previews/nyamnyam-mythic-${n}.png`})
 }
 await page.setViewportSize({width:390,height:844})
 await page.waitForTimeout(400)
 await page.screenshot({path:'artifacts/previews/nyamnyam-mobile.png',fullPage:true})
 if(await page.getByRole('alert').count())throw Error(await page.getByRole('alert').allTextContents())
 if(errors.length||missing.length)throw Error(JSON.stringify({errors,missing}))
 writeFileSync(root+'/preview-verification.json',JSON.stringify({testedAt:new Date().toISOString(),viewports:[1100,390],thumbnailCount:48,canvases:5,errors,missing,note:'Local art fixtures in the actual TankInhabitants renderer; no player writes or remote catalog assertion.'},null,2)+'\n')
 console.log('PASS: 48 thumbnails, five real aquarium canvases, desktop/mobile, action cycle and no browser or image errors.')
}finally{await browser.close()}
