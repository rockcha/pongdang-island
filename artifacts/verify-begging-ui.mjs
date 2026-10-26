import {chromium} from 'file:///C:/Users/user/Desktop/holoseogi-counsel/node_modules/playwright-core/index.mjs'
import {mkdirSync,writeFileSync} from 'node:fs'
const browser=await chromium.launch({headless:true,executablePath:'C:/Users/user/AppData/Local/ms-playwright/chromium-1243/chrome-win64/chrome.exe'})
mkdirSync('artifacts/previews/begging',{recursive:true});const results=[]
try{for(const width of [320,390,1000]){
 const page=await browser.newPage({viewport:{width,height:844},deviceScaleFactor:1}),errors=[];page.on('pageerror',e=>errors.push(e.message))
 await page.goto('http://127.0.0.1:5174/artifacts/begging-review.html')
 await page.getByRole('button',{name:/골드 보내기/}).waitFor();await page.waitForTimeout(350)
 await page.screenshot({path:`artifacts/previews/begging/list-${width}.png`})
 const overflow=await page.evaluate(()=>document.documentElement.scrollWidth>innerWidth)
 await page.getByRole('button',{name:/골드 보내기/}).click();await page.getByRole('dialog').waitFor();await page.waitForTimeout(250)
 await page.screenshot({path:`artifacts/previews/begging/send-${width}.png`})
 await page.getByRole('button',{name:'100골드 보내기',exact:true}).click();await page.getByRole('dialog').waitFor({state:'hidden'})
 await page.getByRole('button',{name:'송금 기록',exact:true}).click();await page.getByText('−100골드',{exact:true}).waitFor();await page.waitForTimeout(250)
 await page.screenshot({path:`artifacts/previews/begging/history-${width}.png`})
 await page.getByRole('button',{name:'사연 쓰기'}).click();await page.getByLabel('나의 사연').fill('새로운 어항을 마련하고 싶어요. 응원해주세요!');await page.getByLabel('목표 골드').fill('1500');await page.waitForTimeout(250)
 await page.screenshot({path:`artifacts/previews/begging/create-${width}.png`})
 await page.getByRole('button',{name:'사연 등록하기'}).click();await page.getByText('내가 남긴 사연이에요.').waitFor()
 await page.getByRole('button',{name:'마감하기',exact:true}).click();await page.getByRole('alertdialog').getByRole('button',{name:'마감하기',exact:true}).click();await page.getByText('마감된 사연이에요.').waitFor()
 results.push({width,overflow,errors,createSendHistoryAndClose:true});await page.close()
}writeFileSync('artifacts/begging-ui-verification.json',JSON.stringify({scope:'Local synthetic services; no production players, gold or XP used',results},null,2));console.log(JSON.stringify(results))}finally{await browser.close()}
