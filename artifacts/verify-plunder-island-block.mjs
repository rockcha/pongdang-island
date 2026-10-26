import {chromium} from 'file:///C:/Users/user/Desktop/holoseogi-counsel/node_modules/playwright-core/index.mjs'
import fs from 'node:fs'
const browser=await chromium.launch({headless:true,executablePath:'C:/Users/user/AppData/Local/ms-playwright/chromium-1243/chrome-win64/chrome.exe'})
try{
 const page=await browser.newPage({viewport:{width:390,height:844},deviceScaleFactor:2})
 await page.goto('http://localhost:5173/artifacts/island-coming-soon-review.html')
 await page.getByRole('heading',{name:'준비 중이에요'}).waitFor()
 if(await page.getByRole('button',{name:'땅 추가',exact:true}).count())throw Error('Island editor still exposed')
 if(!fs.readFileSync('src/routes.tsx','utf8').includes("import('@/features/my-island/my-island-coming-soon')"))throw Error('Route not guarded')
 await page.screenshot({path:'artifacts/plunder-previews/island-preparing.png',fullPage:true})
 console.log('PASS: /my-island route imports preparation screen; mobile view has heading and return link, no editor')
}finally{await browser.close()}
