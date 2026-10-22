import {readFileSync} from 'node:fs'
import {chromium} from 'file:///C:/Users/user/Desktop/holoseogi-counsel/node_modules/playwright-core/index.mjs'
const browser=await chromium.launch({headless:true,executablePath:'C:/Users/user/AppData/Local/ms-playwright/chromium-1243/chrome-win64/chrome.exe'})
try{
 const page=await browser.newPage({viewport:{width:390,height:844}}),errors=[]
 page.on('pageerror',e=>errors.push(e.message))
 let fuel=12345
 const now=Date.now(),date=n=>new Date(now+n).toISOString()
 const facilities=JSON.parse(readFileSync('supabase/catalog/catalog.json','utf8')).production_facilities.slice(0,4).map((f,i)=>({...f,owned:true,startedAt:i?date(-60000):null,completesAt:i?date(i===1?60000:-1000):null,expiresAt:i?date(i===3?-100:120000):null,runOutput:i?f.output_count:null}))
 await page.route('**/rest/v1/rpc/**',route=>route.fulfill({json:route.request().url().endsWith('production_state')?{serverNow:new Date().toISOString(),gold:1,fuel:0,facilities}:{serverNow:new Date().toISOString(),fuel,fuelPrice:60,dockSlots:2,vessels:[],boats:[],voyages:[]}}))
 await page.goto('http://127.0.0.1:5175/artifacts/previews/production.html?port')
 const badge=page.getByRole('status',{name:'현재 보유 연료'})
 await badge.getByText('12,345',{exact:false}).waitFor()
 await page.waitForFunction(()=>[...document.querySelectorAll('img[src="/port/harbor-scene.png"]')].every(i=>i.complete&&getComputedStyle(i).opacity==='1'))
 const parent=await page.getByLabel('내 항구의 선착장과 바다').boundingBox(),box=await badge.boundingBox()
 if(box.x+box.width>parent.x+parent.width||box.y<parent.y||box.y>parent.y+20)throw Error('Fuel badge outside upper-right harbor background')
 await page.screenshot({path:'artifacts/previews/port-fuel-badge.png'})
 fuel=0;await page.evaluate(()=>window.dispatchEvent(new Event('harbor-changed')))
 await badge.getByText('0',{exact:false}).waitFor()
 await page.goto('http://127.0.0.1:5175/artifacts/previews/production.html')
 await page.getByRole('article').first().waitFor()
 const colors=await page.getByRole('article').evaluateAll(items=>items.map(e=>getComputedStyle(e).backgroundColor))
 if(new Set(colors).size!==4)throw Error('Expected four distinct card colors')
 await page.getByRole('tab',{name:'만료 1',exact:true}).click()
 await page.screenshot({path:'artifacts/previews/production-expired-card.png'})
 for(const width of [320,390,1280]){await page.setViewportSize({width,height:844});if(await page.evaluate(()=>document.documentElement.scrollWidth>innerWidth))throw Error('Horizontal overflow')}
 if(errors.length)throw Error(errors.join('\n'))
 console.log('PASS: four card colors, harbor fuel badge positioning and zero balance refresh; no real player requests')
}finally{await browser.close()}
