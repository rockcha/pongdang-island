import {chromium} from 'file:///C:/Users/user/Desktop/holoseogi-counsel/node_modules/playwright-core/index.mjs'
import {readFileSync} from 'node:fs'
import {randomUUID} from 'node:crypto'
const browser=await chromium.launch({headless:true,executablePath:'C:/Users/user/AppData/Local/ms-playwright/chromium-1243/chrome-win64/chrome.exe'})
try{
 const page=await browser.newPage({viewport:{width:390,height:844}}),errors=[],calls=[]
 page.on('pageerror',e=>errors.push(e.message));await page.emulateMedia({reducedMotion:'reduce'})
 const catalog=JSON.parse(readFileSync('supabase/catalog/catalog.json','utf8')),now=Date.now(),date=m=>new Date(now+m*60000).toISOString()
 const state={serverNow:date(0),gold:10000,fuel:3,facilities:catalog.production_facilities.map(f=>({...f,owned:false,ownedCount:0,startedAt:null,completesAt:null,expiresAt:null,runOutput:null})),sites:[]}
 function buy(id,q){const f=state.facilities.find(f=>f.id===id);f.owned=true;f.ownedCount+=q;state.gold-=f.price*q;for(let i=0;i<q;i++)state.sites.push({...f,siteId:randomUUID()})}
 buy('dock-grandma-refining-pot',1)
 Object.assign(state.sites[0],{startedAt:date(-15),completesAt:date(15),expiresAt:date(35),runOutput:1})
 await page.route('**/rest/v1/rpc/production_*',async route=>{
  const name=new URL(route.request().url()).pathname.split('/').at(-1),args=route.request().postDataJSON()
  if(name==='production_materials')return route.fulfill({json:[{id:'smelt',name:'정제용 빙어',rarity:'common',sell_price:15,available:6,thumbnail_path:''}]})
  if(name==='production_purchase'){calls.push({name,args});buy(args.p_facility,args.p_quantity)}
  if(name==='production_action'){calls.push({name,args});if(args.p_action==='buy')buy(args.p_facility,1);else{const s=state.sites.find(f=>f.siteId===args.p_facility);if(!s)throw Error('Action used catalog ID instead of site ID');Object.assign(s,{startedAt:date(0),completesAt:date(s.production_minutes),expiresAt:date(s.production_minutes+s.storage_minutes),runOutput:s.output_count})}}
  if(name==='production_bulk_action'){calls.push({name,args});for(const step of args.p_steps){const s=state.sites.find(f=>f.siteId===step.facility);if(!s)throw Error('Bulk used catalog ID');Object.assign(s,{startedAt:date(0),completesAt:date(s.production_minutes),expiresAt:date(s.production_minutes+s.storage_minutes),runOutput:s.output_count})}}
  await route.fulfill({json:state})
 })
 await page.goto('http://127.0.0.1:5175/artifacts/previews/production.html?shop')
 await page.getByRole('button',{name:'조개탄 미니가마 · 구매',exact:true}).waitFor()
 await page.getByRole('tab',{name:'어유 정제',exact:true}).click()
 await page.getByLabel('생산소 이름 검색',{exact:true}).fill('소라')
 if(await page.getByRole('article').count()!==1)throw Error('Name search incorrect')
 await page.getByLabel('생산소 이름 검색',{exact:true}).fill('')
 for(const [key,first] of [['output_count','검은 조류 심층 정유탑'],['input_count','부두 할머니의 정제솥'],['production_minutes','부두 할머니의 정제솥'],['storage_minutes','등대지기 축열 증류소'],['price','물방울 유리 증류기']]){
  await page.getByLabel('생산소 정렬',{exact:true}).selectOption(key)
  if(await page.getByRole('article').first().getAttribute('aria-label')!==first)throw Error('Sort incorrect: '+key)
 }
 if(await page.getByRole('combobox').count()!==1||await page.getByRole('button',{name:'필터',exact:true}).count())throw Error('Extra filter controls remain')
 await page.waitForFunction(()=>[...document.querySelectorAll('article img[src^="/production/"]')].filter(i=>{const r=i.getBoundingClientRect();return r.top<innerHeight&&r.bottom>0}).every(i=>i.complete&&i.naturalWidth>0&&getComputedStyle(i).opacity==='1'))
 await page.screenshot({path:'artifacts/previews/production-shop-filtered.png'})
 await page.getByLabel('생산소 이름 검색',{exact:true}).fill('수달')
 await page.getByRole('button',{name:'수달 아저씨의 손잡이 착유기 · 구매',exact:true}).click()
 await page.getByLabel('구매 수량',{exact:true}).fill('3')
 await page.getByRole('dialog').evaluate(async e=>{await new Promise(r=>requestAnimationFrame(()=>requestAnimationFrame(r)));await Promise.all(e.getAnimations().map(a=>a.finished.catch(()=>{})))})
 await page.screenshot({path:'artifacts/previews/production-purchase-quantity.png'})
 await page.getByRole('button',{name:'1,500골드로 구매하기',exact:true}).click()
 await page.getByRole('article',{name:'수달 아저씨의 손잡이 착유기',exact:true}).getByText('보유 3곳',{exact:true}).waitFor()
 if(calls[0]?.name!=='production_purchase'||calls[0].args.p_quantity!==3)throw Error('Quantity purchase RPC incorrect')
 await page.getByRole('button',{name:'수달 아저씨의 손잡이 착유기 · 구매',exact:true}).click()
 await page.getByRole('button',{name:'500골드로 구매하기',exact:true}).click()
 await page.getByRole('article',{name:'수달 아저씨의 손잡이 착유기',exact:true}).getByText('보유 4곳',{exact:true}).waitFor()
 await page.goto('http://127.0.0.1:5175/artifacts/previews/production.html')
 await page.getByRole('tab',{name:'어유 정제',exact:true}).click()
 await page.getByRole('tab',{name:'전체 5',exact:true}).waitFor()
 if(await page.getByRole('article',{name:'수달 아저씨의 손잡이 착유기',exact:true}).count()!==4)throw Error('Owned instances collapsed')
 await page.getByRole('button',{name:'수달 아저씨의 손잡이 착유기 · 가동 대기',exact:true}).first().click()
 await page.getByText('정제용 빙어',{exact:true}).waitFor()
 await page.getByRole('button',{name:'자동 넣기',exact:true}).click()
 await page.getByRole('button',{name:'재료 넣고 가동하기',exact:true}).click()
 await page.getByRole('dialog').waitFor({state:'hidden'})
 if(calls.at(-1).args.p_facility==='otter-hand-press')throw Error('Selected a catalog kind instead of an owned instance')
 await page.getByRole('button',{name:'일괄 가동 3',exact:true}).click()
 await page.getByRole('dialog').getByRole('button',{name:'일괄 가동',exact:true}).click()
 await page.getByRole('dialog').waitFor({state:'hidden'})
 if(new Set(calls.at(-1).args.p_steps.map(s=>s.facility)).size!==3)throw Error('Bulk lost duplicate kinds')
 await page.getByRole('tab',{name:'가동 중 5',exact:true}).waitFor()
 await page.screenshot({path:'artifacts/previews/production-duplicate-owned.png'})
 for(const width of [320,390,1280]){
  await page.setViewportSize({width,height:844})
  await page.goto('http://127.0.0.1:5175/artifacts/previews/production.html?shop')
  await page.getByRole('tab',{name:'어유 정제',exact:true}).click()
  if(await page.evaluate(()=>document.documentElement.scrollWidth>innerWidth))throw Error('Horizontal overflow '+width)
 }
 if(errors.length)throw Error(errors.join('\n'))
 console.log('PASS: name search, five fixed sorts, single select, quantity/repeat purchases, duplicate instances, individual and bulk IDs, 320/390/1280px. Mocked RPC.')
}finally{await browser.close()}
