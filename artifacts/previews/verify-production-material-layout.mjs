import { chromium } from 'file:///C:/Users/user/Desktop/holoseogi-counsel/node_modules/playwright-core/index.mjs'
import {readFileSync} from 'node:fs'
const browser=await chromium.launch({headless:true,executablePath:'C:/Users/user/AppData/Local/ms-playwright/chromium-1243/chrome-win64/chrome.exe'})
try{
 const page=await browser.newPage({viewport:{width:390,height:844}}),errors=[]
 await page.emulateMedia({reducedMotion:'reduce'})
 page.on('pageerror',e=>errors.push(e.message))
 const catalog=JSON.parse(readFileSync('supabase/catalog/catalog.json','utf8'))
 const state={serverNow:new Date().toISOString(),gold:10000,fuel:3,facilities:catalog.production_facilities.map(f=>({...f,owned:true,startedAt:null,completesAt:null,expiresAt:null,runOutput:null}))}
 const stock=Array.from({length:30},(_,i)=>({id:'fish-'+i,name:i===0?'은빛 멸치':`보관함 물고기 ${i+1}`,sell_price:25+i,available:1,rarity:['common','rare','epic','mythic'][i%4],thumbnail_path:''}))
 await page.route('**/rest/v1/rpc/production_*',route=>route.fulfill({json:route.request().url().endsWith('production_materials')?stock:state}))
 await page.goto('http://127.0.0.1:5175/artifacts/previews/production.html')
 await page.getByRole('tab',{name:'어유 정제'}).click()
 await page.getByRole('button',{name:'수달 아저씨의 손잡이 착유기 · 가동 대기',exact:true}).click()
 await page.getByText('은빛 멸치',{exact:true}).waitFor()
 const dialog=page.getByRole('dialog'),start=page.getByRole('button',{name:'재료 넣고 가동하기',exact:true}),auto=page.getByRole('button',{name:'자동 넣기',exact:true})
 if(await auto.locator('svg').count())throw Error('Auto-fill still has an icon')
 if(await page.getByText(/개 더 넣어주세요/).count())throw Error('Extra material prompt remains')
 async function check(label){
  const dimensions=await dialog.evaluate(e=>({client:e.clientHeight,scroll:e.scrollHeight,top:e.getBoundingClientRect().top,bottom:e.getBoundingClientRect().bottom,maxHeight:getComputedStyle(e).maxHeight,minHeight:getComputedStyle(e).minHeight,display:getComputedStyle(e).display,innerHeight,visualHeight:visualViewport?.height,rootZoom:getComputedStyle(document.documentElement).zoom,classes:e.className}))
  const footer=await start.boundingBox()
  if(dimensions.scroll>dimensions.client+1||dimensions.top<0||dimensions.bottom>await page.evaluate(()=>innerHeight)||footer.y+footer.height>dimensions.bottom)throw Error(label+': clipped dialog '+JSON.stringify({dimensions,footer}))
  if(await page.evaluate(()=>document.documentElement.scrollWidth>innerWidth))throw Error('Horizontal page overflow')
 }
 for(const [width,height] of [[390,844],[450,800],[320,568],[1280,720],[844,390]]){
  await page.setViewportSize({width,height});await page.evaluate(()=>new Promise(r=>requestAnimationFrame(()=>requestAnimationFrame(r))));await check(width+'x'+height)
 }
 await page.setViewportSize({width:390,height:844})
 await page.screenshot({path:'artifacts/previews/production-materials-compact-empty.png'})
 await auto.click()
 await check('selected')
 if(!await start.isEnabled())throw Error('Auto-fill did not enable start')
 await page.screenshot({path:'artifacts/previews/production-materials-compact-selected.png'})
 await page.getByRole('button',{name:'은빛 멸치 선택한 재료 1개 빼기',exact:true}).click()
 if(!await start.isDisabled())throw Error('Selected material removal failed')
 await page.getByRole('button',{name:'Close',exact:true}).click()
 await page.getByRole('button',{name:'난파선 삼단 증류탑 · 가동 대기',exact:true}).click()
 await page.getByText('은빛 멸치',{exact:true}).waitFor()
 await auto.click()
 for(const [width,height] of [[390,844],[320,568],[844,390]]){await page.setViewportSize({width,height});await page.evaluate(()=>new Promise(r=>requestAnimationFrame(()=>requestAnimationFrame(r))));await check('nine selected '+width+'x'+height)}
 if(errors.length)throw Error(errors.join('\n'))
 console.log('PASS: no outer modal overflow at 320/390/450/1280px and landscape; long inventory and nine selections; auto-fill/removal; no auto-fill icon or remaining-count prompt. Mocked RPC.')
}finally{await browser.close()}
