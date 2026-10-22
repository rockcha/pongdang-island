import {chromium} from 'file:///C:/Users/user/Desktop/holoseogi-counsel/node_modules/playwright-core/index.mjs'
import {writeFileSync} from 'node:fs'
const browser=await chromium.launch({headless:true,executablePath:'C:/Users/user/AppData/Local/ms-playwright/chromium-1243/chrome-win64/chrome.exe'})
try{
 const page=await browser.newPage({viewport:{width:390,height:600}}),errors=[]
 page.on('pageerror',e=>errors.push(e.message));page.on('response',r=>{if(r.status()>=400)errors.push(r.status()+' '+r.url())})
 await page.goto('http://127.0.0.1:5174/assets/storage-upload/new/20261023-050312/review.html')
 await page.waitForFunction(()=>document.images.length===8&&Array.from(document.images).every(i=>i.complete&&i.naturalWidth>0))
 const sources=await page.locator('img').evaluateAll(images=>images.map(i=>i.getAttribute('src')))
 if(sources.some(s=>!['/region-icons/siren-v2.png','/region-icons/nyamnyam-v2.png'].includes(s)))throw Error('Old icon referenced')
 await page.screenshot({path:'artifacts/previews/region-symbols-v2.png',fullPage:true})
 if(errors.length)throw Error(JSON.stringify(errors))
 writeFileSync('assets/storage-upload/new/20261023-050312/verification.json',JSON.stringify({verifiedAt:new Date().toISOString(),scope:'Actual HabitatFilters and shared regionIcons; 24/36/64px rendering',errors,sources},null,2)+'\n')
 console.log('PASS: 8 loaded v2 icons, actual region filters, no browser or image errors.')
}finally{await browser.close()}
