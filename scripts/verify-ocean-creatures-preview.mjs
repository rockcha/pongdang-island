import {chromium} from 'file:///C:/Users/user/Desktop/holoseogi-counsel/node_modules/playwright-core/index.mjs'
import {readFileSync,writeFileSync} from 'node:fs'
import {resolve} from 'node:path'
import {createHash} from 'node:crypto'
const root=process.argv[2]||'assets/storage-upload/new/20261023-050755',manifest=JSON.parse(readFileSync(root+'/manifest.json','utf8'))
if(!/^assets\/storage-upload\/new\/\d{8}-\d{6}$/.test(root))throw Error('Expected workspace art batch')
const known=new Set(manifest.items.flatMap(p=>[p.thumbnail_path,p.sprite_sheet_path,p.catalog_sprite_sheet_path]))
const browser=await chromium.launch({headless:true,executablePath:'C:/Users/user/AppData/Local/ms-playwright/chromium-1243/chrome-win64/chrome.exe'})
try{
 const page=await browser.newPage({viewport:{width:900,height:1100}}),errors=[]
 page.on('pageerror',e=>errors.push(e.message));page.on('response',r=>{if(r.status()>=400)errors.push(r.status()+' '+r.url())})
 await page.route('**/storage/v1/object/public/collectibles/**',async route=>{
  const key=new URL(route.request().url()).pathname.split('/collectibles/')[1]
  if(!known.has(key))throw Error('Unexpected texture '+key)
  await route.fulfill({path:resolve(root,key),contentType:'image/png'})
 })
 await page.goto('http://127.0.0.1:5174/'+root+'/review.html')
 await page.waitForFunction(expected=>document.querySelectorAll('canvas').length===expected&&document.querySelector('[data-tank] canvas').height>=300&&Array.from(document.images).every(i=>i.complete&&i.naturalWidth>0)&&document.querySelectorAll('[aria-busy="true"]').length===0,manifest.items.length+1)
 await page.screenshot({path:'artifacts/previews/ocean-creatures-desktop.png',fullPage:true})
 const detail=page.locator(`[data-preview="${manifest.items.length===1?manifest.items[0].id:'primal-nemerion-last-ocean-heir'}"] canvas`),hashes=[]
 await detail.scrollIntoViewIfNeeded()
 const fourPoses=manifest.items.length===1&&manifest.items[0].frames===4
 for(let n=0;n<(fourPoses?16:8);n++){
  await page.waitForTimeout(fourPoses?137:800)
  const bytes=await detail.screenshot({path:`artifacts/previews/nemerion-action-${n}.png`})
  hashes.push(createHash('sha256').update(bytes).digest('hex'))
 }
 if(new Set(hashes).size<4)throw Error('Creature preview did not expose four distinct animated poses')
 await page.emulateMedia({reducedMotion:'reduce'});await page.waitForTimeout(250)
 const reduced1=await detail.screenshot();await page.waitForTimeout(450);const reduced2=await detail.screenshot()
 if(!reduced1.equals(reduced2))throw Error('Reduced-motion preview is moving')
 await page.emulateMedia({reducedMotion:'no-preference'});await page.setViewportSize({width:390,height:844});await page.waitForTimeout(400)
 await page.screenshot({path:'artifacts/previews/ocean-creatures-mobile.png',fullPage:true})
 if(errors.length||await page.getByRole('alert').count())throw Error(JSON.stringify(errors))
 writeFileSync(root+'/preview-verification.json',JSON.stringify({testedAt:new Date().toISOString(),scope:'Local fixtures in real aquarium and collection preview, desktop/mobile, a complete six-second action cycle and static reduced-motion pose',actionCaptures:hashes.length,distinctCaptures:new Set(hashes).size,errors},null,2)+'\n')
 console.log(`PASS: ${manifest.items.length} aquarium creatures, collection previews, mythic action cycle, reduced motion and desktop/mobile.`)
}finally{await browser.close()}
