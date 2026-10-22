import {chromium} from 'file:///C:/Users/user/Desktop/holoseogi-counsel/node_modules/playwright-core/index.mjs'
import {readFileSync} from 'node:fs'
const browser=await chromium.launch({headless:true,executablePath:'C:/Users/user/AppData/Local/ms-playwright/chromium-1243/chrome-win64/chrome.exe'})
try{
 const page=await browser.newPage({viewport:{width:390,height:1000}}),errors=[],actions=[]
 page.on('pageerror',e=>errors.push(e.message))
 await page.emulateMedia({reducedMotion:'reduce'})
 const catalog=JSON.parse(readFileSync('supabase/catalog/catalog.json','utf8')),now=Date.now(),date=mins=>new Date(now+mins*60000).toISOString()
 const ids=['dewdrop-glass-distiller','otter-hand-press','dock-grandma-refining-pot','conch-spiral-distiller']
 const state={serverNow:date(0),gold:10000,fuel:3,facilities:catalog.production_facilities.map(f=>({...f,owned:ids.includes(f.id),startedAt:null,completesAt:null,expiresAt:null,runOutput:null}))}
 state.facilities.find(f=>f.id==='tin-grandpa-hearth').owned=true
 for(const [i,id] of ids.entries())if(i){const f=state.facilities.find(f=>f.id===id);Object.assign(f,{startedAt:date(i===1?-60:-180),completesAt:date(i===1?60:-60),expiresAt:date(i===3?-10:120),runOutput:f.output_count})}
 await page.route('**/rest/v1/rpc/production_*',route=>{
  const name=route.request().url().split('/').at(-1)
  if(name==='production_materials')return route.fulfill({json:[{id:'smelt',name:'정제용 빙어',rarity:'common',sell_price:15,available:10,thumbnail_path:''}]})
  if(name!=='production_state')actions.push(name)
  return route.fulfill({json:state})
 })
 await page.goto('http://127.0.0.1:5175/artifacts/previews/production.html')
 await page.getByLabel('쓰레기 재료 0/4',{exact:true}).waitFor()
 await page.getByRole('tab',{name:'어유 정제'}).click()
 await page.getByLabel('물고기 재료 0/4',{exact:true}).waitFor()
 const working=page.getByRole('article',{name:'수달 아저씨의 손잡이 착유기',exact:true})
 const progress=working.getByRole('progressbar',{name:'수달 아저씨의 손잡이 착유기 생산 진행률',exact:true})
 await progress.waitFor()
 const value=Number(await progress.getAttribute('aria-valuenow'))
 if(value<49||value>51)throw Error('Incorrect production progress '+value)
 if(await page.locator('[data-production-sprite]').evaluateAll(items=>items.some(i=>i.parentElement.querySelector('svg'))))throw Error('Circular gauge remains')
 await working.getByText('2개를 생산 중…',{exact:true}).waitFor()
 await page.getByRole('article',{name:'부두 할머니의 정제솥',exact:true}).getByText('1개를 수령하세요',{exact:true}).waitFor()
 await page.getByText('생산물이 만료됐어요',{exact:true}).waitFor()
 const overlay=working.locator('[data-production-working-overlay]')
 const bounds=await overlay.evaluate(e=>({overlay:e.getBoundingClientRect().toJSON(),image:e.parentElement.getBoundingClientRect().toJSON()}))
 if(Math.abs(bounds.overlay.width-bounds.image.width)>1||Math.abs(bounds.overlay.height-bounds.image.height)>1)throw Error('Overlay does not cover image area')
 if(!await page.locator('article h3').evaluateAll(items=>items.every(e=>getComputedStyle(e).textAlign==='center')))throw Error('Names are not centered')
 await page.waitForFunction(()=>[...document.querySelectorAll('article img[src^="/production/"]')].every(i=>i.complete&&i.naturalWidth>0&&getComputedStyle(i).opacity==='1'))
 await page.screenshot({path:'artifacts/previews/production-progress-cards.png'})
 await page.getByRole('button',{name:'부두 할머니의 정제솥 정보',exact:true}).click()
 const info=page.getByRole('dialog')
 for(const label of ['생산량','소모 재료','소요 시간','보관 시간','20분'])await info.getByText(label,{exact:true}).waitFor()
 await info.getByRole('heading',{name:'부두 할머니의 정제솥',exact:true}).waitFor()
 if(await info.getByRole('button',{name:'연료 받기',exact:true}).count()||actions.length)throw Error('Viewing info claimed production')
 await info.evaluate(async e=>{await new Promise(r=>requestAnimationFrame(()=>requestAnimationFrame(r)));await Promise.all(e.getAnimations().map(a=>a.finished.catch(()=>{})))})
 await page.screenshot({path:'artifacts/previews/production-facility-info.png'})
 await info.getByRole('button',{name:'Close',exact:true}).click();await info.waitFor({state:'hidden'})
 await page.getByRole('button',{name:'물방울 유리 증류기 · 가동 대기',exact:true}).click()
 await page.getByText('정제용 빙어',{exact:true}).waitFor()
 const material=page.getByRole('dialog')
 if(await material.getByText('생산량',{exact:true}).count()||await material.getByText('보관 시간',{exact:true}).count())throw Error('Information still duplicated in material dialog')
 await material.evaluate(async e=>{await new Promise(r=>requestAnimationFrame(()=>requestAnimationFrame(r)));await Promise.all(e.getAnimations().map(a=>a.finished.catch(()=>{})))})
 await page.screenshot({path:'artifacts/previews/production-materials-minimal.png'})
 await material.getByRole('button',{name:'Close',exact:true}).click();await material.waitFor({state:'hidden'})
 for(const width of [320,390,1280]){
  await page.setViewportSize({width,height:1000})
  await page.evaluate(()=>new Promise(r=>requestAnimationFrame(()=>requestAnimationFrame(r))))
  if(await page.evaluate(()=>document.documentElement.scrollWidth>innerWidth))throw Error('Horizontal overflow '+width)
  const bar=await progress.boundingBox(),image=await overlay.boundingBox()
  if(bar.x<image.x||bar.x+bar.width>image.x+image.width||bar.y+bar.height>image.y+image.height)throw Error('Progress overflows image')
 }
 if(errors.length)throw Error(errors.join('\n'))
 console.log('PASS: material counts by kind, facility info without mutations, minimal material dialog, progress/overlay/copy, 320/390/1280px. Mocked RPC.')
}finally{await browser.close()}
