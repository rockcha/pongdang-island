import {chromium} from 'file:///C:/Users/user/Desktop/holoseogi-counsel/node_modules/playwright-core/index.mjs'
import {readFileSync,writeFileSync} from 'node:fs'
import {resolve} from 'node:path'
const root=process.argv[2]||'assets/storage-upload/new/20261023-043727'
if(!/^assets\/storage-upload\/new\/\d{8}-\d{6}$/.test(root))throw Error('Expected a workspace art batch')
const previewPrefix='artifacts/previews/food-extras-'+root.split('/').at(-1)
const manifest=JSON.parse(readFileSync(root+'/manifest.json','utf8'))
const known=new Set(manifest.items.flatMap(p=>[p.thumbnail_path,p.sprite_sheet_path]))
const browser=await chromium.launch({headless:true,executablePath:'C:/Users/user/AppData/Local/ms-playwright/chromium-1243/chrome-win64/chrome.exe'})
try{
 const page=await browser.newPage({viewport:{width:800,height:1000}}),errors=[]
 page.on('pageerror',e=>errors.push(e.message));page.on('response',r=>{if(r.status()>=400)errors.push(r.status()+' '+r.url())})
 await page.route('**/storage/v1/object/public/collectibles/**',async route=>{
  const key=new URL(route.request().url()).pathname.split('/collectibles/')[1]
  if(!known.has(key))throw Error('Unexpected texture '+key)
  await route.fulfill({path:resolve(root,key),contentType:'image/png'})
 })
 await page.goto('http://127.0.0.1:5174/'+root+'/review.html')
 await page.waitForFunction(()=>document.querySelectorAll('canvas').length===1&&document.querySelector('canvas').height>=300)
 await page.waitForFunction(()=>Array.from(document.images).every(i=>i.complete&&i.naturalWidth>0))
 await page.locator('canvas').scrollIntoViewIfNeeded();await page.waitForTimeout(2500)
 await page.screenshot({path:previewPrefix+'-desktop.png',fullPage:true})
 await page.waitForTimeout(2500)
 await page.locator('canvas').screenshot({path:previewPrefix+'-motion.png'})
 await page.setViewportSize({width:390,height:844});await page.waitForTimeout(400)
 await page.screenshot({path:previewPrefix+'-mobile.png',fullPage:true})
 if(errors.length||await page.getByRole('alert').count())throw Error(JSON.stringify(errors))
 writeFileSync(root+'/preview-verification.json',JSON.stringify({testedAt:new Date().toISOString(),species:manifest.items.length,scope:'Local fixtures in real TankInhabitants; desktop/mobile; icons when included in preview',errors},null,2)+'\n')
 console.log(`PASS: ${manifest.items.length} animated species in desktop/mobile previews.`)
}finally{await browser.close()}
