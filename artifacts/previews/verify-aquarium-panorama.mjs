import { chromium } from 'file:///C:/Users/user/Desktop/holoseogi-counsel/node_modules/playwright-core/index.mjs'
import {panCamera} from './pan-camera.mjs'
const browser = await chromium.launch({headless:true,executablePath:'C:/Users/user/AppData/Local/ms-playwright/chromium-1243/chrome-win64/chrome.exe'})
const url='http://127.0.0.1:5186/aquarium-lab'
try {
 for(const width of [320,390,1000]){
  const page=await browser.newPage({viewport:{width,height:844},deviceScaleFactor:2,hasTouch:true})
  const errors=[],remote=[]
  page.on('pageerror',error=>errors.push(error.message))
  await page.route('**/*.supabase.co/**',route=>{remote.push(route.request().url());return route.abort()})
  await page.goto(url)
  const move=value=>panCamera(page,value)
  const glass=page.getByTestId('panorama-glass')
  await page.waitForFunction(()=>document.querySelector('[data-testid="panorama-glass"]')?.dataset.ready==='true')
  if(await page.evaluate(()=>document.documentElement.scrollWidth>innerWidth))throw Error('Page overflow '+width)
  const initial=await glass.evaluate(element=>({view:+element.dataset.view,width:+element.dataset.viewportWidth,world:+element.dataset.worldWidth,clock:+element.dataset.clock}))
  if(initial.view!==1||initial.world!==initial.width*3)throw Error('Wrong initial world '+JSON.stringify(initial))
  await page.screenshot({path:`artifacts/previews/aquarium-panorama-${width}-center.png`})
  const before=await page.locator('[data-fish-id]').evaluateAll(items=>items.map(item=>({id:item.dataset.fishId,x:+item.dataset.worldX})))
  await move(0)
  await page.waitForFunction(()=>+document.querySelector('[data-testid="panorama-glass"]').dataset.view<.001)
  await page.screenshot({path:`artifacts/previews/aquarium-panorama-${width}-left.png`})
  await move(2)
  await page.waitForFunction(()=>+document.querySelector('[data-testid="panorama-glass"]').dataset.view>1.999)
  await page.screenshot({path:`artifacts/previews/aquarium-panorama-${width}-right.png`})
  const bounds=await glass.boundingBox(),background=await page.getByTestId('panorama-background').boundingBox()
  if(Math.abs(background.width-bounds.width*3)>1||Math.abs(background.x-(bounds.x-bounds.width*2))>1)throw Error('Background and camera do not match')
  const canvas=await glass.locator('canvas').evaluate(canvas=>({width:canvas.width,cssWidth:canvas.getBoundingClientRect().width}))
  if(canvas.width>Math.ceil(bounds.width*1.5)+1||Math.abs(canvas.cssWidth-bounds.width)>1)throw Error('Canvas grew with world size')
  await move(1)
  await page.waitForFunction(()=>Math.abs(+document.querySelector('[data-testid="panorama-glass"]').dataset.view-1.05)<.001)
  const cdp=await page.context().newCDPSession(page)
  const y=bounds.y+bounds.height*.10
  await cdp.send('Input.dispatchTouchEvent',{type:'touchStart',touchPoints:[{x:bounds.x+bounds.width*.15,y}]})
  for(let step=1;step<=12;step++){
   await cdp.send('Input.dispatchTouchEvent',{type:'touchMove',touchPoints:[{x:bounds.x+bounds.width*(.15+.7*step/12),y}]})
   await page.waitForTimeout(25)
  }
  await cdp.send('Input.dispatchTouchEvent',{type:'touchEnd',touchPoints:[]})
  await page.waitForFunction(()=>{const view=+document.querySelector('[data-testid="panorama-glass"]').dataset.view;return view>.4&&view<.6})
  const after=await page.locator('[data-fish-id]').evaluateAll(items=>items.map(item=>({id:item.dataset.fishId,x:+item.dataset.worldX})))
  if(after.length!==24||after.some((item,i)=>item.id!==before[i].id)||after.every((item,i)=>Math.abs(item.x-before[i].x)<1))throw Error('Fish stopped or were recreated')
  if(width===390){
   const positions=new Map(after.map(item=>[item.id,item.x])),crossings=[]
   for(let tick=0;tick<16;tick++){
    await page.waitForTimeout(500)
    const now=await page.locator('[data-fish-id]').evaluateAll(items=>items.map(item=>({id:item.dataset.fishId,x:+item.dataset.worldX})))
    for(const item of now){const prior=positions.get(item.id);for(const boundary of [initial.width,initial.width*2])if((prior<boundary&&item.x>=boundary)||(prior>boundary&&item.x<=boundary))crossings.push({id:item.id,boundary});positions.set(item.id,item.x)}
   }
   if(!crossings.length)throw Error('No live pane crossing observed')
   console.log({liveCrossings:crossings})
   await page.getByRole('button',{name:'잠깐 멈추기'}).click()
   const paused=await glass.getAttribute('data-clock');await page.waitForTimeout(400)
   if(await glass.getAttribute('data-clock')!==paused)throw Error('Pause failed')
   await move(2)
   await page.waitForFunction(()=>+document.querySelector('[data-testid="panorama-glass"]').dataset.view>1.999,undefined,{timeout:5000}).catch(async error=>{console.log(await glass.evaluate(el=>({...el.dataset,hidden:document.hidden,range:document.querySelector('input[type="range"]').value})));throw error})
   if(await glass.getAttribute('data-clock')===null)throw Error('Missing paused world')
   await page.getByRole('button',{name:'다시 헤엄치기'}).click()
  }
  if(errors.length||remote.length)throw Error(JSON.stringify({errors,remote}))
  console.log({width,world:initial.world,fish:after.length,swipe:true,bufferWidth:canvas.width,remoteRequests:remote.length})
  await page.close()
 }
 const reduced=await browser.newPage({viewport:{width:390,height:844},reducedMotion:'reduce'})
 await reduced.goto(url)
 await reduced.waitForFunction(()=>document.querySelector('[data-testid="panorama-glass"]')?.dataset.ready==='true')
 if(+(await reduced.getByTestId('panorama-glass').getAttribute('data-clock'))!==0)throw Error('Reduced motion advanced simulation')
 await panCamera(reduced,2)
 await reduced.waitForFunction(()=>+document.querySelector('[data-testid="panorama-glass"]').dataset.view===2)
 await reduced.close()
 console.log({reducedMotion:true})
}finally{await browser.close()}
