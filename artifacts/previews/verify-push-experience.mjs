import {chromium} from 'file:///C:/Users/user/Desktop/holoseogi-counsel/node_modules/playwright-core/index.mjs'
import fs from 'node:fs'
const browser=await chromium.launch({headless:true,executablePath:'C:/Users/user/AppData/Local/ms-playwright/chromium-1243/chrome-win64/chrome.exe'})
const results=[]
try{
 for(const [width,height,dark] of [[320,568,false],[390,844,false],[844,390,true]]){
  const page=await browser.newPage({viewport:{width,height},reducedMotion:'reduce'})
  const errors=[];page.on('pageerror',e=>errors.push(e.message))
  await page.route('**/src/components/auth-provider.tsx*',r=>r.fulfill({contentType:'application/javascript',body:'export const useAuth=()=>({session:{user:{id:"push-preview"}},recovery:false});'}))
  await page.route('**/src/features/notifications/push-device.ts*',r=>r.fulfill({contentType:'application/javascript',body:`export const pushCategories=['production','bait-production','expedition','harbor','production-expiring','bait-production-expiring','voyage-bets'],defaultPushCategories=['production','bait-production','expedition','harbor'];export const supportsPush=()=>true,needsHomeScreen=()=>false,pushConfiguration=async()=>({configured:true,publicKey:'preview'}),currentPushDevice=async()=>({registered:true,categories:defaultPushCategories}),enablePush=async()=>({registered:true}),disablePush=async()=>{},savePushCategories=async()=>{},queuePushTest=async(delay)=>{window.__testDelay=delay};`}))
  await page.route('**/src/features/notifications/push-notice-api.ts*',r=>r.fulfill({contentType:'application/javascript',body:'export const readActivePush=async()=>({active:[],observedBefore:Date.now()-10000});'}))
  await page.goto('http://127.0.0.1:5173/artifacts/previews/push-experience.html')
  await page.bringToFront()
  if(dark)await page.evaluate(()=>document.documentElement.classList.add('dark'))
  await page.getByRole('button',{name:'30초 뒤 테스트 알림'}).waitFor()
  await page.screenshot({path:`artifacts/previews/push-experience-${width}-settings.png`,fullPage:true})
  await page.getByRole('button',{name:'30초 뒤 테스트 알림'}).click()
  if(await page.evaluate(()=>window.__testDelay)!==30)throw Error('Wrong test delay')
  await page.evaluate(()=>{for(const id of ['1','2'])window.dispatchEvent(new CustomEvent('pongdang:foreground-notice',{detail:{userId:'push-preview',category:'production',tag:'notice:'+id,title:'완료',body:'연료 17개가 준비됐어요.',quantity:17,url:'/production'}}))})
  await page.getByText('생산소 2곳 · 연료 34개가 준비됐어요. 한 번에 챙겨가세요.').waitFor()
  await page.screenshot({path:`artifacts/previews/push-experience-${width}-card.png`})
  const layout=await page.evaluate(()=>({width:innerWidth,overflow:document.documentElement.scrollWidth>innerWidth}))
  results.push({width,height,dark,layout,errors})
  if(layout.overflow||errors.length)throw Error(JSON.stringify(results.at(-1)))
  await page.close()
 }
 fs.writeFileSync('artifacts/previews/push-experience-verification.json',JSON.stringify(results,null,2)+'\n');console.log(JSON.stringify(results))
}finally{await browser.close()}
