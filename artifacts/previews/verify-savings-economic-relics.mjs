import {chromium} from 'file:///C:/Users/user/Desktop/holoseogi-counsel/node_modules/playwright-core/index.mjs'
import fs from 'node:fs'
const browser=await chromium.launch({headless:true,executablePath:'C:/Users/user/AppData/Local/ms-playwright/chromium-1243/chrome-win64/chrome.exe'})
const report=[]
try{
 for(const [width,height,dark,percent] of [[320,568,false,2],[390,844,false,10],[1000,900,true,5]]){
  const page=await browser.newPage({viewport:{width,height}}),errors=[]
  page.on('pageerror',e=>errors.push(e.message))
  await page.route('**/src/components/auth-provider.tsx*',r=>r.fulfill({contentType:'application/javascript',body:'export const useAuth=()=>({session:{user:{id:"savings-relic-preview"}},recovery:false});'}))
  await page.route('**/src/features/gold/gold-provider.tsx*',r=>r.fulfill({contentType:'application/javascript',body:'import React from "/node_modules/.vite/deps/react.js";export const useGold=()=>({refresh:async()=>{}});export const GoldIcon=({className})=>React.createElement("span",{className},"🪙");'}))
  await page.route('**/src/features/savings/api.ts*',r=>r.request().url().includes('preview-real')?r.continue():r.fulfill({contentType:'application/javascript',body:`export * from '/src/features/savings/api.ts?preview-real';export const readSavings=async()=>({account:null,history:[],gold:50000,relicBonusPercent:${percent},serverNow:new Date().toISOString()});`}))
  await page.goto('http://127.0.0.1:5173/artifacts/previews/savings-economic-relics.html')
  await page.evaluate(dark=>document.documentElement.classList.toggle('dark',dark),dark)
  await page.getByText(`유물 효과 · 조개 적금 이자 +${percent}%`,{exact:false}).waitFor()
  for(const [days,base] of [[3,60],[5,125],[7,210]]){
   await page.getByRole('button',{name:new RegExp(days+'일.*보너스')}).click()
   const total=days*100+base+Math.floor(base*percent/100)
   await page.locator('dl').getByText(total.toLocaleString('ko-KR'),{exact:false}).waitFor()
  }
  const overflow=await page.evaluate(()=>document.documentElement.scrollWidth>innerWidth)
  await page.screenshot({path:`artifacts/previews/savings-relic-${width}-${percent}.png`,fullPage:true})
  report.push({width,height,dark,percent,overflow,errors})
  if(overflow||errors.length)throw Error(JSON.stringify(report.at(-1)))
  await page.close()
 }
 fs.writeFileSync('artifacts/previews/savings-economic-relic-verification.json',JSON.stringify(report,null,2)+'\n')
 console.log(JSON.stringify(report))
}finally{await browser.close()}
