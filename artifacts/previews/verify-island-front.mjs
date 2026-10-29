import {chromium} from 'file:///C:/Users/user/Desktop/holoseogi-counsel/node_modules/playwright-core/index.mjs'
import fs from 'node:fs'
const browser=await chromium.launch({headless:true,executablePath:'C:/Users/user/AppData/Local/ms-playwright/chromium-1243/chrome-win64/chrome.exe'})
const report=[]
try{
 for(const [width,height,dark] of [[390,844,false],[1200,1000,false],[1200,1000,true]]){
  const page=await browser.newPage({viewport:{width,height}}),errors=[]
  page.on('pageerror',e=>errors.push(e.message))
  await page.goto('http://127.0.0.1:5173/artifacts/previews/island-front.html'+(dark?'?dark=1':''))
  await page.waitForSelector('[data-island-preview]');await page.waitForLoadState('networkidle')
  const counts=await page.evaluate(()=>({png:document.querySelectorAll('[data-facility-png]').length,overflow:document.documentElement.scrollWidth>innerWidth}))
  if(errors.length||counts.overflow)throw Error(JSON.stringify({errors,counts}))
  await page.screenshot({path:`artifacts/previews/island-front-${width}-${dark?'dark':'light'}.png`,fullPage:true})
  await page.locator('[data-island-preview]').screenshot({path:`artifacts/previews/island-front-board-${width}-${dark?'dark':'light'}.png`})
  if(width===1200&&!dark)for(const name of ['이름 간판','나무 화살표 표지판','나무 울타리'])await page.getByText(name,{exact:true}).locator('..').screenshot({path:`artifacts/previews/island-front-${name}.png`})
  report.push({width,height,dark,...counts,errors});await page.close()
 }
 fs.writeFileSync('artifacts/previews/island-front-verification.json',JSON.stringify(report,null,2)+'\n')
 console.log(report)
}finally{await browser.close()}
