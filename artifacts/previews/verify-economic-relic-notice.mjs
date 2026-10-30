import {chromium} from 'file:///C:/Users/user/Desktop/holoseogi-counsel/node_modules/playwright-core/index.mjs'
import fs from 'node:fs'
const browser=await chromium.launch({headless:true,executablePath:'C:/Users/user/AppData/Local/ms-playwright/chromium-1243/chrome-win64/chrome.exe'})
try{
 const page=await browser.newPage({viewport:{width:390,height:844}}),errors=[]
 page.on('pageerror',e=>errors.push(e.message))
 await page.goto('http://127.0.0.1:5173/artifacts/previews/economic-relic-notice.html')
 await page.getByRole('heading',{level:1}).waitFor()
 await page.evaluate(async()=>{await document.fonts.ready;await Promise.all([...document.images].map(image=>image.decode()))})
 const result=await page.evaluate(()=>({images:document.images.length,overflow:document.documentElement.scrollWidth>innerWidth,broken:[...document.images].some(img=>!img.naturalWidth),rawMarkers:document.body.textContent.includes('![이미지]')}))
 if(result.images!==2||result.overflow||result.broken||result.rawMarkers||errors.length)throw Error(JSON.stringify({result,errors}))
 await page.screenshot({path:'artifacts/previews/economic-relic-notice-mobile.png',fullPage:true})
 fs.writeFileSync('assets/notices/20261030-economic-relics/preview-verification.json',JSON.stringify({...result,errors},null,2)+'\n')
 console.log(JSON.stringify(result))
}finally{await browser.close()}
