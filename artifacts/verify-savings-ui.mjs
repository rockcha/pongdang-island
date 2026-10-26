import {chromium} from 'file:///C:/Users/user/Desktop/holoseogi-counsel/node_modules/playwright-core/index.mjs'
import {mkdirSync,writeFileSync} from 'node:fs'
const browser=await chromium.launch({headless:true,executablePath:'C:/Users/user/AppData/Local/ms-playwright/chromium-1243/chrome-win64/chrome.exe'})
mkdirSync('artifacts/previews/savings',{recursive:true})
const results=[]
try{
 for(const width of [320,390,1000])for(const state of ['form','due','waiting','full','matured','missed']){
  const page=await browser.newPage({viewport:{width,height:844},deviceScaleFactor:1}),errors=[];page.on('pageerror',e=>errors.push(e.message))
  await page.goto(`http://127.0.0.1:5174/artifacts/savings-review.html?state=${state}`)
  await page.getByText(state==='form'?'차곡차곡, 조개에 모아요':'모은 골드',{exact:true}).waitFor();await page.waitForTimeout(350)
  const overflow=await page.evaluate(()=>document.documentElement.scrollWidth>innerWidth)
  const button=state==='form'?page.getByRole('button',{name:'첫 100골드 넣고 시작하기'}):state==='due'?page.getByRole('button',{name:'500골드 넣기'}):null
  const box=await button?.boundingBox()
  await page.screenshot({path:`artifacts/previews/savings/${state}-${width}.png`})
  if(state==='form'){
   await page.getByRole('button',{name:'매일 500골드 선택'}).click();await page.getByRole('button',{name:'5일',exact:false}).click();await page.getByText('3,125',{exact:true}).waitFor()
   await page.getByRole('button',{name:'첫 500골드 넣고 시작하기'}).click();await page.getByText('확인 화면으로 이동').waitFor()
  }else if(state==='due'){
   await page.getByRole('button',{name:'500골드 넣기'}).click();await page.getByRole('button',{name:'납입 완료',exact:true}).waitFor()
   await page.getByText('적금 정보',{exact:true}).click();await page.getByRole('button',{name:'중도 해지'}).click();await page.getByText('해지 확인 요청').waitFor()
  }
  await page.getByText('최근 저금 기록',{exact:false}).click();await page.getByText('5일 적금 · 만기 수령',{exact:true}).waitFor()
  results.push({width,state,overflow,primaryButtonVisible:box?box.y+box.height<=844:null,errors})
  await page.close()
 }
 writeFileSync('artifacts/savings-ui-verification.json',JSON.stringify({scope:'Local synthetic presentation only; no database requests',results},null,2));console.log(JSON.stringify(results))
}finally{await browser.close()}
