import fs from 'node:fs'
import path from 'node:path'
import {createServer} from 'node:http'
import {pathToFileURL} from 'node:url'
import {createHash} from 'node:crypto'
import {batch,items} from './prepare-hologram-assets.mjs'
const driver=process.argv[2]??'C:/Users/user/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright-core/index.js'
const driverModule=await import(pathToFileURL(path.resolve(driver)).href)
const {chromium}=driverModule.default??driverModule
const root=path.resolve('.'),output='artifacts/hologram/browser';fs.mkdirSync(output,{recursive:true})
const expectedFish=[items.filter(i=>i.frames&&i.rarity==='mythic').length,items.filter(i=>i.frames&&i.rarity!=='mythic').length]
const allowed=[path.resolve('artifacts/hologram'),path.resolve(batch),path.resolve('public')]
const server=createServer((req,res)=>{
 try{
  const p=decodeURIComponent(new URL(req.url,'http://localhost').pathname)
  if(p.includes('..')||p.includes('\\'))throw Error('Unsafe path')
  const file=path.resolve(p.startsWith('/aquarium/')||p.startsWith('/fishing/')||p.startsWith('/regions/')||p.startsWith('/region-icons/')?'public'+p:'.'+p)
  if(!allowed.some(dir=>file.startsWith(dir+path.sep))||!fs.existsSync(file)||!fs.statSync(file).isFile())throw Error('Not found')
  res.setHeader('Content-Type',file.endsWith('.js')?'application/javascript':file.endsWith('.html')?'text/html; charset=utf-8':file.endsWith('.json')?'application/json':'image/png');res.end(fs.readFileSync(file))
 }catch{res.writeHead(404);res.end()}
})
await new Promise(resolve=>server.listen(0,'127.0.0.1',resolve))
const port=server.address().port,browser=await chromium.launch({headless:true,executablePath:'C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe'})
const evidence=[]
try{
 for(const width of [1200,390]){
  const context=await browser.newContext({viewport:{width,height:1000},deviceScaleFactor:width===390?2:1,reducedMotion:'no-preference'})
  const errors=[],blocked=[],failed=[]
  await context.route('**/*',async route=>{
   const url=new URL(route.request().url())
   if(url.hostname==='127.0.0.1')return route.continue()
   const marker='/collectibles/',index=url.pathname.indexOf(marker)
   if(index>=0){const relative=decodeURIComponent(url.pathname.slice(index+marker.length)),file=path.resolve(batch,relative)
    if(file.startsWith(path.resolve(batch)+path.sep)&&fs.existsSync(file))return route.fulfill({contentType:'image/png',body:fs.readFileSync(file)})
   }
   blocked.push(url.origin+url.pathname);await route.abort()
  })
  const page=await context.newPage();page.on('pageerror',error=>errors.push(error.message));page.on('response',response=>{if(response.status()>=400)failed.push({status:response.status(),url:response.url()})})
  await page.goto(`http://127.0.0.1:${port}/artifacts/hologram/integration.html`)
  await page.waitForFunction(expected=>window.reviewState&&window.frames[0]?.inhabitants.length===expected[0]&&window.frames[1]?.inhabitants.length===expected[1]&&window.reviewState().busy===0,expectedFish,{timeout:20000})
  const first=await page.evaluate(()=>window.reviewState())
  await page.waitForTimeout(6500)
  const second=await page.evaluate(()=>window.reviewState())
  const fixed0=first.frames[1].inhabitants.find(i=>i.id==='hologram-prism'),fixed1=second.frames[1].inhabitants.find(i=>i.id==='hologram-prism')
  if(!fixed0||!fixed1||Math.abs(fixed0.x-fixed1.x)>.01||Math.abs(fixed0.y-fixed1.y)>.01)throw Error('Rooted anemone moved')
  const sweeper=second.frames[1].inhabitants.find(i=>i.id==='hologram-sweeper')
  if(!sweeper||sweeper.y+sweeper.size<second.frames[1].height*.9||sweeper.y+sweeper.size>second.frames[1].height+.5)throw Error('Sea-cucumber crawler position: '+JSON.stringify({sweeper,height:second.frames[1].height}))
  if(first.previews!==5||second.width>width||errors.length||first.errors.length||second.errors.length)throw Error(JSON.stringify({width,errors,first,second}))
  for(let index=0;index<5;index++){
   await page.locator('#previews canvas[role="img"]').nth(index).scrollIntoViewIfNeeded()
   await page.waitForFunction(n=>{const canvas=document.querySelectorAll('#previews canvas[role="img"]')[n],pixels=canvas.getContext('2d').getImageData(0,0,canvas.width,canvas.height).data;let painted=0;for(let i=3;i<pixels.length;i+=4)if(pixels[i]>32)painted++;return painted>100},index,{timeout:10000})
  }
  await page.locator('#scenes').scrollIntoViewIfNeeded()
  await page.waitForFunction(()=>[...document.querySelectorAll('#scenes image')].every(i=>i.getAttribute('opacity')==='1'),undefined,{timeout:10000})
  await page.locator('#scenes').screenshot({path:`${output}/fishing-${width}.png`})
  await page.screenshot({path:`${output}/integration-${width}.png`,fullPage:true})
  await page.goto(`http://127.0.0.1:${port}/artifacts/hologram/index.html`)
  await page.getByRole('button',{name:'장식물',exact:true}).click();await page.getByRole('button',{name:'희귀',exact:true}).click()
  if(await page.locator('.card').count()!==15)throw Error('Gallery rarity filtering failed')
  await page.waitForTimeout(400);await page.screenshot({path:`${output}/gallery-${width}.png`,fullPage:true})
  if(await page.evaluate(()=>document.documentElement.scrollWidth)>width||errors.length||blocked.length||failed.length)throw Error(JSON.stringify({width,errors,blocked,failed}))
  evidence.push({width,dpr:width===390?2:1,fish:first.frames.map(f=>f.inhabitants.length),mythicPreviews:first.previews,paintedPreviews:5,fishingViews:['front','top'],stationaryAnemone:true,overflow:false,errors,blocked,failed,scope:'Local generated assets through actual aquarium, collection and fishing renderer; not production or physical phone FPS.'})
  await context.close()
 }
 fs.writeFileSync(`${output}/verification.json`,JSON.stringify({success:true,checkedAt:new Date().toISOString(),projectRoot:root,specificationSha256:createHash('sha256').update(fs.readFileSync(`${batch}/specification.json`)).digest('hex'),evidence},null,2)+'\n')
 console.log(JSON.stringify({success:true,evidence}))
}finally{await browser.close();await new Promise(resolve=>server.close(resolve))}
