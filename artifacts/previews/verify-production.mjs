import {chromium} from 'file:///C:/Users/user/Desktop/holoseogi-counsel/node_modules/playwright-core/index.mjs'
import {readFileSync} from 'node:fs'
const catalog=JSON.parse(readFileSync('supabase/catalog/catalog.json','utf8'))
const browser=await chromium.launch({headless:true,executablePath:'C:/Users/user/AppData/Local/ms-playwright/chromium-1243/chrome-win64/chrome.exe'})
try{
 const page=await browser.newPage({viewport:{width:390,height:844},deviceScaleFactor:1}),errors=[],calls=[]
 page.on('pageerror',e=>errors.push(e.message))
 const now=Date.now(),date=minutes=>new Date(now+minutes*60000).toISOString()
 let state={serverNow:date(0),gold:10000,fuel:3,facilities:catalog.production_facilities.map(f=>({...f,owned:false,startedAt:null,completesAt:null,expiresAt:null,runOutput:null}))}
 const ids=['tin-grandpa-hearth','shell-compression-workshop','scrap-engine','deep-pressure-aging-vat']
 for(const [i,id] of ids.entries()){const f=state.facilities.find(f=>f.id===id);f.owned=true;if(i){f.startedAt=date(i===1?-45:i===2?-420:-960);f.completesAt=date(i===1?45:i===2?-30:-240);f.expiresAt=date(i===1?165:i===2?870:-60);f.runOutput=f.output_count}}
 await page.route('**/rest/v1/rpc/production_*',async route=>{
  const name=new URL(route.request().url()).pathname.split('/').at(-1),args=route.request().postDataJSON()
  if(name==='production_materials'){await route.fulfill({json:[{id:'wood',name:'떠밀려온 폐목재',thumbnail_path:'trash/normal/shared-drift-scrap-wood_v1_thumbnail.png',sell_price:2,rarity:'common',available:12}]});return}
  if(name==='production_action'){calls.push(args);const f=state.facilities.find(f=>f.id===args.p_facility);if(args.p_action==='buy'){f.owned=true;state.gold-=f.price}else if(args.p_action==='start'){f.startedAt=date(0);f.completesAt=date(f.production_minutes);f.expiresAt=date(f.production_minutes+f.storage_minutes);f.runOutput=f.output_count}else{if(args.p_action==='claim')state.fuel+=f.runOutput;f.startedAt=f.completesAt=f.expiresAt=f.runOutput=null}}
  await route.fulfill({json:state})
 })
 await page.goto('http://127.0.0.1:5175/artifacts/previews/production.html')
 await page.waitForSelector('article')
 await page.waitForFunction(()=>[...document.querySelectorAll('article img[src^="/production/"]')].every(i=>i.complete&&i.naturalWidth>0))
 await page.waitForFunction(()=>[...document.querySelectorAll('article img[src^="/production/"]')].every(i=>getComputedStyle(i).opacity==='1'))
 await page.screenshot({path:'artifacts/previews/production-mobile.png'})
 await page.getByRole('button',{name:'깡통 할아범의 화덕 · 가동 대기'}).click()
 await page.getByRole('button',{name:'자동 넣기'}).click()
 await page.screenshot({path:'artifacts/previews/production-materials.png'})
 await page.getByRole('button',{name:'재료 넣고 가동하기'}).click()
 await page.getByRole('dialog').waitFor({state:'hidden'})
 if(calls[0]?.p_materials?.wood!==4)throw Error('Incorrect selected materials')
 await page.getByRole('button',{name:'고철기관 · 수령 대기'}).click()
 await page.getByRole('button',{name:'고철기관 · 가동 대기'}).waitFor()
 await page.getByRole('button',{name:'심해압 숙성통 · 만료'}).click()
 await page.getByRole('button',{name:'심해압 숙성통 · 가동 대기'}).waitFor()
 await page.goto('http://127.0.0.1:5175/artifacts/previews/production.html?shop')
 await page.getByRole('button',{name:'조개탄 미니가마 · 구매'}).waitFor()
 await page.waitForFunction(()=>[...document.querySelectorAll('article img[src^="/production/"]')].filter(i=>i.getBoundingClientRect().top<innerHeight).every(i=>i.complete&&i.naturalWidth>0&&getComputedStyle(i).opacity==='1'))
 await page.screenshot({path:'artifacts/previews/production-shop.png'})
 await page.getByRole('button',{name:'조개탄 미니가마 · 구매'}).click()
 await page.getByRole('dialog').evaluate(async e=>{await Promise.all(e.getAnimations().map(a=>a.finished))})
 await page.screenshot({path:'artifacts/previews/production-purchase.png'})
 await page.getByRole('button',{name:'350골드로 구매하기'}).click()
 await page.getByRole('article',{name:'조개탄 미니가마',exact:true}).getByText('보유 1곳',{exact:true}).waitFor()
 for(const width of [320,390,1280]){await page.setViewportSize({width,height:900});if(await page.evaluate(()=>document.documentElement.scrollWidth>innerWidth))throw Error('Horizontal overflow at '+width)}
 await page.screenshot({path:'artifacts/previews/production-desktop.png'})
 await page.getByRole('tab',{name:'어유 정제'}).click()
 if(await page.getByRole('article').count()!==18)throw Error('Expected 18 fish refineries')
 await page.evaluate(async()=>{await Promise.all(['idle','working','ready','expired'].map(async status=>{
  const img=new Image();img.src=`/production/status/${status}-v1.png`;await img.decode()
  if(img.width!==768||img.height!==96)throw Error('Invalid sprite geometry: '+status)
  const canvas=document.createElement('canvas');canvas.width=768;canvas.height=96;const ctx=canvas.getContext('2d');ctx.drawImage(img,0,0)
  const pixels=ctx.getImageData(0,0,768,96).data
  for(let frame=0;frame<8;frame++)for(let y=0;y<96;y++)for(let x=0;x<96;x++)if((x<3||x>92||y<3||y>92)&&pixels[(y*768+frame*96+x)*4+3]>16)throw Error('Sprite edge clipping: '+status+' '+frame)
 }))})
 await page.goto('http://127.0.0.1:5175/artifacts/previews/production.html')
 await page.waitForSelector('[data-production-sprite]')
 await page.emulateMedia({reducedMotion:'reduce'})
 if(!await page.locator('[data-production-sprite]').evaluateAll(items=>items.every(i=>getComputedStyle(i).animationName==='none')))throw Error('Reduced motion not respected')
 if(errors.length)throw Error(errors.join('\n'))
 console.log('PASS: production lifecycle, sprite padding, reduced motion, 320/390/1280px layouts; mocked RPC, no real player mutations')
}finally{await browser.close()}
