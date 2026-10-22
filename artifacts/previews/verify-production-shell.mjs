import {chromium} from 'file:///C:/Users/user/Desktop/holoseogi-counsel/node_modules/playwright-core/index.mjs'
import {readFileSync} from 'node:fs'
const browser=await chromium.launch({headless:true,executablePath:'C:/Users/user/AppData/Local/ms-playwright/chromium-1243/chrome-win64/chrome.exe'})
try{
 const page=await browser.newPage({viewport:{width:390,height:844}}),errors=[]
 page.on('pageerror',e=>errors.push(e.message))
 const catalog=JSON.parse(readFileSync('supabase/catalog/catalog.json','utf8'))
 const facilities=catalog.production_facilities.map(f=>({...f,owned:true,ownedCount:1,startedAt:null,completesAt:null,expiresAt:null,runOutput:null}))
 await page.route('**/rest/v1/rpc/production_state',route=>route.fulfill({json:{serverNow:new Date().toISOString(),gold:10000,fuel:3,facilities,sites:facilities.map(f=>({...f,siteId:f.id}))}}))
 for(const [width,height] of [[390,844],[320,568],[1280,900]]){
  await page.setViewportSize({width,height})
  for(const path of ['/production','/production/','/production-shop','/production-shop/']){
   await page.goto('http://127.0.0.1:5175/artifacts/previews/production-layout.html?path='+encodeURIComponent(path))
   await page.waitForSelector('article')
   const measurements=await page.evaluate(()=>({scroll:document.documentElement.scrollHeight,viewport:innerHeight,shell:document.querySelector('.app-shell').getBoundingClientRect().height}))
   if(measurements.scroll>measurements.viewport+1)throw Error(path+' '+width+': whole-page overflow '+JSON.stringify(measurements))
   const header=await page.locator('header').boundingBox(),tabs=await page.getByRole('tablist',{name:'생산소 종류'}).boundingBox()
   const amount=await page.locator('#production-panel').evaluate(e=>{e.scrollTop=500;return e.scrollTop})
   if(amount<=0)throw Error('Inventory does not scroll')
   await page.evaluate(()=>scrollTo(0,500))
   await page.mouse.move(width/2,height-30);await page.mouse.wheel(0,1500)
   const result=await page.evaluate(()=>({window:scrollY,header:document.querySelector('header').getBoundingClientRect().top,tabs:document.querySelector('[aria-label="생산소 종류"]').getBoundingClientRect().top}))
   if(result.window!==0||Math.abs(result.header-header.y)>1||Math.abs(result.tabs-tabs.y)>1)throw Error('Outer viewport moved: '+path+' '+JSON.stringify(result))
   if(width===390&&!path.endsWith('/'))await page.screenshot({path:`artifacts/previews/${path.slice(1)}-fixed-shell.png`})
  }
 }
 if(errors.length)throw Error(errors.join('\n'))
 console.log('PASS: actual AppLayout for both production pages, optional trailing slash, 320/390/1280px; only the list scrolls, header and filters stay fixed. Mocked RPC, guest header.')
}finally{await browser.close()}
