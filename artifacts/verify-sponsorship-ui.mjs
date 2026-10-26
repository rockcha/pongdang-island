import {chromium} from 'file:///C:/Users/user/Desktop/holoseogi-counsel/node_modules/playwright-core/index.mjs'
import {mkdirSync,writeFileSync} from 'node:fs'
const browser=await chromium.launch({headless:true,executablePath:'C:/Users/user/AppData/Local/ms-playwright/chromium-1243/chrome-win64/chrome.exe'})
mkdirSync('artifacts/previews/sponsorship',{recursive:true})
const results=[]
try{
 for(const width of [320,390,1000]){
  const page=await browser.newPage({viewport:{width,height:844},deviceScaleFactor:1})
  const errors=[];page.on('pageerror',error=>errors.push(error.message))
  await page.goto('http://127.0.0.1:5174/artifacts/sponsorship-review.html')
  await page.getByRole('button',{name:'500골드 받기'}).waitFor();await page.waitForTimeout(400);await page.screenshot({path:`artifacts/previews/sponsorship/list-${width}.png`})
  const overflow=await page.evaluate(()=>document.documentElement.scrollWidth>innerWidth)
  await page.getByRole('button',{name:'후원하기',exact:true}).click()
  await page.getByLabel('1인당 골드').fill('200');await page.getByLabel('받을 인원').fill('3')
  await page.waitForTimeout(400);await page.screenshot({path:`artifacts/previews/sponsorship/create-${width}.png`})
  await page.getByRole('button',{name:'600골드로 후원 열기'}).click()
  await page.getByText('내가 연 후원이에요.').waitFor()
  await page.getByRole('button',{name:'내 후원·수령'}).click()
  await page.getByRole('button',{name:'후원 취소',exact:true}).click()
  await page.getByRole('button',{name:'취소하고 돌려받기'}).click()
  await page.getByText('취소됨',{exact:true}).waitFor()
  await page.getByRole('button',{name:'진행 중',exact:true}).click()
  await page.getByRole('button',{name:'500골드 받기'}).click()
  await page.getByText('500골드 받았어요',{exact:true}).waitFor()
  await page.getByRole('button',{name:'전체 보기'}).first().click()
  await page.getByRole('dialog').waitFor();await page.getByText('5번째 수령').waitFor()
  await page.waitForTimeout(400);await page.screenshot({path:`artifacts/previews/sponsorship/people-${width}.png`})
  await page.getByRole('button',{name:'Close',exact:true}).click()
  await page.getByRole('button',{name:'1,000골드 받기'}).click()
  await page.getByText('후원 완료',{exact:true}).waitFor()
  await page.waitForTimeout(400);await page.screenshot({path:`artifacts/previews/sponsorship/received-${width}.png`})
  results.push({width,overflow,errors,createCancelClaimAndFinalSlot:true})
  await page.close()
 }
 writeFileSync('artifacts/sponsorship-ui-verification.json',JSON.stringify({scope:'Local synthetic UI services; no production accounts or gold used',results},null,2));console.log(JSON.stringify(results))
}finally{await browser.close()}
