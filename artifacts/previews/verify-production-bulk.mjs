import {chromium} from 'file:///C:/Users/user/Desktop/holoseogi-counsel/node_modules/playwright-core/index.mjs'
import {readFileSync} from 'node:fs'
const browser=await chromium.launch({headless:true,executablePath:'C:/Users/user/AppData/Local/ms-playwright/chromium-1243/chrome-win64/chrome.exe'})
try{
 const page=await browser.newPage({viewport:{width:390,height:844}}),errors=[],actions=[]
 page.on('pageerror',e=>errors.push(e.message))
 const catalog=JSON.parse(readFileSync('supabase/catalog/catalog.json','utf8')),now=Date.now(),date=delta=>new Date(now+delta).toISOString()
 const ids=['tin-grandpa-hearth','shell-coal-mini-kiln','scrap-engine','deep-pressure-aging-vat']
 const state={serverNow:date(0),gold:1234,fuel:3,facilities:catalog.production_facilities.map(f=>({...f,owned:ids.includes(f.id),startedAt:null,completesAt:null,expiresAt:null,runOutput:null}))}
 for(const [i,id] of ids.entries())if(i>1){const f=state.facilities.find(f=>f.id===id);Object.assign(f,{startedAt:date(-3600000),completesAt:date(-600000),expiresAt:date(i===2?3600000:-1),runOutput:f.output_count})}
 let stock=[{id:'wood',name:'연습용 폐목재',sell_price:2,available:8,rarity:'common',thumbnail_path:''}]
 await page.route('**/rest/v1/rpc/production_*',async route=>{
  const name=new URL(route.request().url()).pathname.split('/').at(-1),args=route.request().postDataJSON()
  if(name==='production_materials'){await route.fulfill({json:stock});return}
  if(name==='production_bulk_action'){
   actions.push(args)
   for(const step of args.p_steps){const f=state.facilities.find(f=>f.id===step.facility);if(args.p_action==='start')Object.assign(f,{startedAt:date(0),completesAt:date(3600000),expiresAt:date(7200000),runOutput:f.output_count});else{if(args.p_action==='claim')state.fuel+=f.runOutput;Object.assign(f,{startedAt:null,completesAt:null,expiresAt:null,runOutput:null})}}
  }
  await route.fulfill({json:state})
 })
 await page.goto('http://127.0.0.1:5175/artifacts/previews/production.html')
 await page.getByRole('tablist',{name:'생산소 상태'}).waitFor()
 if(await page.getByRole('button',{name:'임시 테스트 · 재화 소모 없이 체험'}).count())throw Error('Temporary test entry remains')
 await page.setViewportSize({width:390,height:600})
 const fixedTabs=page.getByRole('tablist',{name:'생산소 상태'}),before=await fixedTabs.boundingBox()
 const scrolled=await page.locator('#production-panel').evaluate(e=>{e.scrollTop=250;return e.scrollTop})
 const after=await fixedTabs.boundingBox()
 if(!scrolled||Math.abs(before.y-after.y)>1)throw Error('Status filters moved while scrolling')
 await page.screenshot({path:'artifacts/previews/production-fixed-tabs.png'})
 await page.setViewportSize({width:390,height:844})
 await page.locator('#production-panel').evaluate(e=>e.scrollTop=0)
 await page.getByRole('tab',{name:'만료 1',exact:true}).click()
 if(await page.getByRole('article').count()!==1||!await page.getByRole('button',{name:'일괄 가동 0',exact:true}).isDisabled())throw Error('Status filtering or bulk scope incorrect')
 await page.waitForFunction(()=>[...document.querySelectorAll('article img')].every(i=>i.complete&&i.naturalWidth>0&&getComputedStyle(i).opacity==='1'))
 await page.screenshot({path:'artifacts/previews/production-status-expired-tab.png'})
 await page.getByRole('tab',{name:'가동 중 0',exact:true}).click()
 if(await page.getByRole('article').count())throw Error('Ready facility included in working filter')
 await page.getByRole('tab',{name:'수령 대기 1',exact:true}).click()
 if(await page.locator('article[data-production-status="ready"]').count()!==1)throw Error('Ready facility missing from ready filter')
 await page.getByRole('tab',{name:'전체 4',exact:true}).click()
 await page.getByRole('button',{name:'일괄 가동 2',exact:true}).click()
 await page.getByRole('alert').filter({hasText:'재료가 부족해요'}).waitFor()
 if(actions.length)throw Error('Insufficient materials mutated production')
 stock=[{...stock[0],available:4},{id:'mythic',name:'테스트 신화 재료',sell_price:100,available:5,rarity:'mythic',thumbnail_path:''}]
 await page.getByRole('button',{name:'일괄 가동 2',exact:true}).click()
 const dialog=page.getByRole('dialog'),confirm=dialog.getByRole('button',{name:'일괄 가동',exact:true})
 await dialog.getByText('특급·신화 재료가 포함돼요').waitFor()
 if(!await confirm.isDisabled())throw Error('Valuable guard not enforced')
 await dialog.evaluate(async e=>{await Promise.all(e.getAnimations().map(a=>a.finished))})
 await page.screenshot({path:'artifacts/previews/production-bulk-valuable.png'})
 await dialog.getByRole('checkbox').check();await confirm.click()
 await dialog.waitFor({state:'hidden'})
 if(actions.length!==1||!actions[0].p_allow_valuable||actions[0].p_steps[0].facility!=='shell-coal-mini-kiln')throw Error('Incorrect reviewed bulk start')
 if(await page.locator('[data-production-working-overlay]').count()!==2)throw Error('Working overlays missing')
 if(await page.getByText('현재 목록 · 저렴한 재료부터 사용',{exact:true}).count())throw Error('Removed bulk hint remains')
 await page.getByRole('button',{name:'일괄 수령 1',exact:true}).click()
 await page.getByRole('dialog').getByRole('button',{name:'일괄 수령',exact:true}).click()
 await dialog.waitFor({state:'hidden'})
 await page.getByRole('button',{name:'일괄 폐기 1',exact:true}).click()
 await dialog.evaluate(async e=>{await Promise.all(e.getAnimations().map(a=>a.finished))})
 await page.screenshot({path:'artifacts/previews/production-bulk-discard.png'})
 await dialog.getByRole('button',{name:'취소',exact:true}).click();await dialog.waitFor({state:'hidden'})
 if(actions.length!==2)throw Error('Cancelled discard mutated production')
 await page.getByRole('button',{name:'일괄 폐기 1',exact:true}).click();await dialog.getByRole('button',{name:'일괄 폐기',exact:true}).click();await dialog.waitFor({state:'hidden'})
 if(state.fuel!==8||actions.length!==3)throw Error('Unexpected fuel/actions')
 await page.screenshot({path:'artifacts/previews/production-bulk-toolbar.png'})
 for(const width of [320,390,1280]){await page.setViewportSize({width,height:844});if(await page.evaluate(()=>document.documentElement.scrollWidth>innerWidth))throw Error('Horizontal overflow')}
 if(errors.length)throw Error(errors.join('\n'))
 console.log('PASS: bulk shortage, cheapest allocation, valuable acknowledgement, claim, discard cancellation, mobile widths; mocked RPC')
}finally{await browser.close()}
